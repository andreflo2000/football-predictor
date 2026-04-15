"""
FLOPI SAN — Script antrenare model AI
Rulează o singură dată: python train.py
Salvează modelul în models/trained_model.pkl
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

# ─────────────────────────────────────────────
# 1. ÎNCĂRCĂM DATELE
# ─────────────────────────────────────────────
print("📂 Încarc datele CSV...")

df = pd.read_csv("data/csv/results.csv")
df["date"] = pd.to_datetime(df["date"])

# Folosim doar date din 2000 încoace (mai relevante)
df = df[df["date"] >= "2000-01-01"].copy()
df = df.sort_values("date").reset_index(drop=True)

# Adăugăm coloana rezultat: H = câștigă acasă, A = câștigă oaspete, D = egal
df["result"] = df.apply(
    lambda r: "H" if r["home_score"] > r["away_score"]
    else ("A" if r["away_score"] > r["home_score"] else "D"),
    axis=1
)

print(f"✅ {len(df)} meciuri încărcate (2000–2026)")
print(f"   H={len(df[df['result']=='H'])} | D={len(df[df['result']=='D'])} | A={len(df[df['result']=='A'])}")

# ─────────────────────────────────────────────
# 2. CALCULĂM FORMA FIECĂREI ECHIPE
# ─────────────────────────────────────────────
print("\n⚙️  Calculez forma echipelor din istoric...")
print("   (poate dura 1-2 minute, e normal)")

def build_features(df):
    """
    Pentru fiecare meci, calculăm:
    - Forma echipei (câte puncte au luat în ultimele 6 meciuri)
    - Media goluri marcate / primite
    Folosim doar meciurile ÎNAINTE de meciul respectiv (nu trișăm!)
    """
    stats = {}  # team -> [(data, puncte, goluri_marcate, goluri_primite)]

    for col in ["home_form", "away_form", "home_goals_scored",
                "home_goals_conceded", "away_goals_scored", "away_goals_conceded"]:
        df[col] = 0.0

    for idx, row in df.iterrows():
        ht = row["home_team"]
        at = row["away_team"]

        def get_team_stats(team, n=6):
            if team not in stats or len(stats[team]) == 0:
                return 0.33, 1.2, 1.0  # valori default dacă nu avem istoric
            recent = stats[team][-n:]
            pts = sum(r[1] for r in recent)
            max_pts = len(recent) * 3
            form = pts / max_pts if max_pts > 0 else 0.33
            avg_scored = float(np.mean([r[2] for r in recent]))
            avg_conceded = float(np.mean([r[3] for r in recent]))
            return form, avg_scored, avg_conceded

        hf, hgs, hgc = get_team_stats(ht)
        af, ags, agc = get_team_stats(at)

        df.at[idx, "home_form"] = hf
        df.at[idx, "away_form"] = af
        df.at[idx, "home_goals_scored"] = hgs
        df.at[idx, "home_goals_conceded"] = hgc
        df.at[idx, "away_goals_scored"] = ags
        df.at[idx, "away_goals_conceded"] = agc

        # Actualizăm istoricul DUPĂ ce am folosit datele
        hs, as_ = row["home_score"], row["away_score"]
        h_pts = 3 if row["result"] == "H" else (1 if row["result"] == "D" else 0)
        a_pts = 3 if row["result"] == "A" else (1 if row["result"] == "D" else 0)

        if ht not in stats: stats[ht] = []
        if at not in stats: stats[at] = []
        stats[ht].append((row["date"], h_pts, hs, as_))
        stats[at].append((row["date"], a_pts, as_, hs))

    return df, stats

df, team_stats = build_features(df)

# Salvăm statisticile echipelor pentru predicții viitoare
joblib.dump(team_stats, "models/team_stats.pkl")
print("✅ Forma calculată!")

# ─────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────

def get_tournament_weight(t):
    """Meciurile importante contează mai mult."""
    t = str(t)
    if "World Cup" in t and "qualification" not in t: return 3
    if "UEFA Euro" in t and "qualification" not in t: return 3
    if "Copa América" in t: return 3
    if "qualification" in t: return 2
    if "Nations League" in t: return 2
    if "Friendly" in t: return 1
    return 2

df["tournament_weight"] = df["tournament"].apply(get_tournament_weight)
df["neutral"] = df["neutral"].astype(int)

# Features derivate
df["form_diff"] = df["home_form"] - df["away_form"]
df["attack_vs_defense"] = df["home_goals_scored"] - df["away_goals_conceded"]
df["away_attack_vs_defense"] = df["away_goals_scored"] - df["home_goals_conceded"]

# Primele 500 de meciuri le ignorăm (echipele nu au istoric suficient)
df = df.iloc[500:].copy()

FEATURES = [
    "home_form", "away_form",
    "home_goals_scored", "home_goals_conceded",
    "away_goals_scored", "away_goals_conceded",
    "neutral", "tournament_weight",
    "form_diff", "attack_vs_defense", "away_attack_vs_defense"
]

X = df[FEATURES]
le = LabelEncoder()
y = le.fit_transform(df["result"])  # A=0, D=1, H=2

print(f"\n📊 Features pregătite: {X.shape[0]} meciuri, {X.shape[1]} variabile")

# ─────────────────────────────────────────────
# 4. ANTRENĂM MODELUL
# ─────────────────────────────────────────────
print("\n🤖 Antrenez modelul AI...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = GradientBoostingClassifier(
    n_estimators=400,
    max_depth=5,
    learning_rate=0.04,
    subsample=0.8,
    random_state=42
)
model.fit(X_train, y_train)

# ─────────────────────────────────────────────
# 5. EVALUĂM REZULTATELE
# ─────────────────────────────────────────────
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print(f"\n{'='*45}")
print(f"  🎯 ACURATEȚE MODEL: {acc:.2%}")
print(f"{'='*45}")
print("\n📋 Raport detaliat:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

print("\n🔑 Cele mai importante variabile:")
for feat, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    bar = "█" * int(imp * 40)
    print(f"  {feat:<30} {bar} {imp:.3f}")

# ─────────────────────────────────────────────
# 6. SALVĂM MODELUL
# ─────────────────────────────────────────────
os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/trained_model.pkl")
joblib.dump(le, "models/label_encoder.pkl")
joblib.dump(FEATURES, "models/features_list.pkl")

print(f"\n✅ Model salvat în models/trained_model.pkl")
print(f"✅ Label encoder salvat în models/label_encoder.pkl")
print(f"✅ Lista features salvată în models/features_list.pkl")
print(f"✅ Statistici echipe salvate în models/team_stats.pkl")
print("\n🚀 Gata! Acum rulează serverul: uvicorn main:app --reload")
