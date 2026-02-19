"""
Modelul principal de predicție:
- Elo ratings (librăria `elo` sau calcul manual)
- xG din FBref scraping
- Formă recentă (ultimele 5 meciuri ponderate exponențial)
- XGBoost pentru clasificare 1X2
- Distribuție Poisson pentru scor exact
"""

import numpy as np
import pandas as pd
from scipy.stats import poisson
from scipy.optimize import minimize
import math
import json
import os
from typing import Optional

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# ─────────────────────────────────────────────
# ELO ENGINE
# ─────────────────────────────────────────────

class EloEngine:
    """
    Elo rating system adaptat pentru fotbal.
    K-factor variabil: meciuri importante = K mai mare.
    """
    BASE_RATING = 1500
    K_BASE = 32
    HOME_ADVANTAGE = 100  # puncte bonus pentru gazdă

    def __init__(self):
        self.ratings: dict[str, float] = {}

    def get_rating(self, team: str) -> float:
        return self.ratings.get(team, self.BASE_RATING)

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Probabilitate așteptată de victorie pentru echipa A."""
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    def update(self, home: str, away: str, result: str, k_factor: float = None):
        """
        Actualizează ratingurile după un meci.
        result: '1' (victorie gazdă), 'X' (egal), '2' (victorie oaspete)
        """
        k = k_factor or self.K_BASE
        ra = self.get_rating(home) + self.HOME_ADVANTAGE
        rb = self.get_rating(away)

        ea = self.expected_score(ra, rb)
        eb = 1 - ea

        score_map = {'1': (1, 0), 'X': (0.5, 0.5), '2': (0, 1)}
        sa, sb = score_map.get(result, (0.5, 0.5))

        self.ratings[home] = self.get_rating(home) + k * (sa - ea)
        self.ratings[away] = self.get_rating(away) + k * (sb - eb)

    def predict_probabilities(self, home: str, away: str) -> dict:
        """Calculează prob. 1X2 bazat pe diferența Elo."""
        ra = self.get_rating(home) + self.HOME_ADVANTAGE
        rb = self.get_rating(away)

        p_home = self.expected_score(ra, rb)
        # Distribuție empirică pentru egal (aprox. 10-30% în fotbal)
        draw_prob = _estimate_draw_probability(ra, rb)
        p_away = 1 - p_home - draw_prob

        return {
            "home_win": max(0, p_home),
            "draw": max(0, draw_prob),
            "away_win": max(0, p_away),
            "home_elo": self.get_rating(home),
            "away_elo": self.get_rating(away),
        }

    def bulk_update_from_history(self, matches: list[dict]):
        """Antrenează Elo pe istoricul meciurilor."""
        for m in sorted(matches, key=lambda x: x.get('date', '')):
            self.update(m['home'], m['away'], m['result'])


def _estimate_draw_probability(ra: float, rb: float) -> float:
    """
    Model empiric pentru probabilitatea de egal.
    Egala e mai probabilă când echipele sunt apropiate în rating.
    """
    diff = abs(ra - rb)
    base_draw = 0.26
    # Scade exponențial cu diferența de rating
    return base_draw * math.exp(-diff / 600)


# ─────────────────────────────────────────────
# FORM ANALYZER
# ─────────────────────────────────────────────

class FormAnalyzer:
    """
    Analizează forma recentă a echipelor.
    Ponderare exponențială: meciuri recente contează mai mult.
    """
    DECAY = 0.85  # factor de decădere per meci (cel mai recent = 1.0)

    def calculate_form_score(self, last_5_results: list[str]) -> float:
        """
        Primește lista rezultatelor recente (cel mai recent primul).
        W=3, D=1, L=0 cu ponderare exponențială.
        Returnează scor normalizat [0, 1].
        """
        if not last_5_results:
            return 0.5

        point_map = {'W': 3, 'D': 1, 'L': 0}
        total_weight = 0
        weighted_score = 0

        for i, result in enumerate(last_5_results[:5]):
            weight = self.DECAY ** i
            points = point_map.get(result.upper(), 1)
            weighted_score += points * weight
            total_weight += 3 * weight  # maxim posibil

        return weighted_score / total_weight if total_weight > 0 else 0.5

    def calculate_xg_form(self, last_5_xg_for: list[float], last_5_xg_against: list[float]) -> dict:
        """Calculează xG mediu ponderat pe ultimele 5 meciuri."""
        if not last_5_xg_for:
            return {"xg_for": 1.5, "xg_against": 1.2}

        weights = [self.DECAY ** i for i in range(len(last_5_xg_for))]
        total_w = sum(weights)

        xg_for = sum(x * w for x, w in zip(last_5_xg_for, weights)) / total_w
        xg_against = sum(x * w for x, w in zip(last_5_xg_against, weights)) / total_w

        return {"xg_for": round(xg_for, 3), "xg_against": round(xg_against, 3)}


# ─────────────────────────────────────────────
# POISSON MODEL
# ─────────────────────────────────────────────

class PoissonModel:
    """
    Model Dixon-Coles ajustat pentru predicții de scor.
    Calculează probabilitatea fiecărui scor posibil.
    """

    def __init__(self):
        self.avg_goals_home = 1.52  # medie Premier League
        self.avg_goals_away = 1.18

    def tau(self, x, y, lambda_, mu, rho):
        """Corecție Dixon-Coles pentru scoruri mici (0-0, 1-0, 0-1, 1-1)."""
        if x == 0 and y == 0:
            return 1 - lambda_ * mu * rho
        elif x == 0 and y == 1:
            return 1 + lambda_ * rho
        elif x == 1 and y == 0:
            return 1 + mu * rho
        elif x == 1 and y == 1:
            return 1 - rho
        return 1

    def score_matrix(
        self,
        lambda_: float,  # gol așteptat gazdă
        mu: float,       # gol așteptat oaspete
        rho: float = -0.13,  # coeficient corecție (negativ = corelație negativă)
        max_goals: int = 8
    ) -> np.ndarray:
        """Returnează matrice de probabilități pentru scoruri [home_goals x away_goals]."""
        matrix = np.zeros((max_goals, max_goals))
        for i in range(max_goals):
            for j in range(max_goals):
                matrix[i][j] = (
                    self.tau(i, j, lambda_, mu, rho)
                    * poisson.pmf(i, lambda_)
                    * poisson.pmf(j, mu)
                )
        # Normalizare
        matrix /= matrix.sum()
        return matrix

    def predict(self, lambda_: float, mu: float) -> dict:
        """Predicție completă cu scor exact și 1X2."""
        matrix = self.score_matrix(lambda_, mu)

        p_home = float(np.tril(matrix, -1).sum())
        p_draw = float(np.trace(matrix))
        p_away = float(np.triu(matrix, 1).sum())

        # Top 10 scoruri cele mai probabile
        scores = []
        for i in range(8):
            for j in range(8):
                scores.append({
                    "score": f"{i}:{j}",
                    "home_goals": i,
                    "away_goals": j,
                    "probability": round(float(matrix[i][j]) * 100, 2)
                })
        scores.sort(key=lambda x: x["probability"], reverse=True)

        return {
            "home_win": round(p_home * 100, 2),
            "draw": round(p_draw * 100, 2),
            "away_win": round(p_away * 100, 2),
            "top_scores": scores[:10],
            "expected_home_goals": round(lambda_, 2),
            "expected_away_goals": round(mu, 2),
        }


# ─────────────────────────────────────────────
# XGBOOST CLASSIFIER
# ─────────────────────────────────────────────

class XGBoostPredictor:
    """
    Clasificator XGBoost care combină toate feature-urile.
    În producție: antrenat pe date istorice reale.
    Pentru demo: model pre-antrenat pe date sintetice.
    """

    def __init__(self):
        self.model = None
        self.feature_names = [
            "home_elo", "away_elo", "elo_diff",
            "home_xg_for", "home_xg_against",
            "away_xg_for", "away_xg_against",
            "home_form", "away_form",
            "home_goals_avg", "away_goals_avg",
            "h2h_home_wins", "h2h_draws", "h2h_away_wins",
        ]
        self._load_or_train()

    def _load_or_train(self):
        """Încarcă modelul salvat sau antrenează pe date sintetice."""
        model_path = os.path.join(os.path.dirname(__file__), "saved_model.json")

        if os.path.exists(model_path) and XGBOOST_AVAILABLE:
            self.model = xgb.XGBClassifier()
            self.model.load_model(model_path)
        elif XGBOOST_AVAILABLE:
            self._train_on_synthetic_data()
        else:
            self.model = None

    def _train_on_synthetic_data(self):
        """
        Antrenament pe date sintetice cu pattern-uri realiste.
        În producție, înlocuiți cu date reale din football-data.org.
        """
        np.random.seed(42)
        n = 5000

        # Generare feature-uri sintetice
        home_elo = np.random.normal(1500, 150, n)
        away_elo = np.random.normal(1500, 150, n)
        elo_diff = home_elo - away_elo + 100  # home advantage

        home_xg_for = np.random.gamma(2, 0.8, n)
        home_xg_against = np.random.gamma(1.5, 0.8, n)
        away_xg_for = np.random.gamma(1.5, 0.8, n)
        away_xg_against = np.random.gamma(1.8, 0.8, n)

        home_form = np.random.beta(3, 2, n)
        away_form = np.random.beta(2, 3, n)

        home_goals_avg = home_xg_for * 0.9 + np.random.normal(0, 0.2, n)
        away_goals_avg = away_xg_for * 0.9 + np.random.normal(0, 0.2, n)

        h2h_home = np.random.randint(0, 6, n)
        h2h_draws = np.random.randint(0, 4, n)
        h2h_away = np.random.randint(0, 6, n)

        X = np.column_stack([
            home_elo, away_elo, elo_diff,
            home_xg_for, home_xg_against,
            away_xg_for, away_xg_against,
            home_form, away_form,
            home_goals_avg, away_goals_avg,
            h2h_home, h2h_draws, h2h_away,
        ])

        # Label-uri bazate pe logică realistă
        logit_home = 0.003 * elo_diff + 0.4 * (home_xg_for - away_xg_against) + 0.6 * home_form - 0.4 * away_form
        p_home = 1 / (1 + np.exp(-logit_home))
        rand = np.random.random(n)
        y = np.where(rand < p_home, 0, np.where(rand < p_home + 0.26, 1, 2))  # 0=H, 1=D, 2=A

        if XGBOOST_AVAILABLE:
            self.model = xgb.XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                use_label_encoder=False,
                eval_metric='mlogloss',
                random_state=42
            )
            self.model.fit(X, y)

            # Salvare model
            model_path = os.path.join(os.path.dirname(__file__), "saved_model.json")
            try:
                self.model.save_model(model_path)
            except:
                pass

    def predict_proba(self, features: dict) -> dict:
        """Predicție probabilități 1X2 din feature-uri."""
        if self.model is None or not XGBOOST_AVAILABLE:
            return None  # Fallback la Poisson

        X = np.array([[
            features.get("home_elo", 1500),
            features.get("away_elo", 1500),
            features.get("elo_diff", 0),
            features.get("home_xg_for", 1.5),
            features.get("home_xg_against", 1.2),
            features.get("away_xg_for", 1.2),
            features.get("away_xg_against", 1.5),
            features.get("home_form", 0.5),
            features.get("away_form", 0.5),
            features.get("home_goals_avg", 1.5),
            features.get("away_goals_avg", 1.2),
            features.get("h2h_home_wins", 2),
            features.get("h2h_draws", 2),
            features.get("h2h_away_wins", 2),
        ]])

        proba = self.model.predict_proba(X)[0]
        return {
            "home_win": round(float(proba[0]) * 100, 2),
            "draw": round(float(proba[1]) * 100, 2),
            "away_win": round(float(proba[2]) * 100, 2),
            "method": "XGBoost",
        }


# ─────────────────────────────────────────────
# MAIN PREDICTOR
# ─────────────────────────────────────────────

class FootballPredictor:
    """
    Orchestrează toate modelele și returnează predicția finală.
    """

    def __init__(self):
        self.elo = EloEngine()
        self.form = FormAnalyzer()
        self.poisson = PoissonModel()
        self.xgb_model = XGBoostPredictor()
        self.model_loaded = True
        self.demo_mode = not XGBOOST_AVAILABLE

        # Pre-seed cu ratinguri Elo realiste
        self._seed_elo_ratings()

    def _seed_elo_ratings(self):
        """Ratinguri Elo inițiale bazate pe performanța istorică."""
        seed_ratings = {
            # Premier League
            "Manchester City": 1820, "Arsenal": 1760, "Liverpool": 1790,
            "Chelsea": 1710, "Manchester United": 1680, "Tottenham": 1660,
            "Newcastle": 1640, "Aston Villa": 1630, "Brighton": 1610,
            "West Ham": 1580,
            # La Liga
            "Real Madrid": 1870, "Barcelona": 1830, "Atletico Madrid": 1750,
            "Sevilla": 1680, "Real Sociedad": 1640,
            # Serie A
            "Inter": 1780, "AC Milan": 1740, "Juventus": 1720,
            "Napoli": 1700, "Lazio": 1650,
            # Bundesliga
            "Bayern Munich": 1860, "Borussia Dortmund": 1760,
            "RB Leipzig": 1720, "Bayer Leverkusen": 1750,
            # Ligue 1
            "PSG": 1850, "Monaco": 1680, "Lyon": 1650, "Marseille": 1640,
        }
        self.elo.ratings.update(seed_ratings)

    async def predict(
        self,
        home_team: str,
        away_team: str,
        league_id: int = 39,
        home_team_id: int = None,
        away_team_id: int = None,
    ) -> dict:
        """Predicție completă integrând toate modelele."""

        from data.fetcher import DataFetcher
        fetcher = DataFetcher()

        # 1. Date echipe
        home_data = await fetcher.get_team_data(home_team, home_team_id, league_id)
        away_data = await fetcher.get_team_data(away_team, away_team_id, league_id)

        # 2. Elo probabilities
        elo_probs = self.elo.predict_probabilities(home_team, away_team)

        # 3. Form scores
        home_form_score = self.form.calculate_form_score(home_data.get("last_5", ["W","W","D","W","L"]))
        away_form_score = self.form.calculate_form_score(away_data.get("last_5", ["D","W","L","D","W"]))

        # 4. xG data
        home_xg = self.form.calculate_xg_form(
            home_data.get("xg_for_history", [1.8, 2.1, 1.5, 1.9, 1.6]),
            home_data.get("xg_against_history", [0.8, 1.1, 0.6, 1.3, 0.9])
        )
        away_xg = self.form.calculate_xg_form(
            away_data.get("xg_for_history", [1.5, 1.2, 1.8, 1.0, 1.6]),
            away_data.get("xg_against_history", [1.0, 0.8, 1.4, 0.7, 1.1])
        )

        # 5. Lambda și Mu pentru Poisson (ajustate pentru home advantage)
        HOME_BOOST = 1.15
        AWAY_PENALTY = 0.90

        lambda_ = (home_xg["xg_for"] + away_xg["xg_against"]) / 2 * HOME_BOOST
        mu = (away_xg["xg_for"] + home_xg["xg_against"]) / 2 * AWAY_PENALTY

        # 6. Poisson score prediction
        poisson_result = self.poisson.predict(lambda_, mu)

        # 7. XGBoost prediction
        features = {
            "home_elo": self.elo.get_rating(home_team),
            "away_elo": self.elo.get_rating(away_team),
            "elo_diff": self.elo.get_rating(home_team) - self.elo.get_rating(away_team),
            "home_xg_for": home_xg["xg_for"],
            "home_xg_against": home_xg["xg_against"],
            "away_xg_for": away_xg["xg_for"],
            "away_xg_against": away_xg["xg_against"],
            "home_form": home_form_score,
            "away_form": away_form_score,
            "home_goals_avg": home_data.get("goals_avg", 1.5),
            "away_goals_avg": away_data.get("goals_avg", 1.2),
            "h2h_home_wins": home_data.get("h2h_home_wins", 3),
            "h2h_draws": home_data.get("h2h_draws", 2),
            "h2h_away_wins": away_data.get("h2h_away_wins", 2),
        }
        xgb_probs = self.xgb_model.predict_proba(features)

        # 8. Ensemble: media ponderată (XGBoost 40%, Poisson 40%, Elo 20%)
        if xgb_probs:
            w_xgb, w_poisson, w_elo = 0.40, 0.40, 0.20
            final_home = w_xgb * xgb_probs["home_win"] + w_poisson * poisson_result["home_win"] + w_elo * elo_probs["home_win"] * 100
            final_draw = w_xgb * xgb_probs["draw"] + w_poisson * poisson_result["draw"] + w_elo * elo_probs["draw"] * 100
            final_away = w_xgb * xgb_probs["away_win"] + w_poisson * poisson_result["away_win"] + w_elo * elo_probs["away_win"] * 100
            method = "XGBoost + Poisson + Elo Ensemble"
        else:
            # Fără XGBoost: Poisson 70% + Elo 30%
            final_home = 0.70 * poisson_result["home_win"] + 0.30 * elo_probs["home_win"] * 100
            final_draw = 0.70 * poisson_result["draw"] + 0.30 * elo_probs["draw"] * 100
            final_away = 0.70 * poisson_result["away_win"] + 0.30 * elo_probs["away_win"] * 100
            method = "Poisson + Elo Ensemble"

        # Normalizare la 100%
        total = final_home + final_draw + final_away
        final_home = round(final_home / total * 100, 2)
        final_draw = round(final_draw / total * 100, 2)
        final_away = round(100 - final_home - final_draw, 2)

        return {
            "match": f"{home_team} vs {away_team}",
            "home_team": home_team,
            "away_team": away_team,
            "prediction": {
                "home_win": final_home,
                "draw": final_draw,
                "away_win": final_away,
                "method": method,
            },
            "top_scores": poisson_result["top_scores"],
            "expected_goals": {
                "home": poisson_result["expected_home_goals"],
                "away": poisson_result["expected_away_goals"],
            },
            "model_breakdown": {
                "elo": {
                    "home_win": round(elo_probs["home_win"] * 100, 2),
                    "draw": round(elo_probs["draw"] * 100, 2),
                    "away_win": round(elo_probs["away_win"] * 100, 2),
                    "home_rating": round(elo_probs["home_elo"], 0),
                    "away_rating": round(elo_probs["away_elo"], 0),
                },
                "poisson": {
                    "home_win": poisson_result["home_win"],
                    "draw": poisson_result["draw"],
                    "away_win": poisson_result["away_win"],
                },
                "xgboost": xgb_probs,
            },
            "team_stats": {
                "home": {
                    "form": home_data.get("last_5", ["W","W","D","W","L"]),
                    "form_score": round(home_form_score * 100, 1),
                    "xg_for": home_xg["xg_for"],
                    "xg_against": home_xg["xg_against"],
                    "elo": round(self.elo.get_rating(home_team), 0),
                },
                "away": {
                    "form": away_data.get("last_5", ["D","W","L","D","W"]),
                    "form_score": round(away_form_score * 100, 1),
                    "xg_for": away_xg["xg_for"],
                    "xg_against": away_xg["xg_against"],
                    "elo": round(self.elo.get_rating(away_team), 0),
                },
            },
        }

    def demo_prediction(self, home_team: str, away_team: str) -> dict:
        """Predicție demo pentru Man City vs Arsenal."""
        return {
            "match": f"{home_team} vs {away_team}",
            "home_team": home_team,
            "away_team": away_team,
            "demo": True,
            "prediction": {
                "home_win": 52.4,
                "draw": 24.1,
                "away_win": 23.5,
                "method": "Demo (Poisson + Elo)",
            },
            "top_scores": [
                {"score": "2:1", "home_goals": 2, "away_goals": 1, "probability": 11.8},
                {"score": "1:1", "home_goals": 1, "away_goals": 1, "probability": 10.2},
                {"score": "2:0", "home_goals": 2, "away_goals": 0, "probability": 9.5},
                {"score": "1:0", "home_goals": 1, "away_goals": 0, "probability": 9.1},
                {"score": "3:1", "home_goals": 3, "away_goals": 1, "probability": 7.3},
                {"score": "0:0", "home_goals": 0, "away_goals": 0, "probability": 6.8},
                {"score": "2:2", "home_goals": 2, "away_goals": 2, "probability": 5.9},
                {"score": "3:0", "home_goals": 3, "away_goals": 0, "probability": 5.4},
                {"score": "1:2", "home_goals": 1, "away_goals": 2, "probability": 4.8},
                {"score": "0:1", "home_goals": 0, "away_goals": 1, "probability": 4.3},
            ],
            "expected_goals": {"home": 1.82, "away": 1.31},
            "model_breakdown": {
                "elo": {"home_win": 55.2, "draw": 22.8, "away_win": 22.0, "home_rating": 1820, "away_rating": 1760},
                "poisson": {"home_win": 50.1, "draw": 25.3, "away_win": 24.6},
                "xgboost": {"home_win": 51.9, "draw": 24.2, "away_win": 23.9, "method": "XGBoost"},
            },
            "team_stats": {
                "home": {"form": ["W","W","W","D","W"], "form_score": 88.5, "xg_for": 1.95, "xg_against": 0.82, "elo": 1820},
                "away": {"form": ["W","D","W","W","L"], "form_score": 74.2, "xg_for": 1.68, "xg_against": 0.95, "elo": 1760},
            },
        }
