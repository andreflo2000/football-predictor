import os
import glob
import pickle
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

warnings.filterwarnings("ignore")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(BASE_DIR, "data", "csv", "club")
MODEL_PATH  = os.path.join(BASE_DIR, "model_no_odds.pkl")
XG_PATH     = os.path.join(BASE_DIR, "data", "csv", "fbref_xg.csv")
MIN_MATCHES = 6
WINDOWS     = [3, 5, 10]
ELO_K       = 32
ELO_HOME    = 50


# ─────────────────────────────────────────────────────────
# 1. INCARCARE DATE
# ─────────────────────────────────────────────────────────
def load_data():
    print(">>> Incarc CSV-uri...")
    files = glob.glob(os.path.join(DATA_DIR, "**", "*.csv"), recursive=True)
    print(f"    Gasit {len(files)} fisiere.")
    dfs = []
    for f in files:
        for sep in ["\t", ",", ";"]:
            try:
                df = pd.read_csv(f, sep=sep, encoding="utf-8-sig",
                                 on_bad_lines="skip", low_memory=False)
                if len(df.columns) >= 6:
                    dfs.append(df)
                    break
            except Exception:
                continue
    data = pd.concat(dfs, ignore_index=True)
    print(f"    Total randuri brute: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 1b. INCARCARE xG REAL (Understat)
# ─────────────────────────────────────────────────────────
def load_xg_data():
    if not os.path.exists(XG_PATH):
        print("    xG file lipsa — se foloseste proxy din goluri")
        return {}

    NAME_MAP = {
        "manchester city":         "man city",
        "manchester united":       "man united",
        "newcastle united":        "newcastle",
        "queens park rangers":     "qpr",
        "west bromwich albion":    "west brom",
        "wolverhampton wanderers": "wolves",
        "sheffield united":        "sheffield utd",
        "nottingham forest":       "nott'm forest",
        "tottenham":               "tottenham",
        "atletico madrid":         "ath madrid",
        "athletic club":           "ath bilbao",
        "real betis":              "betis",
        "real sociedad":           "sociedad",
        "deportivo alavés":        "alaves",
        "deportivo la coruna":     "deportivo",
        "rcd espanyol":            "espanol",
        "rcd mallorca":            "mallorca",
        "celta vigo":              "celta",
        "leganés":                 "leganes",
        "getafe":                  "getafe",
        "sd huesca":               "huesca",
        "elche":                   "elche",
        "granada":                 "granada",
        "cadiz":                   "cadiz",
        "girona":                  "girona",
        "almeria":                 "almeria",
        "las palmas":              "las palmas",
        "inter":                   "inter",
        "ac milan":                "milan",
        "hellas verona":           "verona",
        "spal":                    "spal",
        "chievo":                  "chievo",
        "us sassuolo":             "sassuolo",
        "frosinone":               "frosinone",
        "lecce":                   "lecce",
        "us lecce":                "lecce",
        "brescia":                 "brescia",
        "crotone":                 "crotone",
        "benevento":               "benevento",
        "venezia":                 "venezia",
        "salernitana":             "salernitana",
        "us cremonese":            "cremonese",
        "frosinone calcio":        "frosinone",
        "fc augsburg":             "augsburg",
        "bayer leverkusen":        "leverkusen",
        "borussia dortmund":       "dortmund",
        "borussia mönchengladbach":"m'gladbach",
        "eintracht frankfurt":     "ein frankfurt",
        "fc köln":                 "fc koln",
        "hamburger sv":            "hamburger sv",
        "hannover 96":             "hannover",
        "hertha bsc":              "hertha",
        "hoffenheim":              "hoffenheim",
        "mainz 05":                "mainz",
        "rb leipzig":              "rb leipzig",
        "sc freiburg":             "freiburg",
        "schalke 04":              "schalke 04",
        "vfb stuttgart":           "stuttgart",
        "vfl wolfsburg":           "wolfsburg",
        "werder bremen":           "werder bremen",
        "1. fsv mainz 05":         "mainz",
        "tsg 1899 hoffenheim":     "hoffenheim",
        "fortuna düsseldorf":      "dusseldorf",
        "paderborn 07":            "paderborn",
        "arminia bielefeld":       "bielefeld",
        "greuther fürth":          "greuther furth",
        "vfl bochum":              "bochum",
        "darmstadt 98":            "darmstadt",
        "holstein kiel":           "holstein kiel",
        "sv darmstadt 98":         "darmstadt",
        "paris saint-germain":     "paris sg",
        "olympique marseille":     "marseille",
        "olympique lyonnais":      "lyon",
        "as saint-etienne":        "st etienne",
        "stade rennais fc":        "rennes",
        "girondins de bordeaux":   "bordeaux",
        "montpellier hsc":         "montpellier",
        "toulouse fc":             "toulouse",
        "rc strasbourg alsace":    "strasbourg",
        "dijon fco":               "dijon",
        "stade de reims":          "reims",
        "fc nantes":               "nantes",
        "ogc nice":                "nice",
        "rc lens":                 "lens",
        "clermont foot":           "clermont",
        "angers sco":              "angers",
        "es troyes ac":            "troyes",
        "losc lille":              "lille",
        "stade brestois 29":       "brest",
        "aj auxerre":              "auxerre",
        "havre ac":                "le havre",
    }

    xg_df = pd.read_csv(XG_PATH)
    xg_df["Date"] = pd.to_datetime(xg_df["Date"], errors="coerce").dt.date
    xg_df = xg_df.dropna(subset=["Date", "HomeTeam", "AwayTeam", "xg_h", "xg_a"])

    def normalize(name):
        n = str(name).strip().lower()
        return NAME_MAP.get(n, n)

    xg_df["_h"] = xg_df["HomeTeam"].apply(normalize)
    xg_df["_a"] = xg_df["AwayTeam"].apply(normalize)

    lookup = {}
    for _, row in xg_df.iterrows():
        key = (str(row["Div"]), str(row["Date"]), row["_h"], row["_a"])
        lookup[key] = (float(row["xg_h"]), float(row["xg_a"]))

    print(f"    xG real incarcat: {len(lookup):,} meciuri ({xg_df['Div'].nunique()} ligi)")
    return lookup


# ─────────────────────────────────────────────────────────
# 2. CURATARE DATE
# ─────────────────────────────────────────────────────────
def preprocess(data):
    cols = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
    missing = [c for c in cols if c not in data.columns]
    if missing:
        raise RuntimeError(f"Coloane lipsa: {missing}")

    extra = ["Div"]
    keep = cols + extra
    keep = list(dict.fromkeys(keep))
    data = data[keep].copy()
    data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce")
    data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce")
    data["FTR"]  = data["FTR"].astype(str).str.strip()
    data = data.dropna(subset=["FTHG", "FTAG", "FTR", "HomeTeam", "AwayTeam"])
    data = data[data["FTR"].isin(["H", "D", "A"])]
    data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
    data = data.dropna(subset=["Date"])

    if "Div" in data.columns:
        data["Div"] = data["Div"].astype(str).str.strip()
    else:
        data["Div"] = "UNK"

    data = data.sort_values("Date").reset_index(drop=True)
    print(f"    Meciuri valide: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 3. ELO PER LIGA
# ─────────────────────────────────────────────────────────
def build_elo_features(data):
    print(">>> Calculez Elo per liga...")
    ratings = {}

    def get(league, team):
        return ratings.get((league, team), 1500.0)

    def expected(ra, rb):
        return 1.0 / (1 + 10 ** ((rb - ra) / 400))

    h_elo, a_elo, elo_diff, elo_prob_h, elo_prob_d = [], [], [], [], []

    for _, row in data.iterrows():
        league = row["Div"]
        home, away, ftr = row["HomeTeam"], row["AwayTeam"], row["FTR"]

        rh = get(league, home)
        ra = get(league, away)
        rh_adj = rh + ELO_HOME

        ea = expected(rh_adj, ra)

        h_elo.append(rh)
        a_elo.append(ra)
        elo_diff.append(rh_adj - ra)

        diff_abs = abs(rh_adj - ra)
        dp = max(0.15, min(0.35, 0.27 * np.exp(-diff_abs / 500)))
        elo_prob_h.append(ea * (1 - dp))
        elo_prob_d.append(dp)

        sa, sb = {"H": (1, 0), "D": (0.5, 0.5), "A": (0, 1)}[ftr]
        ratings[(league, home)] = rh + ELO_K * (sa - ea)
        ratings[(league, away)] = ra + ELO_K * (sb - (1 - ea))

    elo_ratings_flat = {f"{lg}|{tm}": v for (lg, tm), v in ratings.items()}

    return pd.DataFrame({
        "h_elo":      h_elo,
        "a_elo":      a_elo,
        "elo_diff":   elo_diff,
        "elo_prob_h": elo_prob_h,
        "elo_prob_d": elo_prob_d,
    }, index=data.index), elo_ratings_flat


# ─────────────────────────────────────────────────────────
# 4. FEATURES ATAC / APARARE + FORMA
# ─────────────────────────────────────────────────────────
def build_team_features(data, xg_lookup=None):
    print(">>> Calculez features atac/aparare per echipa...")
    if xg_lookup:
        print(f"    xG real disponibil pentru {len(xg_lookup):,} meciuri")

    hist = {}
    rows = []
    xg_real_used = 0

    for idx, row in data.iterrows():
        home, away = row["HomeTeam"], row["AwayTeam"]
        hg, ag = row["FTHG"], row["FTAG"]
        ftr = row["FTR"]
        div = str(row.get("Div", ""))
        date_obj = row["Date"].date() if hasattr(row["Date"], "date") else None

        real_xg_h = real_xg_a = None
        if xg_lookup and date_obj:
            key = (div, str(date_obj), home.strip().lower(), away.strip().lower())
            real_xg = xg_lookup.get(key)
            if real_xg:
                real_xg_h, real_xg_a = real_xg
                xg_real_used += 1

        def get_stats(team, as_home):
            records = hist.get(team, [])
            all_r   = records
            home_r  = [r for r in records if r["is_home"]]
            away_r  = [r for r in records if not r["is_home"]]

            def avg_gf(lst, n, default=1.3):
                if not lst: return default
                vals = [r["gf"] for r in lst[-n:]]
                return sum(vals) / len(vals)

            def avg_ga(lst, n, default=1.3):
                if not lst: return default
                vals = [r["ga"] for r in lst[-n:]]
                return sum(vals) / len(vals)

            def avg_xgf(lst, n, default=None):
                sub = [r for r in lst[-n:] if r.get("xgf") is not None]
                if not sub: return default
                return sum(r["xgf"] for r in sub) / len(sub)

            def avg_xga(lst, n, default=None):
                sub = [r for r in lst[-n:] if r.get("xga") is not None]
                if not sub: return default
                return sum(r["xga"] for r in sub) / len(sub)

            def win_rate(lst, n):
                if not lst: return 0.40
                sub = lst[-n:]
                return sum(1 for r in sub if r["pts"] == 3) / len(sub)

            def draw_rate(lst, n):
                if not lst: return 0.26
                sub = lst[-n:]
                return sum(1 for r in sub if r["pts"] == 1) / len(sub)

            def pts_rate(lst, n):
                if not lst: return 1.2
                sub = lst[-n:]
                return sum(r["pts"] for r in sub) / (3 * len(sub))

            def streak(lst):
                if not lst: return 0
                last = lst[-1]["pts"]
                s = 0
                for r in reversed(lst):
                    if r["pts"] == last:
                        s += 1
                    else:
                        break
                return s if last == 3 else (-s if last == 0 else 0)

            venue_r = home_r if as_home else away_r
            gf_venue5 = avg_gf(venue_r, 5, 1.4 if as_home else 1.1)
            ga_venue5 = avg_ga(venue_r, 5, 1.1 if as_home else 1.3)

            xgf5 = avg_xgf(all_r, 5)
            xga5 = avg_xga(all_r, 5)
            xgf_v5 = avg_xgf(venue_r, 5)
            xga_v5 = avg_xga(venue_r, 5)

            return {
                "atk_all5":    avg_gf(all_r, 5),
                "def_all5":    avg_ga(all_r, 5),
                "atk_all10":   avg_gf(all_r, 10),
                "def_all10":   avg_ga(all_r, 10),
                "atk_venue5":  gf_venue5,
                "def_venue5":  ga_venue5,
                "win5":        win_rate(all_r, 5),
                "win10":       win_rate(all_r, 10),
                "draw5":       draw_rate(all_r, 5),
                "pts5":        pts_rate(all_r, 5),
                "pts10":       pts_rate(all_r, 10),
                "win_venue5":  win_rate(venue_r, 5),
                "pts_venue5":  pts_rate(venue_r, 5),
                "btts5":       sum(1 for r in all_r[-5:] if r["gf"] > 0 and r["ga"] > 0) / max(len(all_r[-5:]), 1),
                "over25_5":    sum(1 for r in all_r[-5:] if r["gf"] + r["ga"] > 2) / max(len(all_r[-5:]), 1),
                "clean5":      sum(1 for r in all_r[-5:] if r["ga"] == 0) / max(len(all_r[-5:]), 1),
                "streak":      streak(all_r),
                "n_matches":   len(all_r),
                "_xgf5":       xgf5,
                "_xga5":       xga5,
                "_xgf_v5":     xgf_v5,
                "_xga_v5":     xga_v5,
                "_gf_v5":      gf_venue5,
                "_ga_v5":      ga_venue5,
            }

        h_stats = get_stats(home, as_home=True)
        a_stats = get_stats(away, as_home=False)

        def pick_xg(xgf5, xga5, xgf_v5, xga_v5, gf_v5, ga_v5):
            if xgf_v5 is not None and xga_v5 is not None:
                return xgf_v5, xga_v5
            elif xgf5 is not None and xga5 is not None:
                return xgf5, xga5
            else:
                return gf_v5, ga_v5

        h_xgf, h_xga = pick_xg(h_stats["_xgf5"], h_stats["_xga5"],
                                h_stats["_xgf_v5"], h_stats["_xga_v5"],
                                h_stats["_gf_v5"], h_stats["_ga_v5"])
        a_xgf, a_xga = pick_xg(a_stats["_xgf5"], a_stats["_xga5"],
                                a_stats["_xgf_v5"], a_stats["_xga_v5"],
                                a_stats["_gf_v5"], a_stats["_ga_v5"])

        xg_h = (h_xgf + a_xga) / 2
        xg_a = (a_xgf + h_xga) / 2

        for k in ["_xgf5", "_xga5", "_xgf_v5", "_xga_v5", "_gf_v5", "_ga_v5"]:
            h_stats.pop(k, None)
            a_stats.pop(k, None)

        row_feat = {"match_idx": idx}
        for k, v in h_stats.items():
            row_feat[f"h_{k}"] = v
        for k, v in a_stats.items():
            row_feat[f"a_{k}"] = v
        row_feat["xg_h"] = xg_h
        row_feat["xg_a"] = xg_a
        row_feat["xg_diff"] = xg_h - xg_a

        rows.append(row_feat)

        h_pts = {"H": 3, "D": 1, "A": 0}[ftr]
        a_pts = {"H": 0, "D": 1, "A": 3}[ftr]
        hist.setdefault(home, []).append({
            "gf": hg, "ga": ag, "is_home": True, "pts": h_pts,
            "xgf": real_xg_h, "xga": real_xg_a,
        })
        hist.setdefault(away, []).append({
            "gf": ag, "ga": hg, "is_home": False, "pts": a_pts,
            "xgf": real_xg_a, "xga": real_xg_h,
        })

    print(f"    xG real folosit: {xg_real_used:,} meciuri ({xg_real_used/max(len(rows),1)*100:.1f}%)")
    return pd.DataFrame(rows).set_index("match_idx"), hist


# ─────────────────────────────────────────────────────────
# 5. H2H FEATURES
# ─────────────────────────────────────────────────────────
def build_h2h_features(data):
    print(">>> Calculez H2H...")
    rows = []
    history = {}

    for idx, row in data.iterrows():
        home, away = row["HomeTeam"], row["AwayTeam"]
        ftr = row["FTR"]
        hg, ag = row["FTHG"], row["FTAG"]
        key = tuple(sorted([home, away]))
        recent = history.get(key, [])[-6:]

        if not recent:
            rows.append({"match_idx": idx,
                         "h2h_hw": 0.45, "h2h_dr": 0.25,
                         "h2h_gd": 0.0,  "h2h_n": 0})
        else:
            hw = dr = 0
            gd_sum = 0.0
            for r in recent:
                if r["home"] == home:
                    hw += int(r["ftr"] == "H")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["hg"] - r["ag"]
                else:
                    hw += int(r["ftr"] == "A")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["ag"] - r["hg"]
            n = len(recent)
            rows.append({"match_idx": idx,
                         "h2h_hw": hw / n, "h2h_dr": dr / n,
                         "h2h_gd": gd_sum / n, "h2h_n": n})

        history.setdefault(key, []).append(
            {"home": home, "away": away, "ftr": ftr, "hg": hg, "ag": ag})

    return pd.DataFrame(rows).set_index("match_idx"), history


# ─────────────────────────────────────────────────────────
# 6. ASAMBLARE (fara features de cote)
# ─────────────────────────────────────────────────────────
def assemble(data, team_df, h2h_df, elo_df):
    print(">>> Asamblam feature matrix (fara cote)...")

    le_div = LabelEncoder()
    league_id = le_div.fit_transform(data["Div"])

    X = pd.concat([team_df, h2h_df, elo_df], axis=1)

    for col in ["atk_all5", "def_all5", "atk_all10", "def_all10",
                "atk_venue5", "def_venue5", "win5", "win10",
                "pts5", "pts10", "win_venue5", "pts_venue5"]:
        if f"h_{col}" in X.columns and f"a_{col}" in X.columns:
            X[f"diff_{col}"] = X[f"h_{col}"] - X[f"a_{col}"]

    X["league_id"]       = league_id
    X["month"]           = data["Date"].dt.month.values
    X["season_progress"] = ((data["Date"].dt.month - 8) % 12) / 11.0

    X["balanced"]    = np.exp(-np.abs(X["elo_diff"]) / 150)
    X["low_scoring"] = 1.0 / (X["xg_h"] + X["xg_a"] + 0.5)
    X["xg_sim"]      = np.exp(-np.abs(X["xg_diff"]) * 2)
    lam = X["xg_h"].clip(0.1, 6)
    mu  = X["xg_a"].clip(0.1, 6)
    X["poisson_draw"] = np.exp(-(lam + mu)) * np.exp(2 * np.sqrt(lam * mu) - lam - mu + (lam + mu))

    valid = (X["h_n_matches"] >= MIN_MATCHES) & (X["a_n_matches"] >= MIN_MATCHES)
    X = X[valid].fillna(0)
    y = data.loc[valid, "FTR"]
    print(f"    Meciuri cu istoric suficient: {len(X)}")
    return X, y


# ─────────────────────────────────────────────────────────
# 7. ANTRENARE (fara filtrare has_odds)
# ─────────────────────────────────────────────────────────
from calibrator import CalibratedXGB


def train_model(X, y):
    import optuna
    from sklearn.utils.class_weight import compute_sample_weight
    from sklearn.isotonic import IsotonicRegression
    from sklearn.metrics import brier_score_loss

    optuna.logging.set_verbosity(optuna.logging.WARNING)

    print(">>> Antrenez XGBoost NO-ODDS cu temporal split + Optuna + calibrare...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # Antrenam pe TOATE meciurile (nu filtram dupa has_odds)
    X_all = X.reset_index(drop=True)
    y_all = y_enc
    print(f"    Total meciuri disponibile: {len(X_all):,}")

    # Temporal split (acelasi schema: 70% train | 10% val | 20% test)
    n = len(X_all)
    train_end  = int(n * 0.80)
    val_start  = int(n * 0.70)

    X_train = X_all.iloc[:val_start]
    y_train = y_all[:val_start]

    X_val   = X_all.iloc[val_start:train_end]
    y_val   = y_all[val_start:train_end]

    X_test  = X_all.iloc[train_end:]
    y_test  = y_all[train_end:]

    print(f"    Temporal split: Train={len(X_train)} | Val={len(X_val)} | Test={len(X_test)}")
    print(f"    (Train 0-70% | Val 70-80% | Test 80-100% cronologic)")

    # Optuna tuning
    print(f"\n>>> Optuna tuning (50 trials)...")

    def objective(trial):
        params = dict(
            n_estimators          = trial.suggest_int("n_estimators", 300, 1500),
            max_depth             = trial.suggest_int("max_depth", 3, 8),
            learning_rate         = trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            subsample             = trial.suggest_float("subsample", 0.6, 1.0),
            colsample_bytree      = trial.suggest_float("colsample_bytree", 0.5, 1.0),
            min_child_weight      = trial.suggest_int("min_child_weight", 1, 10),
            gamma                 = trial.suggest_float("gamma", 0.0, 5.0),
            eval_metric           = "mlogloss",
            early_stopping_rounds = 50,
            random_state          = 42,
            n_jobs                = -1,
            tree_method           = "hist",
        )
        m = XGBClassifier(**params)
        sw = compute_sample_weight("balanced", y_train)
        m.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              sample_weight=sw,
              verbose=False)
        return accuracy_score(y_val, m.predict(X_val))

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=50, show_progress_bar=True)

    best = study.best_params
    print(f"    Best params: {best}")
    print(f"    Best val accuracy: {study.best_value*100:.2f}%")

    # Antrenare finala
    print("\n>>> Antrenez modelul final cu best params + sample weights...")
    model = XGBClassifier(
        **best,
        eval_metric           = "mlogloss",
        early_stopping_rounds = 50,
        random_state          = 42,
        n_jobs                = -1,
        tree_method           = "hist",
    )
    sw_train = compute_sample_weight("balanced", y_train)
    model.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              sample_weight=sw_train,
              verbose=100)

    # Calibrare isotonica pe X_val
    print("\n>>> Calibrez probabilitatile (isotonic regression pe X_val)...")
    proba_val  = model.predict_proba(X_val)
    n_classes  = len(le.classes_)
    calibrators = []
    for i in range(n_classes):
        ir = IsotonicRegression(out_of_bounds="clip")
        ir.fit(proba_val[:, i], (y_val == i).astype(int))
        calibrators.append(ir)
    calibrated = CalibratedXGB(model, calibrators, n_classes)

    # Raport final
    preds = calibrated.predict(X_test)
    proba = calibrated.predict_proba(X_test)

    acc      = accuracy_score(y_test, preds)
    baseline = (y_test == np.bincount(y_test).argmax()).mean()
    edge     = acc - baseline

    print(f"\n{'='*55}")
    print(f"  RAPORT FINAL NO-ODDS — Test temporal (ultimele 20%)")
    print(f"{'='*55}")
    print(f"  Acuratete test:        {acc*100:.2f}%")
    print(f"  Baseline majority:     {baseline*100:.2f}%")
    print(f"  Edge real vs baseline: {edge*100:+.2f}%")
    print(f"\n{classification_report(y_test, preds, target_names=le.classes_)}")

    # Draw recall explicit
    from sklearn.metrics import recall_score
    draw_idx = list(le.classes_).index("D")
    draw_recall = recall_score(y_test, preds, labels=[draw_idx], average=None)[0]
    print(f"  *** Draw recall: {draw_recall:.4f} ({draw_recall*100:.1f}%) ***")

    brier = np.mean([
        brier_score_loss((y_test == i).astype(int), proba[:, i])
        for i in range(len(le.classes_))
    ])
    print(f"  Brier score:           {brier:.4f}  ({'bun' if brier < 0.20 else 'acceptabil' if brier < 0.25 else 'slab'})")

    importances = model.feature_importances_
    feat_names  = list(X_all.columns)
    top15_idx   = np.argsort(importances)[::-1][:15]
    print(f"\n  Top 15 features:")
    for rank, i in enumerate(top15_idx, 1):
        print(f"    {rank:2d}. {feat_names[i]:<35} {importances[i]:.4f}")

    max_conf = proba.max(axis=1)
    print(f"\n  Acuratete per prag de incredere (test temporal):")
    for thr in [0.45, 0.50, 0.55, 0.60, 0.65, 0.70]:
        mask = max_conf >= thr
        if mask.sum() > 0:
            acc_thr = accuracy_score(y_test[mask], preds[mask])
            print(f"    >= {thr:.0%}  ->  {acc_thr*100:.2f}%  ({mask.sum():,} meciuri, {mask.mean()*100:.1f}%)")
    print(f"{'='*55}\n")

    feature_means = X_all.iloc[:train_end].mean().to_dict()

    return calibrated, le, feature_means


