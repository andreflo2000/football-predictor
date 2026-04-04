import os
import glob
import pickle
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

warnings.filterwarnings("ignore")

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, "data", "csv", "club")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
MIN_MATCHES = 5
WINDOWS     = [3, 5, 10]


# ─────────────────────────────────────────────────────────
# 1. INCARCARE CSV-URI
# ─────────────────────────────────────────────────────────
def load_data():
    print(">>> Incarc CSV-uri...")
    files = glob.glob(os.path.join(DATA_DIR, "**", "*.csv"), recursive=True)
    print(f"    Gasit {len(files)} fisiere.")
    dfs = []
    for f in files:
        for sep in [None, "\t", ","]:
            try:
                df = pd.read_csv(
                    f, sep=sep, engine="python",
                    encoding="utf-8-sig", on_bad_lines="skip"
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
    cols = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
    missing = [c for c in cols if c not in data.columns]
    if missing:
        raise RuntimeError(f"Coloane lipsa: {missing}")
    data = data[cols].copy()
    data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce")
    data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce")
    data["FTR"]  = data["FTR"].astype(str).str.strip()
    data = data.dropna()
    data = data[data["FTR"].isin(["H", "D", "A"])]
    data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
    data = data.dropna(subset=["Date"])
    data = data.sort_values("Date").reset_index(drop=True)
    print(f"    Meciuri valide: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 3. ROLLING FEATURES PER ECHIPA (fara data leakage)
# ─────────────────────────────────────────────────────────
def build_rolling_features(data):
    print(">>> Calculez rolling features per echipa...")

    def side_df(is_home):
        if is_home:
            team, gf, ga = data["HomeTeam"], data["FTHG"], data["FTAG"]
            pts_map = {"H": 3,   "D": 1, "A": 0}
            win_map = {"H": 1.0, "D": 0.0, "A": 0.0}
        else:
            team, gf, ga = data["AwayTeam"], data["FTAG"], data["FTHG"]
            pts_map = {"H": 0,   "D": 1, "A": 3}
            win_map = {"H": 0.0, "D": 0.0, "A": 1.0}
        draw_map = {"H": 0.0, "D": 1.0, "A": 0.0}
        return pd.DataFrame({
            "match_idx": data.index,
            "Date":      data["Date"].values,
            "team":      team.values,
            "gf":        gf.values,
            "ga":        ga.values,
            "gd":        (gf - ga).values,
            "is_home":   int(is_home),
            "pts":       data["FTR"].map(pts_map).values,
            "win":       data["FTR"].map(win_map).values,
            "draw":      data["FTR"].map(draw_map).values,
        })

    long_df = pd.concat([side_df(True), side_df(False)], ignore_index=True)
    long_df["row_id"] = range(len(long_df))
    long_df = long_df.sort_values(["team", "Date", "match_idx"]).reset_index(drop=True)

    roll_cols = ["pts", "gf", "ga", "gd", "win", "draw"]

    # Rolling general (ferestre 3, 5, 10)
    for w in WINDOWS:
        rolled = long_df.groupby("team")[roll_cols].transform(
            lambda x: x.shift(1).rolling(w, min_periods=1).mean()
        )
        for c in roll_cols:
            long_df[f"{c}_{w}"] = rolled[c]

    # Numarul de meciuri jucate (pentru filtru cold-start)
    long_df["match_count"] = long_df.groupby("team").cumcount()

    # Rolling ACASA (ultimele 5 meciuri de acasa)
    home_only = long_df[long_df["is_home"] == 1].sort_values(["team", "Date"]).copy()
    for c in ["pts", "gd", "win"]:
        home_only[f"{c}_home5"] = home_only.groupby("team")[c].transform(
            lambda x: x.shift(1).rolling(5, min_periods=1).mean()
        )
    long_df = long_df.merge(
        home_only[["row_id", "pts_home5", "gd_home5", "win_home5"]],
        on="row_id", how="left"
    )

    # Rolling IN DEPLASARE (ultimele 5 meciuri in deplasare)
    away_only = long_df[long_df["is_home"] == 0].sort_values(["team", "Date"]).copy()
    for c in ["pts", "gd", "win"]:
        away_only[f"{c}_away5"] = away_only.groupby("team")[c].transform(
            lambda x: x.shift(1).rolling(5, min_periods=1).mean()
        )
    long_df = long_df.merge(
        away_only[["row_id", "pts_away5", "gd_away5", "win_away5"]],
        on="row_id", how="left"
    )

    # Fallback: daca nu exista istoric acasa/deplasare, folosim rolling general
    for col, fallback in [
        ("pts_home5", "pts_5"), ("gd_home5", "gd_5"), ("win_home5", "win_5"),
        ("pts_away5", "pts_5"), ("gd_away5", "gd_5"), ("win_away5", "win_5"),
    ]:
        long_df[col] = long_df[col].fillna(long_df[fallback])

    return long_df


# ─────────────────────────────────────────────────────────
# 4. HEAD-TO-HEAD FEATURES
# ─────────────────────────────────────────────────────────
def build_h2h_features(data):
    print(">>> Calculez H2H (meciuri directe)...")
    h2h_hw, h2h_dr, h2h_n = [], [], []
    history = {}

    for _, row in data.iterrows():
        home, away, ftr = row["HomeTeam"], row["AwayTeam"], row["FTR"]
        key    = tuple(sorted([home, away]))
        recent = history.get(key, [])[-5:]

        if not recent:
            # Prior bazat pe avantajul terenului propriu
            h2h_hw.append(0.45)
            h2h_dr.append(0.25)
            h2h_n.append(0)
        else:
            hw = dr = 0
            for r in recent:
                if r["home"] == home:
                    hw += int(r["ftr"] == "H")
                    dr += int(r["ftr"] == "D")
                else:  # echipele erau inversate in meciul respectiv
                    hw += int(r["ftr"] == "A")
                    dr += int(r["ftr"] == "D")
            n = len(recent)
            h2h_hw.append(hw / n)
            h2h_dr.append(dr / n)
            h2h_n.append(n)

        if key not in history:
            history[key] = []
        history[key].append({"home": home, "away": away, "ftr": ftr})

    return pd.DataFrame({
        "h2h_home_win": h2h_hw,
        "h2h_draw":     h2h_dr,
        "h2h_n":        h2h_n,
    }, index=data.index)


# ─────────────────────────────────────────────────────────
# 5. ASAMBLARE MATRICE DE FEATURES
# ─────────────────────────────────────────────────────────
def assemble_and_filter(data, long_df, h2h_df):
    print(">>> Asamblam feature matrix...")

    # Coloanele de features (fara coloanele brute)
    exclude = {"match_idx", "Date", "team", "row_id",
               "gf", "ga", "gd", "is_home", "pts", "win", "draw"}
    feat_cols = [c for c in long_df.columns if c not in exclude]

    home_feats = (long_df[long_df["is_home"] == 1]
                  .set_index("match_idx")[feat_cols]
                  .add_prefix("h_"))
    away_feats = (long_df[long_df["is_home"] == 0]
                  .set_index("match_idx")[feat_cols]
                  .add_prefix("a_"))

    X = pd.concat([home_feats, away_feats, h2h_df], axis=1)

    # Diferentiale (home minus away)
    for w in WINDOWS:
        X[f"diff_pts_{w}"] = X[f"h_pts_{w}"]  - X[f"a_pts_{w}"]
        X[f"diff_gd_{w}"]  = X[f"h_gd_{w}"]   - X[f"a_gd_{w}"]
        X[f"diff_win_{w}"] = X[f"h_win_{w}"]   - X[f"a_win_{w}"]
    # Diferential specific loc (acasa vs deplasare)
    X["diff_pts_venue"] = X["h_pts_home5"] - X["a_pts_away5"]
    X["diff_gd_venue"]  = X["h_gd_home5"]  - X["a_gd_away5"]
    X["diff_win_venue"] = X["h_win_home5"]  - X["a_win_away5"]

    # Filtru cold-start
    valid = (X["h_match_count"] >= MIN_MATCHES) & (X["a_match_count"] >= MIN_MATCHES)
    X = X[valid].fillna(0)
    y = data.loc[valid, "FTR"]
    print(f"    Meciuri cu istoric complet: {len(X)}")
    return X, y


# ─────────────────────────────────────────────────────────
# 6. ANTRENARE MODEL
# ─────────────────────────────────────────────────────────
def train_model(X, y):
    print(">>> Antrenez XGBoost...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = XGBClassifier(
        n_estimators=500,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        gamma=0.1,
        reg_alpha=0.05,
        reg_lambda=1.5,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=100,
    )

    acc = accuracy_score(y_test, model.predict(X_test))
    print(f">>> Acuratete model: {acc * 100:.2f}%")
    return model, le


# ─────────────────────────────────────────────────────────
# 7. TEAM STATS PENTRU PREDICTOR.PY
# ─────────────────────────────────────────────────────────
def build_team_stats(long_df):
    """
    Extrage ultimele statistici disponibile per echipa.
    predictor.py le va folosi pentru a construi feature vector-ul.
    """
    exclude = {"match_idx", "Date", "team", "row_id",
               "gf", "ga", "gd", "is_home", "pts", "win", "draw"}
    stat_cols = [c for c in long_df.columns if c not in exclude]

    latest = (long_df.sort_values(["team", "Date"])
                      .groupby("team")
                      .last()
                      .reset_index())
    team_stats = {}
    for _, row in latest.iterrows():
        team_stats[row["team"]] = {c: float(row[c]) for c in stat_cols}
    return team_stats


# ─────────────────────────────────────────────────────────
# 8. MAIN
# ─────────────────────────────────────────────────────────
def main():
    data       = load_data()
    data       = preprocess(data)
    long_df    = build_rolling_features(data)
    h2h_df     = build_h2h_features(data)
    X, y       = assemble_and_filter(data, long_df, h2h_df)
    model, le  = train_model(X, y)
    team_stats = build_team_stats(long_df)

    print(">>> Salvez modelul...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "model":         model,
            "features":      list(X.columns),
            "team_stats":    team_stats,
            "label_encoder": le,
        }, f)
    print(">>> Model salvat!")


if __name__ == "__main__":
    main()