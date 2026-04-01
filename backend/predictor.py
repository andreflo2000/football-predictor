"""
FLOPI SAN — Modul predicție AI
Folosit de main.py pentru a prezice rezultatele meciurilor
"""

import numpy as np
import joblib
import os

# ─────────────────────────────────────────────
# Încărcăm modelul (o singură dată la pornire)
# ─────────────────────────────────────────────
MODEL_PATH = "models/trained_model.pkl"
ENCODER_PATH = "models/label_encoder.pkl"
FEATURES_PATH = "models/features_list.pkl"
STATS_PATH = "models/team_stats.pkl"

_model = None
_le = None
_features = None
_team_stats = None


def load_model():
    """Încărcăm modelul în memorie."""
    global _model, _le, _features, _team_stats

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "❌ Modelul nu există! Rulează mai întâi: python train.py"
        )

    _model = joblib.load(MODEL_PATH)
    _le = joblib.load(ENCODER_PATH)
    _features = joblib.load(FEATURES_PATH)
    _team_stats = joblib.load(STATS_PATH)
    print("✅ Model AI încărcat cu succes!")


def _get_team_stats(team, n=6):
    """
    Returnează statisticile recente ale unei echipe.
    Dacă echipa nu e în baza noastră de date, folosim valori medii.
    """
    if _team_stats is None or team not in _team_stats or len(_team_stats[team]) == 0:
        return 0.40, 1.2, 1.1  # forma medie, goluri marcate, goluri primite

    recent = _team_stats[team][-n:]
    pts = sum(r[1] for r in recent)
    max_pts = len(recent) * 3
    form = pts / max_pts if max_pts > 0 else 0.40
    avg_scored = float(np.mean([r[2] for r in recent]))
    avg_conceded = float(np.mean([r[3] for r in recent]))
    return form, avg_scored, avg_conceded


def _get_tournament_weight(tournament: str) -> int:
    """Importanța meciului (1=amical, 2=calificări, 3=turneu final)."""
    t = str(tournament)
    if "World Cup" in t and "qualification" not in t: return 3
    if "UEFA Euro" in t and "qualification" not in t: return 3
    if "Copa América" in t: return 3
    if "qualification" in t: return 2
    if "Nations League" in t: return 2
    if "Friendly" in t: return 1
    return 2


def predict_match(
    home_team: str,
    away_team: str,
    neutral: bool = False,
    tournament: str = "Friendly"
) -> dict:
    """
    Prezice rezultatul unui meci.

    Parametri:
        home_team  - numele echipei gazdă (ex: "Romania")
        away_team  - numele echipei oaspete (ex: "France")
        neutral    - True dacă meciul e pe teren neutru
        tournament - tipul competiției (ex: "FIFA World Cup", "Friendly")

    Returnează:
        {
            "home_win": 0.45,    # probabilitate victorie gazdă
            "draw": 0.25,        # probabilitate egal
            "away_win": 0.30,    # probabilitate victorie oaspete
            "prediction": "H",  # rezultatul cel mai probabil
            "confidence": 0.45   # cât de sigur e modelul
            "home_team": "Romania",
            "away_team": "France",
            "home_form": 0.55,
            "away_form": 0.70
        }
    """
    if _model is None:
        load_model()

    # Obținem statisticile fiecărei echipe
    hf, hgs, hgc = _get_team_stats(home_team)
    af, ags, agc = _get_team_stats(away_team)

    t_weight = _get_tournament_weight(tournament)
    neutral_int = int(neutral)
    form_diff = hf - af
    attack_vs_defense = hgs - agc
    away_attack_vs_defense = ags - hgc

    # Construim vectorul de features (EXACT în ordinea din antrenare)
    X = np.array([[
        hf, af,
        hgs, hgc,
        ags, agc,
        neutral_int, t_weight,
        form_diff, attack_vs_defense, away_attack_vs_defense
    ]])

    # Predicție
    proba = _model.predict_proba(X)[0]
    classes = _le.classes_  # ['A', 'D', 'H']

    prob_map = {c: round(float(p), 3) for c, p in zip(classes, proba)}
    best_class = classes[np.argmax(proba)]
    confidence = float(np.max(proba))

    # Mapăm H/D/A la ceva mai ușor de înțeles
    label_map = {"H": "Victorie gazdă", "D": "Egal", "A": "Victorie oaspete"}

    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_win": prob_map.get("H", 0.0),
        "draw": prob_map.get("D", 0.0),
        "away_win": prob_map.get("A", 0.0),
        "prediction": best_class,
        "prediction_label": label_map.get(best_class, "Necunoscut"),
        "confidence": round(confidence, 3),
        "home_form": round(hf, 3),
        "away_form": round(af, 3),
        "home_goals_avg": round(hgs, 2),
        "away_goals_avg": round(ags, 2),
    }


def get_known_teams() -> list:
    """Returnează lista tuturor echipelor cunoscute de model."""
    if _team_stats is None:
        load_model()
    return sorted(_team_stats.keys())
