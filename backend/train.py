import os
import glob
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

print(">>> Incarc toate fisierele CSV club...")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FOLDER = os.path.join(BASE_DIR, "data", "csv", "club")
all_files = glob.glob(os.path.join(CSV_FOLDER, "**", "*.csv"), recursive=True) + \
            glob.glob(os.path.join(CSV_FOLDER, "*.csv"))
all_files = list(set(all_files))
print(f"    Gasit {len(all_files)} fisiere CSV.")

COLS_NEEDED = ["Div", "Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
frames = []
skipped = 0

for fpath in all_files:
    try:
        # Incearca TAB mai intai, apoi virgula
        for sep in ["\t", ",", ";"]:
            try:
                df = pd.read_csv(fpath, encoding="utf-8-sig", sep=sep)
                df.columns = [c.strip().replace('\ufeff', '') for c in df.columns]
                if "HomeTeam" in df.columns and "FTR" in df.columns:
                    break
            except:
                continue
        df.columns = [c.strip().replace('\ufeff', '') for c in df.columns]
        cols_prezente = [c for c in COLS_NEEDED if c in df.columns]
        if "HomeTeam" not in cols_prezente or "FTR" not in cols_prezente:
            skipped += 1
            continue
        df = df[cols_prezente]
        df = df.dropna(subset=["HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"])
        df = df[df["FTR"].isin(["H", "D", "A"])]
        if len(df) > 0:
            frames.append(df)
        else:
            skipped += 1
    except Exception as e:
        skipped += 1

print(f"    Fisiere incarcate: {len(frames)}")
print(f"    Fisiere sarite: {skipped}")

if len(frames) == 0:
    raise ValueError("Niciun CSV valid gasit!")

data = pd.concat(frames, ignore_index=True)
print(f"    Total meciuri: {len(data)}")

data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
data = data.dropna(subset=["Date"])
data = data.sort_values("Date").reset_index(drop=True)
data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce").fillna(0).astype(int)
data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce").fillna(0).astype(int)

print(f"    Meciuri dupa curatare: {len(data)}")
print(f"    Perioada: {data['Date'].min().date()} -> {data['Date'].max().date()}")

print(">>> Calculez forma echipelor...")

team_history = {}

def get_form(team, before_date, n=5):
    history = team_history.get(team, [])
    past = [(d, gs, gc, pts) for d, gs, gc, pts in history if d < before_date]
    past = past[-n:]
    if len(past) == 0:
        return 0.4, 1.2, 1.2
    win_rate = sum(pts for _, _, _, pts in past) / (len(past) * 3)
    avg_scored = np.mean([gs for _, gs, _, _ in past])
    avg_conceded = np.mean([gc for _, _, gc, _ in past])
    return win_rate, avg_scored, avg_conceded

def update_history(team, date, goals_scored, goals_conceded, result):
    pts = 3 if result == "W" else (1 if result == "D" else 0)
    if team not in team_history:
        team_history[team] = []
    team_history[team].append((date, goals_scored, goals_conceded, pts))

home_wr, home_gs, home_gc = [], [], []
away_wr, away_gs, away_gc = [], [], []
home_form3, away_form3 = [], []
goal_diff_home, goal_diff_away = [], []

for _, row in data.iterrows():
    h, a = row["HomeTeam"], row["AwayTeam"]
    d = row["Date"]
    fthg, ftag = row["FTHG"], row["FTAG"]
    ftr = row["FTR"]

    hwr, hgs, hgc = get_form(h, d, n=5)
    awr, ags, agc = get_form(a, d, n=5)
    hwr3, hgs3, hgc3 = get_form(h, d, n=3)
    awr3, ags3, agc3 = get_form(a, d, n=3)

    home_wr.append(hwr); home_gs.append(hgs); home_gc.append(hgc)
    away_wr.append(awr); away_gs.append(ags); away_gc.append(agc)
    home_form3.append(hwr3)
    away_form3.append(awr3)
    goal_diff_home.append(hgs - hgc)
    goal_diff_away.append(ags - agc)

    update_history(h, d, fthg, ftag, "W" if ftr=="H" else ("D" if ftr=="D" else "L"))
    update_history(a, d, ftag, fthg, "W" if ftr=="A" else ("D" if ftr=="D" else "L"))

data["home_win_rate"] = home_wr
data["home_avg_scored"] = home_gs
data["home_avg_conceded"] = home_gc
data["away_win_rate"] = away_wr
data["away_avg_scored"] = away_gs
data["away_avg_conceded"] = away_gc
data["home_form3"] = home_form3
data["away_form3"] = away_form3
data["home_goal_diff"] = goal_diff_home
data["away_goal_diff"] = goal_diff_away
data["wr_diff"] = data["home_win_rate"] - data["away_win_rate"]
data["scored_diff"] = data["home_avg_scored"] - data["away_avg_scored"]
data["conceded_diff"] = data["home_avg_conceded"] - data["away_avg_conceded"]
data["form3_diff"] = data["home_form3"] - data["away_form3"]
data["goal_diff_diff"] = data["home_goal_diff"] - data["away_goal_diff"]
data["attack_vs_defense"] = data["home_avg_scored"] - data["away_avg_conceded"]
data["away_attack_vs_defense"] = data["away_avg_scored"] - data["home_avg_conceded"]

FEATURES = [
    "home_win_rate", "home_avg_scored", "home_avg_conceded",
    "away_win_rate", "away_avg_scored", "away_avg_conceded",
    "home_form3", "away_form3",
    "home_goal_diff", "away_goal_diff",
    "wr_diff", "scored_diff", "conceded_diff",
    "form3_diff", "goal_diff_diff",
    "attack_vs_defense", "away_attack_vs_defense",
]

X = data[FEATURES]
y = data["FTR"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(">>> Antrenez modelul...")
model = GradientBoostingClassifier(
    n_estimators=500,
    learning_rate=0.05,
    max_depth=5,
    subsample=0.8,
    min_samples_leaf=20,
    random_state=42
)
model.fit(X_train, y_train)

acc = accuracy_score(y_test, model.predict(X_test))
print(f">>> Acuratete model: {acc*100:.2f}%")

model_path = os.path.join(BASE_DIR, "model.pkl")
joblib.dump({"model": model, "features": FEATURES, "team_stats": team_history}, model_path)
print(f">>> Model salvat la: {model_path}")