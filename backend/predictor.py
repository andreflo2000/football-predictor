"""
OXIANO - Modul predictie AI
Folosit de main.py pentru a prezice rezultatele meciurilor.
Incarca model.pkl generat de train.py si construieste vectorul complet de features.
"""

import math
import numpy as np
import pandas as pd
import pickle
import os


def _poisson_over25(lam: float) -> float:
    """P(total goals > 2.5) folosind distributia Poisson cu medie lam."""
    if lam <= 0:
        return 0.0
    p_le2 = math.exp(-lam) * (1 + lam + lam ** 2 / 2)
    return round(max(0.0, min(1.0, 1 - p_le2)), 3)

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")

_model         = None
_features      = None
_team_stats    = None
_label_encoder = None
_elo_ratings   = None
_feature_means = None
_h2h_history   = None
_clubelo_ratings: dict = {}   # Elo externe de la clubelo.com (mai precise)


def load_model():
    global _model, _features, _team_stats, _label_encoder, _elo_ratings, _feature_means, _h2h_history

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Modelul nu exista! Ruleaza mai intai: python train.py (cautat la: {MODEL_PATH})"
        )

    data = pickle.load(open(MODEL_PATH, "rb"))
    _model         = data["model"]
    _features      = data["features"]
    _team_stats    = data.get("team_stats", {})
    _label_encoder = data.get("label_encoder")
    _elo_ratings   = data.get("elo_ratings", {})
    _feature_means = data.get("feature_means", {})
    _h2h_history   = data.get("h2h_history", {})
    print(f"Model AI incarcat: {len(_team_stats)} echipe, {len(_features)} features")


def refresh_clubelo(redis_cache=None):
    """Actualizeaza Elo-urile externe de la clubelo.com. Apelat la startup si zilnic."""
    global _clubelo_ratings
    try:
        from club_elo import fetch_club_elo
        fresh = fetch_club_elo(redis_cache)
        if fresh:
            _clubelo_ratings = fresh
            print(f"[club_elo] Actualizat: {len(_clubelo_ratings)} echipe")
    except Exception as e:
        print(f"[club_elo] Eroare refresh: {e}")


def _team_elo(team: str) -> float:
    """Cauta Elo pentru echipa — prioritate clubelo.com, fallback la model intern."""
    if team in _clubelo_ratings:
        return _clubelo_ratings[team]
    vals = [v for k, v in _elo_ratings.items() if k.split("|", 1)[-1] == team]
    return max(vals) if vals else 1500.0


def _get_team_stats(team: str, as_home: bool) -> dict:
    """Returneaza stats complet pentru o echipa (home sau away)."""
    if _team_stats is None or team not in _team_stats:
        # Valori implicite pentru echipa necunoscuta
        return {
            "atk_all5": 1.3, "def_all5": 1.3, "atk_all10": 1.3, "def_all10": 1.3,
            "atk_venue5": 1.4 if as_home else 1.1,
            "def_venue5": 1.1 if as_home else 1.3,
            "win5": 0.40, "win10": 0.40, "draw5": 0.26,
            "pts5": 0.40, "pts10": 0.40,
            "win_venue5": 0.40, "pts_venue5": 0.40,
            "btts5": 0.50, "over25_5": 0.50, "clean5": 0.30,
            "streak": 0, "n_matches": 6,
        }

    s = _team_stats[team]
    venue_atk = s.get("atk_home5" if as_home else "atk_away5", 1.4 if as_home else 1.1)
    venue_def = s.get("def_home5" if as_home else "def_away5", 1.1 if as_home else 1.3)
    win_venue = s.get("win_home5" if as_home else "win_away5", 0.40)
    pts_venue = s.get("pts_home5" if as_home else "pts_away5", 0.40)

    return {
        "atk_all5":   s.get("atk_all5", 1.3),
        "def_all5":   s.get("def_all5", 1.3),
        "atk_all10":  s.get("atk_all10", 1.3),
        "def_all10":  s.get("def_all10", 1.3),
        "atk_venue5": venue_atk,
        "def_venue5": venue_def,
        "win5":       s.get("win5", 0.40),
        "win10":      s.get("win10", 0.40),
        "draw5":      s.get("draw5", 0.26),
        "pts5":       s.get("pts5", 0.40),
        "pts10":      s.get("pts10", 0.40),
        "win_venue5": win_venue,
        "pts_venue5": pts_venue,
        "btts5":      s.get("btts5", 0.50),
        "over25_5":   s.get("over25_5", 0.50),
        "clean5":     s.get("clean5", 0.30),
        "streak":     s.get("streak", 0),
        "n_matches":  s.get("n_matches", 6),
    }


