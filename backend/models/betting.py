"""
Betting Markets Calculator
Calculează probabilități pentru toate tipurile de pariuri din modelul Poisson.
"""

import numpy as np
from scipy.stats import poisson
import math


class BettingCalculator:
    """
    Calculează probabilități pentru 11 tipuri de piețe de pariuri.
    Input: lambda (xG gazdă), mu (xG oaspete), statistici echipe
    """

    def calculate_all_markets(
        self,
        lambda_: float,  # goluri așteptate gazdă (meci întreg)
        mu: float,        # goluri așteptate oaspete (meci întreg)
        home_team: str = "",
        away_team: str = "",
        league_rating: float = 50.0,
    ) -> dict:
        """Returnează toate piețele de pariuri cu probabilități."""

        # Matrice Poisson pentru meci întreg
        matrix = self._score_matrix(lambda_, mu)

        # xG la pauză (aprox 40% din total — golurile sunt ușor mai rare în prima repriză)
        lambda_ht = lambda_ * 0.42
        mu_ht = mu * 0.42
        matrix_ht = self._score_matrix(lambda_ht, mu_ht, max_goals=5)

        # Statistici derivate din rating ligă
        corner_base = self._estimate_corners(lambda_, mu, league_rating)
        card_base = self._estimate_cards(lambda_, mu, league_rating)

        return {
            "match_result": self._market_1x2(matrix),
            "double_chance": self._market_double_chance(matrix),
            "over_under": self._market_over_under(lambda_, mu),
            "btts": self._market_btts(matrix),
            "team_totals": self._market_team_totals(matrix, home_team, away_team),
            "goal_both_halves": self._market_goal_both_halves(lambda_, mu),
            "ht_ft": self._market_ht_ft(matrix, matrix_ht),
            "halftime_goal": self._market_halftime_goal(lambda_ht, mu_ht),
            "halftime_over_under": self._market_halftime_ou(lambda_ht, mu_ht),
            "halftime_result": self._market_1x2(matrix_ht, label="Rezultat pauză"),
            "exact_score": self._market_exact_score(matrix),
            "combo": self._market_combo(matrix, lambda_, mu),
            "corners": self._market_corners(corner_base),
            "cards": self._market_cards(card_base),
            "expected_goals": {
                "home": round(lambda_, 2),
                "away": round(mu, 2),
                "total": round(lambda_ + mu, 2),
                "home_ht": round(lambda_ht, 2),
                "away_ht": round(mu_ht, 2),
            }
        }

    # ─── MATRICE POISSON ─────────────────────────────────────────────────────

    def _score_matrix(self, lam: float, mu: float, max_goals: int = 8) -> np.ndarray:
        """Matrice probabilități scoruri cu corecție Dixon-Coles."""
        rho = -0.13
        matrix = np.zeros((max_goals, max_goals))
        for i in range(max_goals):
            for j in range(max_goals):
                tau = self._tau(i, j, lam, mu, rho)
                matrix[i][j] = tau * poisson.pmf(i, lam) * poisson.pmf(j, mu)
        total = matrix.sum()
        if total > 0:
            matrix /= total
        return matrix

    def _tau(self, x, y, lam, mu, rho):
        if x == 0 and y == 0: return 1 - lam * mu * rho
        elif x == 0 and y == 1: return 1 + lam * rho
        elif x == 1 and y == 0: return 1 + mu * rho
        elif x == 1 and y == 1: return 1 - rho
        return 1

    # ─── 1. REZULTAT 1X2 ─────────────────────────────────────────────────────

    def _market_1x2(self, matrix: np.ndarray, label: str = "Rezultat meci") -> dict:
        p_home = float(np.tril(matrix, -1).sum())
        p_draw = float(np.trace(matrix))
        p_away = float(np.triu(matrix, 1).sum())
        return {
            "label": label,
            "icon": "⚽",
            "markets": [
                {"name": "1 (Gazdă câștigă)", "probability": round(p_home * 100, 1), "odds": round(1 / max(p_home, 0.01), 2)},
                {"name": "X (Egal)",           "probability": round(p_draw * 100, 1), "odds": round(1 / max(p_draw, 0.01), 2)},
                {"name": "2 (Oaspete câștigă)","probability": round(p_away * 100, 1), "odds": round(1 / max(p_away, 0.01), 2)},
            ]
        }

    # ─── 2. ȘANSĂ DUBLĂ ──────────────────────────────────────────────────────

    def _market_double_chance(self, matrix: np.ndarray) -> dict:
        p_home = float(np.tril(matrix, -1).sum())
        p_draw = float(np.trace(matrix))
        p_away = float(np.triu(matrix, 1).sum())
        p_1x = min(p_home + p_draw, 1.0)
        p_x2 = min(p_draw + p_away, 1.0)
        p_12 = min(p_home + p_away, 1.0)
        return {
            "label": "Șansă dublă",
            "icon": "🎯",
            "markets": [
                {"name": "1X (Gazdă sau egal)", "probability": round(p_1x * 100, 1), "odds": round(1 / max(p_1x, 0.01), 2)},
                {"name": "X2 (Egal sau oaspete)", "probability": round(p_x2 * 100, 1), "odds": round(1 / max(p_x2, 0.01), 2)},
                {"name": "12 (Fără egal)",       "probability": round(p_12 * 100, 1), "odds": round(1 / max(p_12, 0.01), 2)},
            ]
        }

    # ─── 3. OVER/UNDER GOLURI ────────────────────────────────────────────────

    def _market_over_under(self, lam: float, mu: float) -> dict:
        total_lam = lam + mu
        lines = [1.5, 2.5, 3.5, 4.5]
        markets = []
        for line in lines:
            # P(total goluri <= floor(line)) = P(under)
            p_under = float(sum(
                poisson.pmf(k, total_lam) for k in range(int(line) + 1)
            ))
            p_over = 1 - p_under
            markets.append({"name": f"Peste {line} goluri", "probability": round(p_over * 100, 1), "odds": round(1 / max(p_over, 0.01), 2)})
            markets.append({"name": f"Sub {line} goluri",   "probability": round(p_under * 100, 1), "odds": round(1 / max(p_under, 0.01), 2)})
        return {
            "label": "Over/Under goluri",
            "icon": "🥅",
            "markets": markets
        }

    # ─── 4. BTTS ─────────────────────────────────────────────────────────────

    def _market_btts(self, matrix: np.ndarray) -> dict:
        # BTTS = P(home >= 1 AND away >= 1)
        p_btts = float(matrix[1:, 1:].sum())
        p_no_btts = 1 - p_btts
        return {
            "label": "Ambele echipe marchează",
            "icon": "🎽",
            "markets": [
                {"name": "BTTS - Da", "probability": round(p_btts * 100, 1), "odds": round(1 / max(p_btts, 0.01), 2)},
                {"name": "BTTS - Nu", "probability": round(p_no_btts * 100, 1), "odds": round(1 / max(p_no_btts, 0.01), 2)},
            ]
        }

    # ─── 5. GOL LA PAUZĂ ─────────────────────────────────────────────────────

    def _market_halftime_goal(self, lam_ht: float, mu_ht: float) -> dict:
        # P(cel puțin un gol la pauză)
        p_no_goal_ht = poisson.pmf(0, lam_ht) * poisson.pmf(0, mu_ht)
        p_goal_ht = 1 - float(p_no_goal_ht)
        return {
            "label": "Gol marcat la pauză",
            "icon": "⏱",
            "markets": [
                {"name": "Gol la pauză - Da", "probability": round(p_goal_ht * 100, 1), "odds": round(1 / max(p_goal_ht, 0.01), 2)},
                {"name": "Gol la pauză - Nu", "probability": round((1 - p_goal_ht) * 100, 1), "odds": round(1 / max(1 - p_goal_ht, 0.01), 2)},
            ]
        }

    # ─── 6. OVER/UNDER PAUZĂ ─────────────────────────────────────────────────

    def _market_halftime_ou(self, lam_ht: float, mu_ht: float) -> dict:
        total_ht = lam_ht + mu_ht
        markets = []
        for line in [0.5, 1.5]:
            p_under = float(sum(poisson.pmf(k, total_ht) for k in range(int(line) + 1)))
            p_over = 1 - p_under
            markets.append({"name": f"Peste {line} goluri pauză", "probability": round(p_over * 100, 1), "odds": round(1 / max(p_over, 0.01), 2)})
            markets.append({"name": f"Sub {line} goluri pauză",   "probability": round(p_under * 100, 1), "odds": round(1 / max(p_under, 0.01), 2)})
        return {
            "label": "Over/Under goluri pauză",
            "icon": "⏰",
            "markets": markets
        }

    # ─── 7. SCOR EXACT ───────────────────────────────────────────────────────

    def _market_exact_score(self, matrix: np.ndarray) -> dict:
        scores = []
        for i in range(min(8, matrix.shape[0])):
            for j in range(min(8, matrix.shape[1])):
                prob = float(matrix[i][j])
                scores.append({
                    "name": f"{i}:{j}",
                    "probability": round(prob * 100, 2),
                    "odds": round(1 / max(prob, 0.001), 1)
                })
        scores.sort(key=lambda x: x["probability"], reverse=True)
        return {
            "label": "Scor exact (Top 10)",
            "icon": "🎰",
            "markets": scores[:10]
        }

    # ─── 8. COMBO ────────────────────────────────────────────────────────────

    def _market_combo(self, matrix: np.ndarray, lam: float, mu: float) -> dict:
        p_home = float(np.tril(matrix, -1).sum())
        p_draw = float(np.trace(matrix))
        p_away = float(np.triu(matrix, 1).sum())
        total_lam = lam + mu

        p_over25 = 1 - float(sum(poisson.pmf(k, total_lam) for k in range(3)))
        p_under25 = 1 - p_over25
        p_btts = float(matrix[1:, 1:].sum())

        combos = [
            {"name": "1 + Peste 2.5 goluri",    "p": p_home * p_over25},
            {"name": "2 + Peste 2.5 goluri",    "p": p_away * p_over25},
            {"name": "1X + Sub 2.5 goluri",     "p": (p_home + p_draw) * p_under25},
            {"name": "X2 + Sub 2.5 goluri",     "p": (p_draw + p_away) * p_under25},
            {"name": "BTTS + Peste 2.5 goluri", "p": p_btts * p_over25},
            {"name": "1 + BTTS",                "p": p_home * p_btts},
            {"name": "2 + BTTS",                "p": p_away * p_btts},
            {"name": "12 + Peste 2.5 goluri",   "p": (p_home + p_away) * p_over25},
        ]
        markets = [
            {"name": c["name"], "probability": round(min(c["p"], 1.0) * 100, 1), "odds": round(1 / max(min(c["p"], 1.0), 0.01), 2)}
            for c in combos
        ]
        markets.sort(key=lambda x: x["probability"], reverse=True)
        return {
            "label": "Pariuri combinate",
            "icon": "🔗",
            "markets": markets
        }

    # ─── 9. CORNERE ──────────────────────────────────────────────────────────

    def _estimate_corners(self, lam: float, mu: float, league_rating: float) -> dict:
        """
        Estimare cornere bazată pe:
        - xG (mai multe atacuri = mai multe cornere)
        - Rating ligă (ligi mai bune = mai multe cornere)
        """
        base = 9.5 + (lam + mu) * 1.2 + (league_rating / 100) * 1.5
        home_corners = base * (lam / max(lam + mu, 0.1)) * 1.1
        away_corners = base * (mu / max(lam + mu, 0.1)) * 0.95
        total = home_corners + away_corners

        home_ht = home_corners * 0.45
        away_ht = away_corners * 0.45
        total_ht = home_ht + away_ht

        return {
            "total": total, "home": home_corners, "away": away_corners,
            "total_ht": total_ht, "home_ht": home_ht, "away_ht": away_ht
        }

    def _market_corners(self, c: dict) -> dict:
        total = c["total"]
        total_ht = c["total_ht"]

        def ou_prob(mean, line):
            p_over = 1 - float(sum(poisson.pmf(k, mean) for k in range(int(line) + 1)))
            return round(p_over * 100, 1), round((1 - p_over) * 100, 1)

        markets = []
        for line in [4.5, 7.5, 9.5, 11.5]:
            over, under = ou_prob(total, line)
            markets.append({"name": f"Peste {line} cornere meci",  "probability": over,  "odds": round(100 / max(over, 1), 2)})
            markets.append({"name": f"Sub {line} cornere meci",    "probability": under, "odds": round(100 / max(under, 1), 2)})

        for line in [2.5, 4.5]:
            over, under = ou_prob(total_ht, line)
            markets.append({"name": f"Peste {line} cornere pauză", "probability": over,  "odds": round(100 / max(over, 1), 2)})
            markets.append({"name": f"Sub {line} cornere pauză",   "probability": under, "odds": round(100 / max(under, 1), 2)})

        markets.append({"name": f"Cornere așteptate meci",  "probability": round(total, 1),    "odds": None})
        markets.append({"name": f"Cornere așteptate pauză", "probability": round(total_ht, 1), "odds": None})

        return {
            "label": "Cornere",
            "icon": "🚩",
            "markets": markets
        }

    # ─── 10 & 11. CARTONAȘE ──────────────────────────────────────────────────

    def _estimate_cards(self, lam: float, mu: float, league_rating: float) -> dict:
        """
        Estimare cartonașe:
        - Meciuri strânse (xG apropiate) = mai multe cartonașe
        - Ligi mai competitive = mai multe cartonașe
        """
        competitiveness = 1 - abs(lam - mu) / max(lam + mu, 0.1)
        base_yellow = 3.2 + competitiveness * 1.5 + (league_rating / 100) * 0.8
        base_red = 0.08 + competitiveness * 0.12

        yellow_ht = base_yellow * 0.42
        red_prob = min(base_red, 0.35)

        return {
            "yellow_total": base_yellow,
            "yellow_ht": yellow_ht,
            "red_prob": red_prob,
        }

    def _market_cards(self, c: dict) -> dict:
        yellow = c["yellow_total"]
        yellow_ht = c["yellow_ht"]
        red_prob = c["red_prob"]

        def ou_prob(mean, line):
            p_over = 1 - float(sum(poisson.pmf(k, mean) for k in range(int(line) + 1)))
            return round(p_over * 100, 1), round((1 - p_over) * 100, 1)

        markets = []

        # Cartonașe galbene meci întreg
        for line in [1.5, 2.5, 3.5, 4.5]:
            over, under = ou_prob(yellow, line)
            markets.append({"name": f"Peste {line} galbene meci",  "probability": over,  "odds": round(100 / max(over, 1), 2)})
            markets.append({"name": f"Sub {line} galbene meci",    "probability": under, "odds": round(100 / max(under, 1), 2)})

        # Cartonașe galbene pauză
        for line in [0.5, 1.5]:
            over, under = ou_prob(yellow_ht, line)
            markets.append({"name": f"Peste {line} galbene pauză", "probability": over,  "odds": round(100 / max(over, 1), 2)})
            markets.append({"name": f"Sub {line} galbene pauză",   "probability": under, "odds": round(100 / max(under, 1), 2)})

        # Cartonaș roșu
        p_red_yes = round(red_prob * 100, 1)
        p_red_no = round((1 - red_prob) * 100, 1)
        markets.append({"name": "Cartonaș roșu - Da", "probability": p_red_yes, "odds": round(100 / max(p_red_yes, 1), 2)})
        markets.append({"name": "Cartonaș roșu - Nu", "probability": p_red_no,  "odds": round(100 / max(p_red_no, 1), 2)})

        markets.append({"name": "Galbene așteptate meci",  "probability": round(yellow, 1),    "odds": None})
        markets.append({"name": "Galbene așteptate pauză", "probability": round(yellow_ht, 1), "odds": None})

        return {
            "label": "Cartonașe",
            "icon": "🟨",
            "markets": markets
        }

    # ─── 12. TOTAL INDIVIDUAL ECHIPE ────────────────────────────────────────────

    def _market_team_totals(self, matrix: np.ndarray, home_team: str, away_team: str) -> dict:
        """
        Total goluri individuale gazdă și oaspete.
        P(gazdă marchează peste X) = P(home_goals > X)
        """
        max_g = matrix.shape[0]

        def team_over(col_or_row: str, line: float) -> float:
            """Probabilitate ca echipa să marcheze mai mult de `line` goluri."""
            if col_or_row == 'home':
                # suma pe rânduri (home_goals = rând)
                probs = [matrix[i, :].sum() for i in range(max_g)]
            else:
                probs = [matrix[:, j].sum() for j in range(max_g)]
            p_over = sum(probs[k] for k in range(int(line) + 1, max_g))
            return float(p_over)

        markets = []
        home_label = home_team.split()[-1] if home_team else 'Gazdă'
        away_label = away_team.split()[-1] if away_team else 'Oaspete'

        for line in [0.5, 1.5, 2.5]:
            # Gazdă
            p_h = team_over('home', line)
            markets.append({
                "name": f"{home_label} peste {line} goluri",
                "probability": round(p_h * 100, 1),
                "odds": round(1 / max(p_h, 0.01), 2)
            })
            markets.append({
                "name": f"{home_label} sub {line} goluri",
                "probability": round((1 - p_h) * 100, 1),
                "odds": round(1 / max(1 - p_h, 0.01), 2)
            })
            # Oaspete
            p_a = team_over('away', line)
            markets.append({
                "name": f"{away_label} peste {line} goluri",
                "probability": round(p_a * 100, 1),
                "odds": round(1 / max(p_a, 0.01), 2)
            })
            markets.append({
                "name": f"{away_label} sub {line} goluri",
                "probability": round((1 - p_a) * 100, 1),
                "odds": round(1 / max(1 - p_a, 0.01), 2)
            })

        return {
            "label": "Total individual echipe",
            "icon": "🎯",
            "markets": markets
        }

    # ─── 13. GOL ÎN AMBELE REPRIZE ──────────────────────────────────────────────

    def _market_goal_both_halves(self, lambda_: float, mu: float) -> dict:
        """
        P(gol în repriza 1 ȘI gol în repriza 2).
        Repriza 1: ~42% din goluri | Repriza 2: ~58% din goluri
        """
        lam1 = lambda_ * 0.42
        mu1  = mu * 0.42
        lam2 = lambda_ * 0.58
        mu2  = mu * 0.58

        from scipy.stats import poisson

        # P(cel puțin un gol în repriza 1)
        p_goal_r1 = 1 - float(poisson.pmf(0, lam1) * poisson.pmf(0, mu1))
        # P(cel puțin un gol în repriza 2)
        p_goal_r2 = 1 - float(poisson.pmf(0, lam2) * poisson.pmf(0, mu2))

        # Independent → înmulțim (aproximare rezonabilă)
        p_both = p_goal_r1 * p_goal_r2
        p_not  = 1 - p_both

        return {
            "label": "Gol în ambele reprize",
            "icon": "⚽⚽",
            "markets": [
                {"name": "Gol în ambele reprize - Da", "probability": round(p_both * 100, 1), "odds": round(1 / max(p_both, 0.01), 2)},
                {"name": "Gol în ambele reprize - Nu", "probability": round(p_not  * 100, 1), "odds": round(1 / max(p_not,  0.01), 2)},
            ]
        }

    # ─── 14. PAUZĂ / FINAL (HT/FT) ──────────────────────────────────────────────

    def _market_ht_ft(self, matrix: np.ndarray, matrix_ht: np.ndarray) -> dict:
        """
        Pauză/Final — combinații rezultat la pauză cu rezultat final.
        Folosim independența aproximativă între HT și FT (ajustată).
        """
        # Probabilități la pauză
        p_ht_home = float(np.tril(matrix_ht, -1).sum())
        p_ht_draw = float(np.trace(matrix_ht))
        p_ht_away = float(np.triu(matrix_ht, 1).sum())

        # Probabilități finale
        p_ft_home = float(np.tril(matrix, -1).sum())
        p_ft_draw = float(np.trace(matrix))
        p_ft_away = float(np.triu(matrix, 1).sum())

        ht = {'1': p_ht_home, 'X': p_ht_draw, '2': p_ht_away}
        ft = {'1': p_ft_home, 'X': p_ft_draw, '2': p_ft_away}

        # Corecție: dacă la pauză e 1, la final e mai probabil să rămână 1
        # Folosim factori de corelație bazați pe statistici reale
        corr = {
            ('1','1'): 1.45, ('1','X'): 0.65, ('1','2'): 0.35,
            ('X','1'): 0.85, ('X','X'): 1.15, ('X','2'): 0.85,
            ('2','1'): 0.35, ('2','X'): 0.65, ('2','2'): 1.45,
        }

        combos = []
        for ht_res in ['1','X','2']:
            for ft_res in ['1','X','2']:
                raw = ht[ht_res] * ft[ft_res] * corr.get((ht_res, ft_res), 1.0)
                combos.append((f"{ht_res}/{ft_res}", raw))

        # Normalizăm
        total = sum(p for _, p in combos)
        markets = [
            {
                "name": f"Pauză/Final {label}",
                "probability": round(min(p / total, 1.0) * 100, 1),
                "odds": round(total / max(p, 0.001), 2)
            }
            for label, p in sorted(combos, key=lambda x: x[1], reverse=True)
        ]

        return {
            "label": "Pauză / Final",
            "icon": "⏱🏁",
            "markets": markets
        }