# ─────────────────────────────────────────────────────────
# 8. TEAM STATS PENTRU PREDICTOR
# ─────────────────────────────────────────────────────────
def build_team_stats(hist, elo_ratings):
    team_stats = {}
    for team, records in hist.items():
        if not records:
            continue
        last10 = records[-10:]
        last5  = records[-5:]
        home_r = [r for r in records if r["is_home"]]
        away_r = [r for r in records if not r["is_home"]]
        home5  = home_r[-5:]
        away5  = away_r[-5:]

        def avg(lst, key, default=1.3):
            return sum(r[key] for r in lst) / len(lst) if lst else default

        def avg_xg(lst, key):
            vals = [r[key] for r in lst if r.get(key) is not None]
            return sum(vals) / len(vals) if vals else None

        def win_rate(lst):
            return sum(1 for r in lst if r["pts"] == 3) / len(lst) if lst else 0.40

        def pts_rate(lst):
            return sum(r["pts"] for r in lst) / (3 * len(lst)) if lst else 0.40

        def streak(lst):
            if not lst: return 0
            last = lst[-1]["pts"]
            s = 0
            for r in reversed(lst):
                if r["pts"] == last: s += 1
                else: break
            return s if last == 3 else (-s if last == 0 else 0)

        team_elo = max(
            (v for k, v in elo_ratings.items() if k.split("|", 1)[-1] == team),
            default=1500.0
        )

        team_stats[team] = {
            "atk_all5":    avg(last5, "gf"),
            "def_all5":    avg(last5, "ga"),
            "atk_all10":   avg(last10, "gf"),
            "def_all10":   avg(last10, "ga"),
            "atk_home5":   avg(home5, "gf", 1.4),
            "def_home5":   avg(home5, "ga", 1.1),
            "win_home5":   win_rate(home5),
            "pts_home5":   pts_rate(home5),
            "atk_away5":   avg(away5, "gf", 1.1),
            "def_away5":   avg(away5, "ga", 1.3),
            "win_away5":   win_rate(away5),
            "pts_away5":   pts_rate(away5),
            "win5":        win_rate(last5),
            "win10":       win_rate(last10),
            "draw5":       sum(1 for r in last5 if r["pts"] == 1) / max(len(last5), 1),
            "pts5":        pts_rate(last5),
            "pts10":       pts_rate(last10),
            "btts5":       sum(1 for r in last5 if r["gf"] > 0 and r["ga"] > 0) / max(len(last5), 1),
            "over25_5":    sum(1 for r in last5 if r["gf"] + r["ga"] > 2) / max(len(last5), 1),
            "clean5":      sum(1 for r in last5 if r["ga"] == 0) / max(len(last5), 1),
            "streak":      streak(records),
            "n_matches":   len(records),
            "elo":         team_elo,
            "xgf_home5":   avg_xg(home5, "xgf"),
            "xga_home5":   avg_xg(home5, "xga"),
            "xgf_away5":   avg_xg(away5, "xgf"),
            "xga_away5":   avg_xg(away5, "xga"),
            "xgf_all5":    avg_xg(last5, "xgf"),
            "xga_all5":    avg_xg(last5, "xga"),
        }
    return team_stats


# ─────────────────────────────────────────────────────────
# 9. MAIN
# ─────────────────────────────────────────────────────────
def main():
    data                     = load_data()
    data                     = preprocess(data)
    xg_lookup                = load_xg_data()
    elo_df, elo_ratings      = build_elo_features(data)
    team_df, hist            = build_team_features(data, xg_lookup=xg_lookup)
    h2h_df, h2h_history      = build_h2h_features(data)
    X, y                     = assemble(data, team_df, h2h_df, elo_df)
    model, le, feature_means = train_model(X, y)
    team_stats               = build_team_stats(hist, elo_ratings)

    h2h_history_trimmed = {k: v[-6:] for k, v in h2h_history.items()}

    print(">>> Salvez modelul...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "model":          model,
            "features":       list(X.columns),
            "team_stats":     team_stats,
            "label_encoder":  le,
            "elo_ratings":    elo_ratings,
            "feature_means":  feature_means,
            "h2h_history":    h2h_history_trimmed,
        }, f)
    print(f">>> Model salvat: {MODEL_PATH}")


if __name__ == "__main__":
    main()