def _build_feature_vector(home_team: str, away_team: str,
                           odds: dict = None, league_id: int = 0,
                           month: int = None) -> pd.DataFrame:
    """
    Construieste vectorul complet de ~80 features pe baza team_stats.
    odds: dict optional cu chei PSH/PSD/PSA, B365H/B365D/B365A, etc.
    """
    import datetime
    if month is None:
        month = datetime.date.today().month

    h = _get_team_stats(home_team, as_home=True)
    a = _get_team_stats(away_team, as_home=False)

    h_elo = _team_elo(home_team)
    a_elo = _team_elo(away_team)
    elo_diff = h_elo - a_elo

    # Elo probabilities (formula clasica)
    elo_diff_adj = elo_diff + 50  # home advantage (calibrat post-COVID)
    elo_prob_h = 1 / (1 + 10 ** (-elo_diff_adj / 400))
    # Draw probability: aproximare empirica
    diff_abs = abs(elo_diff_adj)
    draw_base = 0.28 * (1 - diff_abs / 1000)
    draw_base = max(0.05, min(draw_base, 0.32))
    elo_prob_d = draw_base

    # xG proxy
    xg_h = (h["atk_venue5"] + a["def_venue5"]) / 2
    xg_a = (a["atk_venue5"] + h["def_venue5"]) / 2
    xg_diff = xg_h - xg_a

    feat = {}

    # Team features — home
    for k, v in h.items():
        feat[f"h_{k}"] = v
    # Team features — away
    for k, v in a.items():
        feat[f"a_{k}"] = v

    # xG
    feat["xg_h"]    = xg_h
    feat["xg_a"]    = xg_a
    feat["xg_diff"] = xg_diff

    # H2H real (din istoricul antrenamentului)
    if _h2h_history:
        key = tuple(sorted([home_team, away_team]))
        recent = _h2h_history.get(key, [])[-6:]
        if recent:
            hw = dr = 0
            gd_sum = 0.0
            for r in recent:
                if r["home"] == home_team:
                    hw += int(r["ftr"] == "H")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["hg"] - r["ag"]
                else:
                    hw += int(r["ftr"] == "A")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["ag"] - r["hg"]
            n = len(recent)
            feat["h2h_hw"] = hw / n
            feat["h2h_dr"] = dr / n
            feat["h2h_gd"] = gd_sum / n
            feat["h2h_n"]  = n
        else:
            feat["h2h_hw"] = 0.45
            feat["h2h_dr"] = 0.25
            feat["h2h_gd"] = 0.0
            feat["h2h_n"]  = 0
    else:
        feat["h2h_hw"] = 0.45
        feat["h2h_dr"] = 0.25
        feat["h2h_gd"] = 0.0
        feat["h2h_n"]  = 0

    # Elo
    feat["h_elo"]      = h_elo
    feat["a_elo"]      = a_elo
    feat["elo_diff"]   = elo_diff
    feat["elo_prob_h"] = elo_prob_h
    feat["elo_prob_d"] = elo_prob_d

    # Odds features
    if odds:
        for source, col_h, col_d, col_a in [
            ("ps",   "PSH",   "PSD",   "PSA"),
            ("avg",  "AvgH",  "AvgD",  "AvgA"),
            ("b365", "B365H", "B365D", "B365A"),
            ("max",  "MaxH",  "MaxD",  "MaxA"),
        ]:
            oh = odds.get(col_h)
            od = odds.get(col_d)
            oa = odds.get(col_a)
            if oh and od and oa and oh > 1 and od > 1 and oa > 1:
                raw_h, raw_d, raw_a = 1/oh, 1/od, 1/oa
                margin = raw_h + raw_d + raw_a
                feat[f"mkt_ph_{source}"]     = raw_h / margin
                feat[f"mkt_pd_{source}"]     = raw_d / margin
                feat[f"mkt_pa_{source}"]     = raw_a / margin
                feat[f"mkt_margin_{source}"] = margin
            else:
                # Folosim medii din antrenament
                for sfx in ["ph", "pd", "pa"]:
                    k = f"mkt_{sfx}_{source}"
                    feat[k] = _feature_means.get(k, 0.333)
                feat[f"mkt_margin_{source}"] = _feature_means.get(f"mkt_margin_{source}", 1.05)
        feat["has_odds"] = 1.0
    else:
        # Fara cote: folosim medii din antrenament
        for source in ["ps", "avg", "b365", "max"]:
            for sfx in ["ph", "pd", "pa"]:
                k = f"mkt_{sfx}_{source}"
                feat[k] = _feature_means.get(k, 0.333)
            feat[f"mkt_margin_{source}"] = _feature_means.get(f"mkt_margin_{source}", 1.05)
        feat["has_odds"] = 0.0

    # Diferentiale
    for col in ["atk_all5", "def_all5", "atk_all10", "def_all10",
                "atk_venue5", "def_venue5", "win5", "win10",
                "pts5", "pts10", "win_venue5", "pts_venue5"]:
        if f"h_{col}" in feat and f"a_{col}" in feat:
            feat[f"diff_{col}"] = feat[f"h_{col}"] - feat[f"a_{col}"]

    # ── Market Intelligence features ────────────────────────────────────────
    # La inferenta nu avem opening odds → miscarea liniei = 0 (neutral)
    # Calculam ce putem din cotele curente disponibile
    _MI_ZERO = ["ps_move_h","ps_move_a","ps_move_d",
                "home_steamed","away_steamed","home_drifted","away_drifted",
                "clv_h","clv_a","reverse_line_h","reverse_line_a",
                "drift_in_value_h","steam_in_value_a","trap_game_h"]

    if odds:
        ps_h  = odds.get("PSH")  or odds.get("B365H")
        ps_a  = odds.get("PSA")  or odds.get("B365A")
        avg_h = odds.get("AvgH") or odds.get("B365H")
        avg_a = odds.get("AvgA") or odds.get("B365A")
        max_h = odds.get("MaxH") or odds.get("B365H")
        max_d = odds.get("MaxD") or odds.get("B365D")
        max_a = odds.get("MaxA") or odds.get("B365A")
        b365h = odds.get("B365H")
        b365a = odds.get("B365A")

        # Sharp vs Soft (Pinnacle vs Bet365)
        if ps_h and b365h and ps_h > 1 and b365h > 1:
            feat["sharp_soft_div_h"] = float(ps_h - b365h)
            feat["sharp_soft_div_a"] = float((ps_a or b365a or 0) - (b365a or 0))
            feat["public_fav_h"] = float(feat["sharp_soft_div_h"] > 0.08)
            feat["public_fav_a"] = float(feat["sharp_soft_div_a"] > 0.08)
        elif ps_h and avg_h and ps_h > 1 and avg_h > 1:
            feat["sharp_soft_div_h"] = float(ps_h - avg_h)
            feat["sharp_soft_div_a"] = float((ps_a or 0) - (avg_a or 0))
            feat["public_fav_h"] = float(feat["sharp_soft_div_h"] > 0.08)
            feat["public_fav_a"] = float(feat["sharp_soft_div_a"] > 0.08)
        else:
            feat["sharp_soft_div_h"] = _feature_means.get("sharp_soft_div_h", 0.0)
            feat["sharp_soft_div_a"] = _feature_means.get("sharp_soft_div_a", 0.0)
            feat["public_fav_h"] = 0.0
            feat["public_fav_a"] = 0.0

        # Closing Odds Variance (dispersia intre bookmakers disponibili)
        close_h_vals = [v for v in [ps_h, max_h, avg_h, b365h] if v and v > 1]
        close_a_vals = [v for v in [ps_a, max_a, avg_a, b365a] if v and v > 1]
        feat["close_var_h"] = float(np.std(close_h_vals)) if len(close_h_vals) >= 2 else 0.0
        feat["close_var_a"] = float(np.std(close_a_vals)) if len(close_a_vals) >= 2 else 0.0
        feat["high_cov_h"] = float(feat["close_var_h"] > 0.10)
        feat["high_cov_a"] = float(feat["close_var_a"] > 0.10)

        # Market efficiency (vig la max — cel mai mic overround)
        if max_h and max_d and max_a and max_h > 1 and max_d > 1 and max_a > 1:
            feat["market_vig"] = float(1/max_h + 1/max_d + 1/max_a - 1)
            feat["low_vig"]    = float(feat["market_vig"] < 0.04)
        else:
            feat["market_vig"] = _feature_means.get("market_vig", 0.05)
            feat["low_vig"]    = 0.0

        # Value zone 1.60–2.10
        ref_h = max_h or ps_h or b365h or 0
        ref_a = max_a or ps_a or b365a or 0
        feat["value_zone_h"] = float(1.60 <= ref_h <= 2.10) if ref_h else 0.0
        feat["value_zone_a"] = float(1.60 <= ref_a <= 2.10) if ref_a else 0.0

        # Miscarea liniei necunoscuta la inferenta → 0
        for col in _MI_ZERO:
            feat[col] = 0.0

    else:
        # Fara cote: folosim medii
        for col in ["sharp_soft_div_h","sharp_soft_div_a","public_fav_h","public_fav_a",
                    "close_var_h","close_var_a","high_cov_h","high_cov_a",
                    "market_vig","low_vig","value_zone_h","value_zone_a"] + _MI_ZERO:
            feat[col] = _feature_means.get(col, 0.0)

    # Context
    season_month = (month - 8) % 12
    feat["league_id"]       = league_id
    feat["month"]           = month
    feat["season_progress"] = season_month / 11.0

    # Draw-specific features
    import math
    feat["balanced"]    = math.exp(-abs(elo_diff) / 150)
    feat["low_scoring"] = 1.0 / (xg_h + xg_a + 0.5)
    feat["xg_sim"]      = math.exp(-abs(xg_diff) * 2)
    lam = max(0.1, min(xg_h, 6))
    mu  = max(0.1, min(xg_a, 6))
    feat["poisson_draw"] = math.exp(-(lam + mu)) * math.exp(2 * math.sqrt(lam * mu) - lam - mu + (lam + mu))

    # Aliniere la ordinea exacta de features din model
    row = {f: feat.get(f, _feature_means.get(f, 0.0)) for f in _features}
    return pd.DataFrame([row])[_features]


