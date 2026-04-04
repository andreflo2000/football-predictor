import os
import glob
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib

print(">>> Incarc CSV-uri...")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FOLDER = os.path.join(BASE_DIR, "data", "csv", "club")
all_files = list(set(
    glob.glob(os.path.join(CSV_FOLDER, "**", "*.csv"), recursive=True) +
    glob.glob(os.path.join(CSV_FOLDER, "*.csv"))
))
print(f"    Gasit {len(all_files)} fisiere.")

COLS_NEEDED = ["HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR", "Date"]
frames = []
for fpath in all_files:
    try:
        for sep in ["\t", ",", ";"]:
            try:
                df = pd.read_csv(fpath, encoding="utf-8-sig", sep=sep)
                df.columns = [c.strip().replace('\ufeff', '') for c in df.columns]
                if "HomeTeam" in df.columns and "FTR" in df.columns:
                    break
            except:
                continue
        if "HomeTeam" not in df.columns or "FTR" not in df.columns:
            continue
        cols = [c for c in COLS_NEEDED if c in df.columns]
        df = df[cols].dropna(subset=["HomeTeam", "AwayTeam", "FTR"])
        df = df[df["FTR"].isin(["H", "D", "A"])]
        if len(df) > 0:
            frames.append(df)
    except:
        continue

data = pd.concat(frames, ignore_index=True)
data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce", format="mixed")
data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce").fillna(0).astype(int)
data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce").fillna(0).astype(int)
data = data.dropna(subset=["Date"]).sort_values("Date").reset_index(drop=True)
print(f"    Total meciuri: {len(data)}")

print(">>> Calculez forma...")
team_history = {}

def get_form(team, before_date, n=5):
    hist = [x for x in team_history.get(team, []) if x[0] < before_date][-n:]
    if len(hist) < n:
        return None  # nu avem suficient istoric
    wr = sum(x[3] for x in hist) / (n * 3)
    gs = np.mean([x[1] for x in hist])
    gc = np.mean([x[2] for x in hist])
    return wr, gs, gc, gs - gc

def update_history(team, date, gf, ga, result):
    pts = 3 if result == "W" else (1 if result == "D" else 0)
    team_history.setdefault(team, []).append((date, gf, ga, pts))

rows = []
for _, row in data.iterrows():
    h, a = row["HomeTeam"], row["AwayTeam"]
    d, fthg, ftag, ftr = row["Date"], row["FTHG"], row["FTAG"], row["FTR"]

    hf = get_form(h, d, 5)
    af = get_form(a, d, 5)
    hf3 = get_form(h, d, 3)
    af3 = get_form(a, d, 3)

    # Sarim meciurile fara suficient istoric
    if hf is None or af is None or hf3 is None or af3 is None:
        update_history(h, d, fthg, ftag, "W" if ftr=="H" else ("D" if ftr=="D" else "L"))
        update_history(a, d, ftag, fthg, "W" if ftr=="A" else ("D" if ftr=="D" else "L"))
        continue

    hwr, hgs, hgc, hgd = hf
    awr, ags, agc, agd = af
    hwr3 = hf3[0]
    awr3 = af3[0]

    rows.append({
        "home_win_rate": hwr,
        "home_avg_scored": hgs,
        "home_avg_conceded": hgc,
        "home_gd": hgd,
        "away_win_rate": awr,
        "away_avg_scored": ags,
        "away_avg_conceded": agc,
        "away_gd": agd,
        "home_form3": hwr3,
        "away_form3": awr3,
        "wr_diff": hwr - awr,
        "scored_diff": hgs - ags,
        "conceded_diff": hgc - agc,
        "gd_diff": hgd - agd,
        "form3_diff": hwr3 - awr3,
        "attack_vs_def": hgs - agc,
        "away_attack_vs_def": ags - hgc,
        "home_advantage": 1.0,
        "FTR": ftr
    })

    update_history(h, d, fthg, ftag, "W" if ftr=="H" else ("D" if ftr=="D" else "L"))
    update_history(a, d, ftag, fthg, "W" if ftr=="A" else ("D" if ftr=="D" else "L"))

feat_data = pd.DataFrame(rows)
print(f"    Meciuri cu istoric complet: {len(feat_data)}")

FEATURES = [c for c in feat_data.columns if c != "FTR"]
X = feat_data[FEATURES]

le = LabelEncoder()
y = le.fit_transform(feat_data["FTR"])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(">>> Antrenez XGBoost...")
model = XGBClassifier(
    n_estimators=500,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="mlogloss",
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

acc = accuracy_score(y_test, model.predict(X_test))
print(f">>> Acuratete model: {acc*100:.2f}%")

joblib.dump({"model": model, "features": FEATURES, "team_stats": team_history, "label_encoder": le},
            os.path.join(BASE_DIR, "model.pkl"))
print(">>> Model salvat!")