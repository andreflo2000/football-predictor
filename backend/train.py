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
MODEL_PATH  = os.path.join(BASE_DIR, "model.pkl")
MIN_MATCHES = 5
WINDOWS     = [3, 5, 10]
ELO_K       = 32
ELO_HOME    = 85
ELO_BASE    = 1500
EWMA_SPAN   = 5


# ─────────────────────────────────────────────────────────
# 1. INCARCARE CSV-URI
# ─────────────────────────────────────────────────────────
def load_data():
    print(">>> Incarc CSV-uri...")
    files = glob.glob(os.path.join(DATA_DIR, "**", "*.csv"), recursive=True)
    print(f"    Gasit {len(files)} fisiere.")
    dfs = []
    for f in files:
        # TAB primul — stim ca fisierele sunt TAB-separated
        for sep in ["\t", ",", ";"]:
            try:
                df = pd.read_csv(
                    f, sep=sep,
                    encoding="utf-8-sig",
                    on_bad_lines="skip",
                    low_memory=False
                )
                if len(df.columns) >= 6:
                    dfs.append(df)
                    break
            except Exception:
                continue
    if not dfs:
        raise RuntimeError("Nu s-au putut citi CSV-urile!")
    data = pd.concat(dfs, ignore_index=True)
    print(f"    Total randuri brute: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 2. CURATARE DATE
# ─────────────────────────────────────────────────────────
def preprocess(data):
    cols_required = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
    missing = [c for c in cols_required if c not in data.columns]
    if missing:
        raise RuntimeError(f"Coloane lipsa: {missing}")

    keep = cols_required + [c for c in ["Div", "HTHG", "HTAG", "HTR"] if c in data.columns]
    data = data[keep].copy()

    data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce")
    data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce")
    data["FTR"]  = data["FTR"].astype(str).str.strip()
    data = data.dropna(subset=["FTHG", "FTAG", "FTR", "HomeTeam", "AwayTeam"])
    data = data[data["FTR"].isin(["H", "D", "A"])]
    data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
    data = data.dropna(subset=["Date"])
    data = data.sort_values("Date").reset_index(drop=True)

    # Encode liga
    if "Div" in data.columns:
        data["Div"] = data["Div"].astype(str).str.strip()
        le_div = LabelEncoder()
        data["league_id"] = le_div.fit_transform(data["Div"])
    else:
        data["league_id"] = 0

    # Season progress (0.0 = inceput sezon, 1.0 = final sezon)
    month = data["Date"].dt.month
    # Sezonul incepe in august (luna 8)
    season_month = (month - 8) % 12  # 0=aug, 1=sep, ..., 9=mai, 10=iun, 11=iul
    data["season_progress"] = season_month / 11.0

    print(f"    Meciuri valide: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 3. ELO RATINGS
# ─────────────────────────────────────────────────────────
def build_elo_features(data):
    print(">>> Calculez Elo ratings...")
    ratings = {}

    def get(team):
        return ratings.get(team, float(ELO_BASE))

    def expected(ra, rb):
        return 1.0 / (1 + 10 ** ((rb - ra) / 400))

    h_elo_before, a_elo_before, elo_diff, elo_draw_prob = [], [], [], []

    for _, row in data.iterrows():
        home, away, ftr = row["HomeTeam"], row["AwayTeam"], row["FTR"]
        ra = get(home) + ELO_HOME
        rb = get(away)
        ea = expected(ra, rb)

        h_elo_before.append(get(home))
        a_elo_before.append(get(away))
        elo_diff.append(ra - rb)

        diff_abs = abs(ra - rb)
        draw_p = max(0.15, min(0.38, 0.27 * np.exp(-diff_abs / 600)))
        elo_draw_prob.append(draw_p)

        sa, sb = {"H": (1, 0), "D": (0.5, 0.5), "A": (0, 1)}[ftr]
        ratings[home] = get(home) + ELO_K * (sa - ea)
        ratings[away] = get(away) + ELO_K * (sb - (1 - ea))

    return pd.DataFrame({
        "h_elo":         h_elo_before,
        "a_elo":         a_elo_before,
        "elo_diff":      elo_diff,
        "elo_draw_prob": elo_draw_prob,
    }, index=data.index), ratings


# ─────────────────────────────────────────────────────────
# 4. ROLLING + EWMA FEATURES
# ─────────────────────────────────────────────────────────
def build_rolling_features(data):
    print(">>> Calculez rolling + EWMA features per echipa...")

    def side_df(is_home):
        if is_home:
            team, gf, ga = data["HomeTeam"], data["FTHG"], data["FTAG"]
            pts_map  = {"H": 3,   "D": 1, "A": 0}
            win_map  = {"H": 1.0, "D": 0.0, "A": 0.0}
            loss_map = {"H": 0.0, "D": 0.0, "A": 1.0}
        else:
            team, gf, ga = data["AwayTeam"], data["FTAG"], data["FTHG"]
            pts_map  = {"H": 0,   "D": 1, "A": 3}
            win_map  = {"H": 0.0, "D": 0.0, "A": 1.0}
            loss_map = {"H": 1.0, "D": 0.0, "A": 0.0}
        draw_map = {"H": 0.0, "D": 1.0, "A": 0.0}

        total_goals = gf + ga
        btts        = ((gf > 0) & (ga > 0)).astype(float)
        over25      = (total_goals > 2.5).astype(float)
        clean_sheet = (ga == 0).astype(float)

        return pd.DataFrame({
            "match_idx":   data.index,
            "Date":        data["Date"].values,
            "team":        team.values,
            "gf":          gf.values,
            "ga":          ga.values,
            "gd":          (gf - ga).values,
            "is_home":     int(is_home),
            "pts":         data["FTR"].map(pts_map).values,
            "win":         data["FTR"].map(win_map).values,
            "draw":        data["FTR"].map(draw_map).values,
            "loss":        data["FTR"].map(loss_map).values,
            "btts":        btts.values,
            "over25":      over25.values,
            "clean_sheet": clean_sheet.values,
        })

    long_df = pd.concat([side_df(True), side_df(False)], ignore_index=True)
    long_df["row_id"] = range(len(long_df))
    long_df = long_df.sort_values(["team", "Date", "match_idx"]).reset_index(drop=True)

    roll_cols = ["pts", "gf", "ga", "gd", "win", "draw", "loss", "btts", "over25", "clean_sheet"]

    for w in WINDOWS:
        rolled = long_df.groupby("team")[roll_cols].transform(
            lambda x: x.shift(1).rolling(w, min_periods=1).mean()
        )
        for c in roll_cols:
            long_df[f"{c}_{w}"] = rolled[c]

    for c in ["pts", "gf", "ga", "gd", "win"]:
        long_df[f"{c}_ewma"] = long_df.groupby("team")[c].transform(
            lambda x: x.shift(1).ewm(span=EWMA_SPAN, min_periods=1).mean()
        )

    def streak(series):
        vals = series.shift(1).fillna(0).values
        streaks = np.zeros(len(vals))
        for i in range(1, len(vals)):
            if vals[i] == vals[i-1] and vals[i] != 0:
                streaks[i] = streaks[i-1] + 1
            else:
                streaks[i] = 1 if vals[i] != 0 else 0
        return streaks

    for c in ["win", "draw", "loss"]:
        long_df[f"{c}_streak"] = long_df.groupby("team")[c].transform(streak)

    long_df["match_count"] = long_df.groupby("team").cumcount()

    # ─── NOU: Days since last match (oboseala / odihna) ───
    long_df["days_since_last"] = long_df.groupby("team")["Date"].transform(
        lambda x: x.diff().dt.days.shift(0)
    ).fillna(7)  # default 7 zile daca nu avem istoric
    # Clamp la interval rezonabil
    long_df["days_since_last"] = long_df["days_since_last"].clip(1, 60)

    # Rolling acasa
    home_only = long_df[long_df["is_home"] == 1].sort_values(["team", "Date"]).copy()
    for c in ["pts", "gd", "win", "gf", "ga"]:
        home_only[f"{c}_home5"] = home_only.groupby("team")[c].transform(
            lambda x: x.shift(1).rolling(5, min_periods=1).mean()
        )
    long_df = long_df.merge(
        home_only[["row_id", "pts_home5", "gd_home5", "win_home5", "gf_home5", "ga_home5"]],
        on="row_id", how="left"
    )

    # Rolling in deplasare
    away_only = long_df[long_df["is_home"] == 0].sort_values(["team", "Date"]).copy()
    for c in ["pts", "gd", "win", "gf", "ga"]:
        away_only[f"{c}_away5"] = away_only.groupby("team")[c].transform(
            lambda x: x.shift(1).rolling(5, min_periods=1).mean()
        )
    long_df = long_df.merge(
        away_only[["row_id", "pts_away5", "gd_away5", "win_away5", "gf_away5", "ga_away5"]],
        on="row_id", how="left"
    )

    fallbacks = [
        ("pts_home5", "pts_5"), ("gd_home5", "gd_5"), ("win_home5", "win_5"),
        ("gf_home5",  "gf_5"),  ("ga_home5",  "ga_5"),
        ("pts_away5", "pts_5"), ("gd_away5", "gd_5"), ("win_away5", "win_5"),
        ("gf_away5",  "gf_5"),  ("ga_away5",  "ga_5"),
    ]
    for col, fallback in fallbacks:
        long_df[col] = long_df[col].fillna(long_df[fallback])

    return long_df


# ─────────────────────────────────────────────────────────
# 5. HEAD-TO-HEAD FEATURES
# ─────────────────────────────────────────────────────────
def build_h2h_features(data):
    print(">>> Calculez H2H...")
    h2h_hw, h2h_dr, h2h_n, h2h_gd = [], [], [], []
    history = {}

    for _, row in data.iterrows():
        home, away, ftr = row["HomeTeam"], row["AwayTeam"], row["FTR"]
        hg, ag = row["FTHG"], row["FTAG"]
        key    = tuple(sorted([home, away]))
        recent = history.get(key, [])[-6:]

        if not recent:
            h2h_hw.append(0.45)
            h2h_dr.append(0.25)
            h2h_n.append(0)
            h2h_gd.append(0.0)
        else:
            hw = dr = 0
            gd_sum = 0.0
            for r in recent:
                if r["home"] == home:
                    hw    += int(r["ftr"] == "H")
                    dr    += int(r["ftr"] == "D")
                    gd_sum += r["hg"] - r["ag"]
                else:
                    hw    += int(r["ftr"] == "A")
                    dr    += int(r["ftr"] == "D")
                    gd_sum += r["ag"] - r["hg"]
            n = len(recent)
            h2h_hw.append(hw / n)
            h2h_dr.append(dr / n)
            h2h_n.append(n)
            h2h_gd.append(gd_sum / n)

        history.setdefault(key, []).append({"home": home, "away": away, "ftr": ftr, "hg": hg, "ag": ag})

    return pd.DataFrame({
        "h2h_home_win": h2h_hw,
        "h2h_draw":     h2h_dr,
        "h2h_n":        h2h_n,
        "h2h_gd":       h2h_gd,
    }, index=data.index)


# ─────────────────────────────────────────────────────────
# 6. POZITIE IN CLASAMENT
# ─────────────────────────────────────────────────────────
def build_table_position(data):
    print(">>> Calculez pozitia in clasament...")
    data = data.copy()
    year = data["Date"].dt.year
    month = data["Date"].dt.month
    season_start = year.where(month >= 7, year - 1)
    data["season"] = season_start.astype(str)

    cum_pts_home = {}
    cum_pts_away = {}
    h_pts_before, a_pts_before = [], []

    for _, row in data.iterrows():
        home   = row["HomeTeam"]
        away   = row["AwayTeam"]
        ftr    = row["FTR"]
        season = row["season"]

        hk = (season, home)
        ak = (season, away)

        h_pts_before.append(cum_pts_home.get(hk, 0))
        a_pts_before.append(cum_pts_away.get(ak, 0))

        h_pts = {"H": 3, "D": 1, "A": 0}[ftr]
        a_pts = {"H": 0, "D": 1, "A": 3}[ftr]
        cum_pts_home[hk] = cum_pts_home.get(hk, 0) + h_pts
        cum_pts_away[ak] = cum_pts_away.get(ak, 0) + a_pts

    return pd.DataFrame({
        "h_season_pts":      h_pts_before,
        "a_season_pts":      a_pts_before,
        "season_pts_diff":   [h - a for h, a in zip(h_pts_before, a_pts_before)],
        "season_progress":   data["season_progress"].values,
    }, index=data.index)


# ─────────────────────────────────────────────────────────
# 7. ASAMBLARE MATRICE DE FEATURES
# ─────────────────────────────────────────────────────────
def assemble_and_filter(data, long_df, h2h_df, elo_df, table_df):
    print(">>> Asamblam feature matrix...")

    exclude = {"match_idx", "Date", "team", "row_id",
               "gf", "ga", "gd", "is_home", "pts", "win", "draw", "loss",
               "btts", "over25", "clean_sheet"}
    feat_cols = [c for c in long_df.columns if c not in exclude]

    home_feats = (long_df[long_df["is_home"] == 1]
                  .set_index("match_idx")[feat_cols]
                  .add_prefix("h_"))
    away_feats = (long_df[long_df["is_home"] == 0]
                  .set_index("match_idx")[feat_cols]
                  .add_prefix("a_"))

    X = pd.concat([home_feats, away_feats, h2h_df, elo_df, table_df], axis=1)

    # Diferentiale home minus away
    for w in WINDOWS:
        X[f"diff_pts_{w}"]  = X[f"h_pts_{w}"]  - X[f"a_pts_{w}"]
        X[f"diff_gd_{w}"]   = X[f"h_gd_{w}"]   - X[f"a_gd_{w}"]
        X[f"diff_win_{w}"]  = X[f"h_win_{w}"]   - X[f"a_win_{w}"]
    X["diff_pts_ewma"] = X["h_pts_ewma"] - X["a_pts_ewma"]
    X["diff_gd_ewma"]  = X["h_gd_ewma"]  - X["a_gd_ewma"]
    X["diff_win_ewma"] = X["h_win_ewma"]  - X["a_win_ewma"]

    X["diff_pts_venue"] = X["h_pts_home5"] - X["a_pts_away5"]
    X["diff_gd_venue"]  = X["h_gd_home5"]  - X["a_gd_away5"]
    X["diff_win_venue"] = X["h_win_home5"]  - X["a_win_away5"]
    X["diff_gf_venue"]  = X["h_gf_home5"]  - X["a_gf_away5"]
    X["diff_ga_venue"]  = X["h_ga_home5"]  - X["a_ga_away5"]

    # ─── NOU: Diferential oboseala ───
    X["diff_days_rest"]  = X["h_days_since_last"] - X["a_days_since_last"]

    # Elo ratio (nu doar diferenta)
    X["elo_ratio"] = X["h_elo"] / (X["a_elo"] + 1e-6)

    X["league_id"] = data["league_id"].values

    # Filtru cold-start
    valid = (X["h_match_count"] >= MIN_MATCHES) & (X["a_match_count"] >= MIN_MATCHES)
    X = X[valid].fillna(0)
    y = data.loc[valid, "FTR"]
    print(f"    Meciuri cu istoric complet: {len(X)}")
    return X, y


# ─────────────────────────────────────────────────────────
# 8. ANTRENARE MODEL
# ─────────────────────────────────────────────────────────
def train_model(X, y):
    print(">>> Antrenez XGBoost (split TEMPORAL)...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    split = int(len(X) * 0.80)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y_enc[:split], y_enc[split:]
    print(f"    Train: {len(X_train)} meciuri | Test: {len(X_test)} meciuri")

    # ─── NOU: Sample weights — meciuri mai recente conteaza mai mult ───
    n = len(X_train)
    recency_weights = np.linspace(0.5, 1.5, n)  # crestere liniara de la 0.5 la 1.5

    # Ponderi clase (draws sunt mai greu de prezis)
    class_counts = np.bincount(y_train)
    total = len(y_train)
    class_weights = {i: total / (len(class_counts) * c) for i, c in enumerate(class_counts)}
    class_w_arr = np.array([class_weights[yi] for yi in y_train])

    # Combinam recency + class weights
    sample_weights = recency_weights * class_w_arr

    model = XGBClassifier(
        n_estimators=1500,
        max_depth=4,           # mai mic = mai putin overfit
        learning_rate=0.03,    # mai mic = mai stabil
        subsample=0.8,
        colsample_bytree=0.8,
        colsample_bylevel=0.8,
        min_child_weight=10,   # mai mare = mai conservator
        gamma=0.2,
        reg_alpha=0.3,
        reg_lambda=3.0,
        eval_metric="mlogloss",
        early_stopping_rounds=150,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(
        X_train, y_train,
        sample_weight=sample_weights,
        eval_set=[(X_test, y_test)],
        verbose=100,
    )

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n>>> Acuratete model (test temporal): {acc * 100:.2f}%")
    print("\n>>> Raport detaliat:")
    print(classification_report(y_test, preds, target_names=le.classes_))

    return model, le


# ─────────────────────────────────────────────────────────
# 9. TEAM STATS
# ─────────────────────────────────────────────────────────
def build_team_stats(long_df, elo_ratings):
    exclude = {"match_idx", "Date", "team", "row_id",
               "gf", "ga", "gd", "is_home", "pts", "win", "draw", "loss",
               "btts", "over25", "clean_sheet"}
    stat_cols = [c for c in long_df.columns if c not in exclude]

    latest = (long_df.sort_values(["team", "Date"])
                     .groupby("team")
                     .last()
                     .reset_index())
    team_stats = {}
    for _, row in latest.iterrows():
        t = row["team"]
        team_stats[t] = {c: float(row[c]) for c in stat_cols}
        team_stats[t]["elo"] = float(elo_ratings.get(t, ELO_BASE))
    return team_stats


# ─────────────────────────────────────────────────────────
# 10. MAIN
# ─────────────────────────────────────────────────────────
def main():
    data                    = load_data()
    data                    = preprocess(data)
    long_df                 = build_rolling_features(data)
    h2h_df                  = build_h2h_features(data)
    elo_df, elo_ratings     = build_elo_features(data)
    table_df                = build_table_position(data)
    X, y                    = assemble_and_filter(data, long_df, h2h_df, elo_df, table_df)
    model, le               = train_model(X, y)
    team_stats              = build_team_stats(long_df, elo_ratings)

    print(">>> Salvez modelul...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "model":         model,
            "features":      list(X.columns),
            "team_stats":    team_stats,
            "label_encoder": le,
            "elo_ratings":   elo_ratings,
        }, f)
    print(">>> Model salvat cu succes!")


if __name__ == "__main__":
    main()