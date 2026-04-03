import os
import glob
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

print(">>> Incarc toate fisierele CSV club...")

# ── 1. Calea catre folderul cu CSV-uri ──────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FOLDER = os.path.join(BASE_DIR, "data", "csv", "club")
all_files = glob.glob(os.path.join(CSV_FOLDER, "**", "*.csv"), recursive=True) + \
            glob.glob(os.path.join(CSV_FOLDER, "*.csv"))
all_files = list(set(all_files))
print(f"    Gasit {len(all_files)} fisiere CSV.")

# ── 2. Combinare ─────────────────────────────────────────────────────────────
COLS_NEEDED = ["Div", "Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
frames = []
skipped = 0
for fpath in all_files:
    try:
        df = pd.read_csv(fpath, encoding="utf-8-sig", errors="ignore", sep=\t")
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

print(f"    Fisiere incarcate cu succes: {len(frames)}")
print(f"    Fisiere sarite (fara coloane necesare): {skipped}")

if len(frames) == 0:
    raise ValueError(f"Niciun CSV valid gasit! Verificati coloanele. Sarite: {skipped}/{len(all_files)}")

data = pd.concat(frames, ignore_index=True)
print(f"    Total meciuri combinate: {len(data)}")

# ── 3. Curatare si sortare dupa data ─────────────────────────────────────────
data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
data = data.dropna(subset=["Date"])
data = data.sort_values("Date").reset_index(drop=True)
data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce").fillna(0).astype(int)
data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce").fillna(0).astype(int)

print(f"    Meciuri dupa curatare: {len(data)}")
print(f"    Perioada: {data['Date'].min().date()} -> {data['Date'].max().date()}")

# ── 4. Calculare forma echipe (ultimele 5 meciuri) ───────────────────────────
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

def update_history(team, date, goals_scored, goals_conceded, won):
    pts = 3 if won == "W" else (1 if won == "D" else 0)
    if team not in team_history:
        team_history[team] = []
    team_history[team].append((date, goals_scored, goals_conceded, pts))

home_wr, home_gs, home_gc = [], [], []
away_wr, away_gs, away_gc = [], [], []

for _, row in data.iterrows():
    h, a = row["HomeTeam"], row["AwayTeam"]
    d = row["Date"]
    fthg, ftag = row["FTHG"], row["FTAG"]
    ftr = row["FTR"]

    hwr, hgs, hgc = get_form(h, d)
    awr, ags, agc = get_form(a, d)

    home_wr.append(hwr); home_gs.append(hgs); home_gc.append(hgc)
    away_wr.append(awr); away_gs.append(ags); away_gc.append(agc)

    update_history(h, d, fthg, ftag, "W" if ftr == "H" else ("D" if ftr == "D" else "L"))
    update_history(a, d, ftag, fthg, "W" if ftr == "A" else ("D" if ftr == "D" else "L"))

data["home_win_rate"] = home_wr
data["home_avg_scored"] = home_gs
data["home_avg_conceded"] = home_gc
data["away_win_rate"] = away_wr
data["away_avg_scored"] = away_gs
data["away_avg_conceded"] = away_gc

data["wr_diff"] = data["home_win_rate"] - data["away_win_rate"]
data["scored_diff"] = data["home_avg_scored"] - data["away_avg_scored"]
data["conceded_diff"] = data["home_avg_conceded"] - data["away_avg_conceded"]

# ── 5. Pregatire date pentru antrenament ─────────────────────────────────────
FEATURES = [
    "home_win_rate", "home_avg_scored", "home_avg_conceded",
    "away_win_rate", "away_avg_scored", "away_avg_conceded",
    "wr_diff", "scored_diff", "conceded_diff"
]

X = data[FEATURES]
y = data["FTR"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 6. Antrenament ───────────────────────────────────────────────────────────
print(">>> Antrenez modelul...")
model = GradientBoostingClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=4,
    subsample=0.8,
    random_state=42
)
model.fit(X_train, y_train)

acc = accuracy_score(y_test, model.predict(X_test))
print(f">>> Acuratete model: {acc*100:.2f}%")

# ── 7. Salvare model ─────────────────────────────────────────────────────────
model_path = os.path.join(BASE_DIR, "model.pkl")
joblib.dump({"model": model, "features": FEATURES}, model_path)
print(f">>> Model salvat la: {model_path}")