def predict_match(
    home_team: str,
    away_team: str,
    odds: dict = None,
    league_id: int = 0,
    month: int = None,
    neutral: bool = False,
    tournament: str = "Friendly",
) -> dict:
    if _model is None:
        load_model()

    X = _build_feature_vector(home_team, away_team, odds=odds,
                              league_id=league_id, month=month)

    proba = _model.predict_proba(X)[0]

    # Label encoder: A=0, D=1, H=2 (ordine alfabetica)
    if _label_encoder is not None:
        classes = _label_encoder.classes_
    else:
        classes = ["A", "D", "H"]

    prob_map = {c: round(float(p), 3) for c, p in zip(classes, proba)}
    best_class = classes[int(np.argmax(proba))]
    confidence = float(np.max(proba))

    label_map = {"H": "Victorie gazda", "D": "Egal", "A": "Victorie oaspete"}

    if confidence >= 0.65:
        confidence_level = "high"
    elif confidence >= 0.55:
        confidence_level = "medium"
    else:
        confidence_level = "low"

    h_stats = _team_stats.get(home_team, {})
    a_stats = _team_stats.get(away_team, {})

    # ── Market Intelligence signals ─────────────────────────────────────────
    edge           = 0.0
    value_bet      = False
    upset_risk     = False
    market_signal  = "NO_ODDS"

    if odds:
        max_h = odds.get("MaxH") or odds.get("B365H") or 0
        max_d = odds.get("MaxD") or odds.get("B365D") or 0
        max_a = odds.get("MaxA") or odds.get("B365A") or 0

        if max_h > 1 and max_d > 1 and max_a > 1:
            # Probabilitati implicite corectate pentru vig
            vig       = 1/max_h + 1/max_d + 1/max_a
            impl_h    = (1/max_h) / vig
            impl_d    = (1/max_d) / vig
            impl_a    = (1/max_a) / vig

            model_h   = prob_map.get("H", 0.0)
            model_a   = prob_map.get("A", 0.0)
            model_d   = prob_map.get("D", 0.0)

            # Edge = diferenta intre probabilitatea modelului si piata
            edge_h = model_h - impl_h
            edge_a = model_a - impl_a
            edge_d = model_d - impl_d

            # Cel mai bun edge pe directia predictiei
            if best_class == "H":
                edge = edge_h
            elif best_class == "A":
                edge = edge_a
            else:
                edge = edge_d

            # Value bet: edge > 4% (pragul minim de exploatare pe termen lung)
            in_value_zone_h = 1.60 <= max_h <= 2.10
            in_value_zone_a = 1.60 <= max_a <= 2.10

            if edge > 0.04:
                value_bet = True
                if best_class == "H" and in_value_zone_h:
                    market_signal = "VALUE_HOME"
                elif best_class == "A" and in_value_zone_a:
                    market_signal = "VALUE_AWAY"
                elif best_class == "H":
                    market_signal = "EDGE_HOME"
                elif best_class == "A":
                    market_signal = "EDGE_AWAY"
                else:
                    market_signal = "EDGE_DRAW"
            else:
                market_signal = "NEUTRAL"

            # Upset risk: model vede altceva decat favoritul pietei in zona 1.60-2.10
            fav_is_home = max_h < max_a and in_value_zone_h
            fav_is_away = max_a < max_h and in_value_zone_a
            if fav_is_home and best_class != "H" and model_a > impl_a + 0.03:
                upset_risk = True
            elif fav_is_away and best_class != "A" and model_h > impl_h + 0.03:
                upset_risk = True

    def _cap(v: float) -> float:
        """Nicio probabilitate nu poate fi 0% sau 100% — imposibil in fotbal."""
        return round(max(0.01, min(0.99, v)), 3)

    return {
        "home_team":        home_team,
        "away_team":        away_team,
        "home_win":         _cap(prob_map.get("H", 0.0)),
        "draw":             _cap(prob_map.get("D", 0.0)),
        "away_win":         _cap(prob_map.get("A", 0.0)),
        "prediction":       best_class,
        "prediction_label": label_map.get(best_class, "Necunoscut"),
        "confidence":       _cap(confidence),
        "confidence_level": confidence_level,
        "high_confidence":  confidence >= 0.65,
        "home_elo":         round(_team_elo(home_team), 0),
        "away_elo":         round(_team_elo(away_team), 0),
        "home_form":        _cap(h_stats.get("pts5", 0.40)),
        "away_form":        _cap(a_stats.get("pts5", 0.40)),
        "home_venue_form":  _cap(h_stats.get("pts_venue5", 0.40)),
        "away_venue_form":  _cap(a_stats.get("pts_venue5", 0.40)),
        "home_goals_avg":   round(h_stats.get("atk_all5", 1.3), 2),
        "away_goals_avg":   round(a_stats.get("atk_all5", 1.3), 2),
        "btts_rate":        _cap((h_stats.get("btts5", 0.50) + a_stats.get("btts5", 0.50)) / 2),
        "over25_rate":      _cap(_poisson_over25(h_stats.get("atk_all5", 1.3) + a_stats.get("atk_all5", 1.3))),
        "has_odds":         odds is not None,
        # ── BI signals ─────────────────────────────────────────────────────
        "edge":             round(edge * 100, 1),    # % avantaj față de piață
        "value_bet":        value_bet,               # True dacă edge > 4%
        "market_signal":    market_signal,           # VALUE_HOME|VALUE_AWAY|EDGE_*|NEUTRAL|NO_ODDS
        "upset_risk":       upset_risk,              # True dacă modelul contrazice favoritul din 1.60-2.10
    }


def get_known_teams() -> list:
    if _team_stats is None:
        load_model()
    return sorted(_team_stats.keys())
