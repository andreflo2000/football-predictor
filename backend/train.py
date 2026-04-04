import os
import glob
import pickle
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

warnings.filterwarnings("ignore")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(BASE_DIR, "data", "csv", "club")
MODEL_PATH  = os.path.join(BASE_DIR, "model.pkl")
MIN_MATCHES = 6
WINDOWS     = [3, 5, 10]
ELO_K       = 32
ELO_HOME    = 85


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
# 2. CURATARE DATE
# ─────────────────────────────────────────────────────────
def preprocess(data):
    cols = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
    missing = [c for c in cols if c not in data.columns]
    if missing:
        raise RuntimeError(f"Coloane lipsa: {missing}")

    keep = cols + [c for c in ["Div"] if c in data.columns]
    data = data[keep].copy()
    data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce")
    data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce")
    data["FTR"]  = data["FTR"].astype(str).str.strip()
    data = data.dropna(subset=["FTHG", "FTAG", "FTR", "HomeTeam", "AwayTeam"])
    data = data[data["FTR"].isin(["H", "D", "A"])]
    data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
    data = data.dropna(subset=["Date"])

    # Liga — folosim Div ca identificator de liga
    if "Div" in data.columns:
        data["Div"] = data["Div"].astype(str).str.strip()
    else:
        data["Div"] = "UNK"

    data = data.sort_values("Date").reset_index(drop=True)
    print(f"    Meciuri valide: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 3. ELO PER LIGA (fix principal — nu global!)
# ─────────────────────────────────────────────────────────
def build_elo_features(data):
    """
    Elo calculat SEPARAT per liga.
    Echipele din ligi diferite nu se influenteaza reciproc.
    Elo porneste de la 1500 la prima aparitie in fiecare liga.
    """
    print(">>> Calculez Elo per liga...")
    ratings = {}  # (liga, echipa) -> elo

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

        ea = expected(rh_adj, ra)  # prob victorie gazda

        h_elo.append(rh)
        a_elo.append(ra)
        elo_diff.append(rh_adj - ra)

        # Prob estimate H/D/A din Elo
        diff_abs = abs(rh_adj - ra)
        dp = max(0.15, min(0.35, 0.27 * np.exp(-diff_abs / 500)))
        elo_prob_h.append(ea * (1 - dp))
        elo_prob_d.append(dp)

        # Update dupa meci
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
def build_team_features(data):
    """
    Pentru fiecare meci, calculam (fara leakage):
    - rata de goluri marcate/primite acasa si in deplasare
    - forma recenta (win rate ultimele 5)
    - streak
    - H2H
    """
    print(">>> Calculez features atac/aparare per echipa...")

    # Structuri de istoric per echipa
    hist = {}  # team -> list de {gf, ga, is_home, pts}

    rows = []
    for idx, row in data.iterrows():
        home, away = row["HomeTeam"], row["AwayTeam"]
        hg, ag = row["FTHG"], row["FTAG"]
        ftr = row["FTR"]

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
            return {
                "atk_all5":    avg_gf(all_r, 5),
                "def_all5":    avg_ga(all_r, 5),
                "atk_all10":   avg_gf(all_r, 10),
                "def_all10":   avg_ga(all_r, 10),
                "atk_venue5":  avg_gf(venue_r, 5, 1.4 if as_home else 1.1),
                "def_venue5":  avg_ga(venue_r, 5, 1.1 if as_home else 1.3),
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
            }

        h_stats = get_stats(home, as_home=True)
        a_stats = get_stats(away, as_home=False)

        # Expected goals proxy (atac gazda vs aparare oaspete)
        xg_h = (h_stats["atk_venue5"] + a_stats["def_venue5"]) / 2
        xg_a = (a_stats["atk_venue5"] + h_stats["def_venue5"]) / 2

        row_feat = {"match_idx": idx}
        for k, v in h_stats.items():
            row_feat[f"h_{k}"] = v
        for k, v in a_stats.items():
            row_feat[f"a_{k}"] = v
        row_feat["xg_h"] = xg_h
        row_feat["xg_a"] = xg_a
        row_feat["xg_diff"] = xg_h - xg_a

        rows.append(row_feat)

        # Update istoric
        h_pts = {"H": 3, "D": 1, "A": 0}[ftr]
        a_pts = {"H": 0, "D": 1, "A": 3}[ftr]
        hist.setdefault(home, []).append({"gf": hg, "ga": ag, "is_home": True,  "pts": h_pts})
        hist.setdefault(away, []).append({"gf": ag, "ga": hg, "is_home": False, "pts": a_pts})

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

    return pd.DataFrame(rows).set_index("match_idx")


# ─────────────────────────────────────────────────────────
# 6. ASAMBLARE
# ─────────────────────────────────────────────────────────
def assemble(data, team_df, h2h_df, elo_df):
    print(">>> Asamblam feature matrix...")

    le_div = LabelEncoder()
    league_id = le_div.fit_transform(data["Div"])

    X = pd.concat([team_df, h2h_df, elo_df], axis=1)

    # Diferentiale
    for col in ["atk_all5", "def_all5", "atk_all10", "def_all10",
                "atk_venue5", "def_venue5", "win5", "win10",
                "pts5", "pts10", "win_venue5", "pts_venue5"]:
        if f"h_{col}" in X.columns and f"a_{col}" in X.columns:
            X[f"diff_{col}"] = X[f"h_{col}"] - X[f"a_{col}"]

    X["league_id"]       = league_id
    X["month"]           = data["Date"].dt.month.values
    X["season_progress"] = ((data["Date"].dt.month - 8) % 12) / 11.0

    # Features specifice pentru egaluri
    # Egal mai probabil cand: echipe egale, joc defensiv, elo_diff mic
    X["balanced"]    = np.exp(-np.abs(X["elo_diff"]) / 150)   # 1.0 cand elo_diff=0
    X["low_scoring"] = 1.0 / (X["xg_h"] + X["xg_a"] + 0.5)  # creste cand xg mic
    X["xg_sim"]      = np.exp(-np.abs(X["xg_diff"]) * 2)     # 1.0 cand xg_h≈xg_a
    # Poisson draw proxy: P(draw) ≈ exp(-(lam+mu)) * I0(2*sqrt(lam*mu))
    lam = X["xg_h"].clip(0.1, 6)
    mu  = X["xg_a"].clip(0.1, 6)
    X["poisson_draw"] = np.exp(-(lam + mu)) * np.exp(2 * np.sqrt(lam * mu) - lam - mu + (lam + mu))

    # Filtru cold-start
    valid = (X["h_n_matches"] >= MIN_MATCHES) & (X["a_n_matches"] >= MIN_MATCHES)
    X = X[valid].fillna(0)
    y = data.loc[valid, "FTR"]
    print(f"    Meciuri cu istoric: {len(X)}")
    return X, y


# ─────────────────────────────────────────────────────────
# 7. ANTRENARE
# ─────────────────────────────────────────────────────────
def train_model(X, y):
    print(">>> Antrenez XGBoost...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # Random split stratificat — evita distribution shift
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=42, stratify=y_enc
    )

    dist = {le.classes_[i]: int((y_train == i).sum()) for i in range(3)}
    print(f"    Train: {len(X_train)} | Test: {len(X_test)}")
    print(f"    Distributie: {dist}")

    model = XGBClassifier(
        n_estimators=1000,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.80,
        colsample_bytree=0.75,
        colsample_bylevel=0.75,
        min_child_weight=6,
        gamma=0.05,
        reg_alpha=0.1,
        reg_lambda=1.5,
        eval_metric="mlogloss",
        early_stopping_rounds=80,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=100,
    )

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n>>> Acuratete: {acc * 100:.2f}%")
    print(classification_report(y_test, preds, target_names=le.classes_))
    return model, le


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
        home_r = [r for r in records if r["is_home"]][-5:]
        away_r = [r for r in records if not r["is_home"]][-5:]

        def avg(lst, key, default=1.3):
            return sum(r[key] for r in lst) / len(lst) if lst else default

        team_stats[team] = {
            "atk_all5":   avg(last5, "gf"),
            "def_all5":   avg(last5, "ga"),
            "atk_all10":  avg(last10, "gf"),
            "def_all10":  avg(last10, "ga"),
            "atk_venue5": avg(home_r, "gf", 1.4),
            "def_venue5": avg(home_r, "ga", 1.1),
            "win5":       sum(1 for r in last5 if r["pts"] == 3) / max(len(last5), 1),
            "win10":      sum(1 for r in last10 if r["pts"] == 3) / max(len(last10), 1),
            "draw5":      sum(1 for r in last5 if r["pts"] == 1) / max(len(last5), 1),
            "pts5":       sum(r["pts"] for r in last5) / (3 * max(len(last5), 1)),
            "pts10":      sum(r["pts"] for r in last10) / (3 * max(len(last10), 1)),
            "n_matches":  len(records),
            "elo":        elo_ratings.get(team, 1500.0),
        }
    return team_stats


# ─────────────────────────────────────────────────────────
# 9. MAIN
# ─────────────────────────────────────────────────────────
def main():
    data                    = load_data()
    data                    = preprocess(data)
    elo_df, elo_ratings     = build_elo_features(data)
    team_df, hist           = build_team_features(data)
    h2h_df                  = build_h2h_features(data)
    X, y                    = assemble(data, team_df, h2h_df, elo_df)
    model, le               = train_model(X, y)
    team_stats              = build_team_stats(hist, elo_ratings)

    print(">>> Salvez modelul...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "model":         model,
            "features":      list(X.columns),
            "team_stats":    team_stats,
            "label_encoder": le,
            "elo_ratings":   elo_ratings,
        }, f)
    print(">>> Model salvat!")


if __name__ == "__main__":
    main()
