"""
FLOPI SAN - Modul predictie AI
Folosit de main.py pentru a prezice rezultatele meciurilor
"""

import numpy as np
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")

_model = None
_features = None
_team_stats = None


def load_model():
    global _model, _features, _team_stats

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Modelul nu exista! Ruleaza mai intai: python train.py (cautat la: {MODEL_PATH})"
        )

    data = joblib.load(MODEL_PATH)
    _model = data["model"]
    _features = data["features"]
    _team_stats = data.get("team_stats", {})
    print(f"Model AI incarcat cu succes din {MODEL_PATH}!")


def _get_team_stats(team, n=6):
    if _team_stats is None or team not in _team_stats or len(_team_stats[team]) == 0:
        return 0.40, 1.2, 1.1
    recent = _team_stats[team][-n:]
    pts = sum(r[3] for r in recent)
    max_pts = len(recent) * 3
    form = pts / max_pts if max_pts > 0 else 0.40
    avg_scored = float(np.mean([r[1] for r in recent]))
    avg_conceded = float(np.mean([r[2] for r in recent]))
    return form, avg_scored, avg_conceded


def predict_match(
    home_team: str,
    away_team: str,
    neutral: bool = False,
    tournament: str = "Friendly"
) -> dict:
    if _model is None:
        load_model()

    hf, hgs, hgc = _get_team_stats(home_team)
    af, ags, agc = _get_team_stats(away_team)

    wr_diff = hf - af
    scored_diff = hgs - ags
    conceded_diff = hgc - agc

    X = np.array([[hf, hgs, hgc, af, ags, agc, wr_diff, scored_diff, conceded_diff]])

    proba = _model.predict_proba(X)[0]
    classes = _model.classes_
    prob_map = {c: round(float(p), 3) for c, p in zip(classes, proba)}
    best_class = classes[np.argmax(proba)]
    confidence = float(np.max(proba))

    label_map = {"H": "Victorie gazda", "D": "Egal", "A": "Victorie oaspete"}

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
    if _team_stats is None:
        load_model()
    return sorted(_team_stats.keys())