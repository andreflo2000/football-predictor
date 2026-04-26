"""
bet_signal.py — Pipeline dual-model pentru semnale de pariu.

Flux:
  1. Fetch meciuri + cote din The-Odds-API (72h înainte)
  2. Rulează logica duală: model_no_odds.pkl + model.pkl
  3. Inserează semnale BET în Supabase (ON CONFLICT DO NOTHING)
  4. update_results() — marchează W/L/P pe semnalele pendente

Rulare:
  python bet_signal.py           # pipeline complet
  python bet_signal.py results   # doar update rezultate
"""

import os
import sys
import math
import json
import pickle
import datetime
import requests
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from calibrator import CalibratedXGB  # noqa: F401 — necesar pentru deserializare pkl

load_dotenv()

BASE_DIR           = os.path.dirname(os.path.abspath(__file__))
MODEL_ODDS_PATH    = os.path.join(BASE_DIR, "model.pkl")
MODEL_NO_ODDS_PATH = os.path.join(BASE_DIR, "model_no_odds.pkl")

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_KEY", "")
ODDS_API_URL = "https://api.the-odds-api.com/v4"

# Ligrile suportate de model (The-Odds-API sport key → div code)
ODDS_SPORT_MAP = {
    "soccer_epl":                   "PL",
    "soccer_germany_bundesliga":    "BL1",
    "soccer_italy_serie_a":         "SA",
    "soccer_spain_la_liga":         "PD",
    "soccer_france_ligue_one":      "FL1",
    "soccer_portugal_primeira_liga":"PPL",
    "soccer_netherlands_eredivisie":"DED",
    "soccer_uefa_champs_league":    "CL",
    "soccer_uefa_europa_league":    "EL",
}

LEAGUE_NAMES = {
    "PL": "Premier League", "BL1": "Bundesliga", "SA": "Serie A",
    "PD": "La Liga", "FL1": "Ligue 1", "PPL": "Primeira Liga",
    "DED": "Eredivisie", "CL": "Champions League", "EL": "Europa League",
}

# Mapare nume echipe Odds-API → format intern model
# (importata din fixtures.py — sursa unica de adevar)
from fixtures import FDORG_TO_MODEL as _TEAM_MAP


def _normalize_team(raw: str, known_teams: list) -> str:
    """Normalizeaza numele echipei din Odds API catre formatul intern."""
    from difflib import get_close_matches
    if raw in _TEAM_MAP:
        return _TEAM_MAP[raw]
    cleaned = raw
    for suffix in [" FC", " AFC", " CF", " SC", " AC"]:
        if cleaned.endswith(suffix):
            cleaned = cleaned[:-len(suffix)].strip()
            break
    if cleaned in known_teams:
        return cleaned
    matches = get_close_matches(cleaned, known_teams, n=1, cutoff=0.70)
    if matches:
        return matches[0]
    matches2 = get_close_matches(raw, known_teams, n=1, cutoff=0.65)
    if matches2:
        return matches2[0]
    return raw


# ─── Stare globala modele ─────────────────────────────────────────────────────

_odds_model = _odds_features = _odds_le = _odds_stats = None
_odds_elo   = _odds_means    = _odds_h2h = None

_no_odds_model = _no_odds_features = _no_odds_le = _no_odds_stats = None
_no_odds_elo   = _no_odds_means    = _no_odds_h2h = None

_known_teams: list = []


def _load_pkl(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with open(path, "rb") as f:
        return pickle.load(f)


def load_models():
    global _odds_model, _odds_features, _odds_le, _odds_stats
    global _odds_elo, _odds_means, _odds_h2h
    global _no_odds_model, _no_odds_features, _no_odds_le, _no_odds_stats
    global _no_odds_elo, _no_odds_means, _no_odds_h2h
    global _known_teams

    # model_no_odds.pkl TREBUIE sa existe — fara fallback silentios
    if not os.path.exists(MODEL_NO_ODDS_PATH):
        msg = "model_no_odds.pkl lipsa. Rulează mai întâi: python train_no_odds.py"
        if __name__ == "__main__":
            print(f"EROARE: {msg}")
            sys.exit(1)
        raise RuntimeError(msg)

    if not os.path.exists(MODEL_ODDS_PATH):
        msg = "model.pkl lipsa. Rulează mai întâi: python train.py"
        if __name__ == "__main__":
            print(f"EROARE: {msg}")
            sys.exit(1)
        raise RuntimeError(msg)

    d = _load_pkl(MODEL_ODDS_PATH)
    _odds_model    = d["model"]
    _odds_features = d["features"]
    _odds_le       = d["label_encoder"]
    _odds_stats    = d.get("team_stats", {})
    _odds_elo      = d.get("elo_ratings", {})
    _odds_means    = d.get("feature_means", {})
    _odds_h2h      = d.get("h2h_history", {})

    d2 = _load_pkl(MODEL_NO_ODDS_PATH)
    _no_odds_model    = d2["model"]
    _no_odds_features = d2["features"]
    _no_odds_le       = d2["label_encoder"]
    _no_odds_stats    = d2.get("team_stats", {})
    _no_odds_elo      = d2.get("elo_ratings", {})
    _no_odds_means    = d2.get("feature_means", {})
    _no_odds_h2h      = d2.get("h2h_history", {})

    # Lista echipelor cunoscute (uniune ambele modele)
    _known_teams = sorted(set(_odds_stats.keys()) | set(_no_odds_stats.keys()))

    print(f"[model.pkl]         {len(_odds_stats)} echipe, {len(_odds_features)} features")
    print(f"[model_no_odds.pkl] {len(_no_odds_stats)} echipe, {len(_no_odds_features)} features")
    print(f"[echipe cunoscute]  {len(_known_teams)}")


# ─── Helpers feature building ─────────────────────────────────────────────────

def _team_elo_from(team: str, elo_ratings: dict) -> float:
    vals = [v for k, v in elo_ratings.items() if k.split("|", 1)[-1] == team]
    return max(vals) if vals else 1500.0


def _get_stats(team: str, as_home: bool, stats_dict: dict) -> dict:
    if team not in stats_dict:
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
    s = stats_dict[team]
    return {
        "atk_all5":   s.get("atk_all5", 1.3),
        "def_all5":   s.get("def_all5", 1.3),
        "atk_all10":  s.get("atk_all10", 1.3),
        "def_all10":  s.get("def_all10", 1.3),
        "atk_venue5": s.get("atk_home5" if as_home else "atk_away5", 1.4 if as_home else 1.1),
        "def_venue5": s.get("def_home5" if as_home else "def_away5", 1.1 if as_home else 1.3),
        "win5":       s.get("win5", 0.40),
        "win10":      s.get("win10", 0.40),
        "draw5":      s.get("draw5", 0.26),
        "pts5":       s.get("pts5", 0.40),
        "pts10":      s.get("pts10", 0.40),
        "win_venue5": s.get("win_home5" if as_home else "win_away5", 0.40),
        "pts_venue5": s.get("pts_home5" if as_home else "pts_away5", 0.40),
        "btts5":      s.get("btts5", 0.50),
        "over25_5":   s.get("over25_5", 0.50),
        "clean5":     s.get("clean5", 0.30),
        "streak":     s.get("streak", 0),
        "n_matches":  s.get("n_matches", 6),
    }


def _h2h_feat(home: str, away: str, h2h_history: dict) -> dict:
    key = tuple(sorted([home, away]))
    recent = h2h_history.get(key, [])[-6:]
    if not recent:
        return {"h2h_hw": 0.45, "h2h_dr": 0.25, "h2h_gd": 0.0, "h2h_n": 0}
    hw = dr = 0
    gd_sum = 0.0
    for r in recent:
        if r["home"] == home:
            hw += int(r["ftr"] == "H")
            dr += int(r["ftr"] == "D")
            gd_sum += r["hg"] - r["ag"]
        else:
            hw += int(r["ftr"] == "A")
            dr += int(r["ftr"] == "D")
            gd_sum += r["ag"] - r["hg"]
    n = len(recent)
    return {"h2h_hw": hw / n, "h2h_dr": dr / n, "h2h_gd": gd_sum / n, "h2h_n": n}


def _base_features(home: str, away: str, stats_dict: dict,
                   elo_ratings: dict, h2h_history: dict,
                   league_id: int = 0, month: int = None) -> dict:
    if month is None:
        month = datetime.date.today().month

    h = _get_stats(home, as_home=True,  stats_dict=stats_dict)
    a = _get_stats(away, as_home=False, stats_dict=stats_dict)

    h_elo        = _team_elo_from(home, elo_ratings)
    a_elo        = _team_elo_from(away, elo_ratings)
    elo_diff     = h_elo - a_elo
    elo_diff_adj = elo_diff + 50
    elo_prob_h   = 1 / (1 + 10 ** (-elo_diff_adj / 400))
    diff_abs     = abs(elo_diff_adj)
    elo_prob_d   = max(0.05, min(0.32, 0.28 * (1 - diff_abs / 1000)))

    xg_h    = (h["atk_venue5"] + a["def_venue5"]) / 2
    xg_a    = (a["atk_venue5"] + h["def_venue5"]) / 2
    xg_diff = xg_h - xg_a

    feat = {}
    for k, v in h.items():
        feat[f"h_{k}"] = v
    for k, v in a.items():
        feat[f"a_{k}"] = v

    feat.update(_h2h_feat(home, away, h2h_history))
    feat["xg_h"]      = xg_h
    feat["xg_a"]      = xg_a
    feat["xg_diff"]   = xg_diff
    feat["h_elo"]     = h_elo
    feat["a_elo"]     = a_elo
    feat["elo_diff"]  = elo_diff
    feat["elo_prob_h"] = elo_prob_h
    feat["elo_prob_d"] = elo_prob_d

    for col in ["atk_all5", "def_all5", "atk_all10", "def_all10",
                "atk_venue5", "def_venue5", "win5", "win10",
                "pts5", "pts10", "win_venue5", "pts_venue5"]:
        if f"h_{col}" in feat and f"a_{col}" in feat:
            feat[f"diff_{col}"] = feat[f"h_{col}"] - feat[f"a_{col}"]

    season_month = (month - 8) % 12
    feat["league_id"]       = league_id
    feat["month"]           = month
    feat["season_progress"] = season_month / 11.0

    feat["balanced"]    = math.exp(-abs(elo_diff) / 150)
    feat["low_scoring"] = 1.0 / (xg_h + xg_a + 0.5)
    feat["xg_sim"]      = math.exp(-abs(xg_diff) * 2)
    lam = max(0.1, min(xg_h, 6))
    mu  = max(0.1, min(xg_a, 6))
    feat["poisson_draw"] = math.exp(-(lam + mu)) * math.exp(
        2 * math.sqrt(lam * mu) - lam - mu + (lam + mu)
    )
    return feat


def _predict_no_odds(home: str, away: str, league_id: int = 0, month: int = None) -> dict:
    feat = _base_features(home, away,
                          _no_odds_stats, _no_odds_elo, _no_odds_h2h,
                          league_id, month)
    row = {f: feat.get(f, _no_odds_means.get(f, 0.0)) for f in _no_odds_features}
    X = pd.DataFrame([row])[_no_odds_features]
    proba = _no_odds_model.predict_proba(X)[0]
    return {c: float(p) for c, p in zip(_no_odds_le.classes_, proba)}


def _predict_odds_model(home: str, away: str, odds: dict,
                        league_id: int = 0, month: int = None) -> dict:
    feat = _base_features(home, away,
                          _odds_stats, _odds_elo, _odds_h2h,
                          league_id, month)

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
                for sfx in ["ph", "pd", "pa"]:
                    k = f"mkt_{sfx}_{source}"
                    feat[k] = _odds_means.get(k, 0.333)
                feat[f"mkt_margin_{source}"] = _odds_means.get(f"mkt_margin_{source}", 1.05)

        feat["has_odds"] = 1.0

        ps_h  = odds.get("PSH")  or odds.get("B365H")
        ps_a  = odds.get("PSA")  or odds.get("B365A")
        avg_h = odds.get("AvgH") or odds.get("B365H")
        avg_a = odds.get("AvgA") or odds.get("B365A")
        max_h = odds.get("MaxH") or odds.get("B365H")
        max_d = odds.get("MaxD") or odds.get("B365D")
        max_a = odds.get("MaxA") or odds.get("B365A")
        b365h = odds.get("B365H")
        b365a = odds.get("B365A")

        if ps_h and b365h and ps_h > 1 and b365h > 1:
            feat["sharp_soft_div_h"] = float(ps_h - b365h)
            feat["sharp_soft_div_a"] = float((ps_a or 0) - (b365a or 0))
            feat["public_fav_h"] = float(feat["sharp_soft_div_h"] > 0.08)
            feat["public_fav_a"] = float(feat["sharp_soft_div_a"] > 0.08)
        else:
            feat["sharp_soft_div_h"] = _odds_means.get("sharp_soft_div_h", 0.0)
            feat["sharp_soft_div_a"] = _odds_means.get("sharp_soft_div_a", 0.0)
            feat["public_fav_h"] = 0.0
            feat["public_fav_a"] = 0.0

        close_h_vals = [v for v in [ps_h, max_h, avg_h, b365h] if v and v > 1]
        close_a_vals = [v for v in [ps_a, max_a, avg_a, b365a] if v and v > 1]
        feat["close_var_h"] = float(np.std(close_h_vals)) if len(close_h_vals) >= 2 else 0.0
        feat["close_var_a"] = float(np.std(close_a_vals)) if len(close_a_vals) >= 2 else 0.0
        feat["high_cov_h"]  = float(feat["close_var_h"] > 0.10)
        feat["high_cov_a"]  = float(feat["close_var_a"] > 0.10)

        if max_h and max_d and max_a and max_h > 1 and max_d > 1 and max_a > 1:
            feat["market_vig"] = float(1/max_h + 1/max_d + 1/max_a - 1)
            feat["low_vig"]    = float(feat["market_vig"] < 0.04)
        else:
            feat["market_vig"] = _odds_means.get("market_vig", 0.05)
            feat["low_vig"]    = 0.0

        ref_h = max_h or ps_h or b365h or 0
        ref_a = max_a or ps_a or b365a or 0
        feat["value_zone_h"] = float(1.60 <= ref_h <= 2.10) if ref_h else 0.0
        feat["value_zone_a"] = float(1.60 <= ref_a <= 2.10) if ref_a else 0.0

        for col in ["ps_move_h","ps_move_a","ps_move_d",
                    "home_steamed","away_steamed","home_drifted","away_drifted",
                    "clv_h","clv_a","reverse_line_h","reverse_line_a",
                    "drift_in_value_h","steam_in_value_a","trap_game_h"]:
            feat[col] = 0.0
    else:
        feat["has_odds"] = 0.0
        for col in _odds_features:
            if col not in feat:
                feat[col] = _odds_means.get(col, 0.0)

    row = {f: feat.get(f, _odds_means.get(f, 0.0)) for f in _odds_features}
    X = pd.DataFrame([row])[_odds_features]
    proba = _odds_model.predict_proba(X)[0]
    return {c: float(p) for c, p in zip(_odds_le.classes_, proba)}


def _implied_prob(odds_val: float) -> float:
    if not odds_val or odds_val <= 1.0:
        return 0.0
    return 1.0 / odds_val


def _kelly(prob: float, odds_decimal: float, fraction: float = 0.5) -> float:
    """Half-Kelly criterion."""
    if odds_decimal <= 1.0 or prob <= 0:
        return 0.0
    b = odds_decimal - 1.0
    q = 1.0 - prob
    f = (b * prob - q) / b
    return round(max(0.0, f * fraction), 4)


# ─── Semnal principal ─────────────────────────────────────────────────────────

def analyze_match(
    home: str,
    away: str,
    odds: dict = None,
    league_id: int = 0,
    month: int = None,
    no_odds_threshold: float = 0.70,
    value_margin: float = 0.05,
) -> dict:
    """Genereaza semnal dual-model pentru un meci."""
    prob_no = _predict_no_odds(home, away, league_id, month)
    prob_od = _predict_odds_model(home, away, odds or {}, league_id, month)

    best_no = max(prob_no, key=prob_no.get)
    best_od = max(prob_od, key=prob_od.get)
    conf_no = prob_no[best_no]
    conf_od = prob_od[best_od]

    ref_odds = None
    if odds:
        ref_map = {
            "H": odds.get("MaxH") or odds.get("B365H"),
            "D": odds.get("MaxD") or odds.get("B365D"),
            "A": odds.get("MaxA") or odds.get("B365A"),
        }
        ref_odds = ref_map.get(best_no)

    implied = _implied_prob(ref_odds) if ref_odds else None
    edge    = round(conf_no - implied, 4) if implied is not None else None
    kelly   = _kelly(conf_no, ref_odds, fraction=0.5) if ref_odds else 0.0

    signal = "NO_BET"
    reason_parts = []

    if conf_no < no_odds_threshold:
        reason_parts.append(
            f"confidence no_odds {conf_no*100:.1f}% < prag {no_odds_threshold*100:.0f}%"
        )
    elif best_no != best_od:
        reason_parts.append(
            f"modele in dezacord: no_odds={best_no} vs market={best_od}"
        )
    elif implied is None:
        reason_parts.append("cote indisponibile")
    elif edge is not None and edge < value_margin:
        reason_parts.append(
            f"edge {edge*100:.1f}% < {value_margin*100:.0f}% minim"
        )
    else:
        signal = best_no
        reason_parts.append(
            f"acord modele {best_no} | no_odds={conf_no*100:.1f}% | "
            f"market={conf_od*100:.1f}% | edge={edge*100:.1f}% | kelly={kelly*100:.1f}%"
        )

    return {
        "match":               f"{home} vs {away}",
        "signal":              signal,
        "confidence_no_odds":  round(conf_no, 4),
        "confidence_market":   round(conf_od, 4),
        "prob_no_odds":        {k: round(v, 4) for k, v in prob_no.items()},
        "prob_market":         {k: round(v, 4) for k, v in prob_od.items()},
        "implied_odds_prob":   round(implied, 4) if implied is not None else None,
        "edge":                edge,
        "kelly_fraction":      kelly,
        "ref_odds":            ref_odds,
        "reason":              " | ".join(reason_parts),
    }


# ─── Fetch live odds din The-Odds-API ────────────────────────────────────────

def fetch_odds_live() -> list[dict]:
    """
    Descarca meciuri + cote pentru urmatoarele 72h.
    Returneaza lista de dicts cu cheile:
      home, away, league, league_code, match_date (ISO), odds {}
    """
    if not ODDS_API_KEY:
        print("EROARE: ODDS_API_KEY lipsa din .env")
        return []

    now      = datetime.datetime.utcnow()
    t_from   = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    t_to     = (now + datetime.timedelta(hours=72)).strftime("%Y-%m-%dT%H:%M:%SZ")

    matches = []

    for sport, league_code in ODDS_SPORT_MAP.items():
        try:
            resp = requests.get(
                f"{ODDS_API_URL}/sports/{sport}/odds/",
                params={
                    "apiKey":           ODDS_API_KEY,
                    "regions":          "eu",
                    "markets":          "h2h",
                    "oddsFormat":       "decimal",
                    "dateFormat":       "iso",
                    "commenceTimeFrom": t_from,
                    "commenceTimeTo":   t_to,
                },
                timeout=10,
            )
        except requests.RequestException as e:
            print(f"  [{league_code}] Eroare retea: {e}")
            continue

        if resp.status_code == 401:
            print("EROARE: ODDS_API_KEY invalid.")
            break
        if resp.status_code == 429:
            print(f"  [{league_code}] Quota Odds API epuizata — opresc fetch.")
            break
        if resp.status_code != 200:
            continue

        events = resp.json()

        for ev in events:
            home_raw = ev.get("home_team", "")
            away_raw = ev.get("away_team", "")
            home = _normalize_team(home_raw, _known_teams)
            away = _normalize_team(away_raw, _known_teams)

            # Aduna cotele de la toti bookmakers
            all_h, all_d, all_a = [], [], []
            b365_h = b365_d = b365_a = None

            for bk in ev.get("bookmakers", []):
                for mkt in bk.get("markets", []):
                    if mkt.get("key") != "h2h":
                        continue
                    outcomes = {o["name"]: o["price"] for o in mkt.get("outcomes", [])}
                    oh = outcomes.get(ev["home_team"])
                    od = outcomes.get("Draw")
                    oa = outcomes.get(ev["away_team"])
                    if oh and od and oa:
                        all_h.append(oh)
                        all_d.append(od)
                        all_a.append(oa)
                        if bk["key"] in ("bet365", "betway"):
                            b365_h, b365_d, b365_a = oh, od, oa

            if not all_h:
                continue

            avg_h = sum(all_h) / len(all_h)
            avg_d = sum(all_d) / len(all_d)
            avg_a = sum(all_a) / len(all_a)
            max_h = max(all_h)
            max_d = max(all_d)
            max_a = max(all_a)

            # Probabilitati implicite normalizate (market-wide)
            vig = 1/avg_h + 1/avg_d + 1/avg_a

            odds = {
                "B365H": b365_h or avg_h,
                "B365D": b365_d or avg_d,
                "B365A": b365_a or avg_a,
                "AvgH":  avg_h, "AvgD": avg_d, "AvgA": avg_a,
                "MaxH":  max_h, "MaxD": max_d, "MaxA": max_a,
                # Probabilitati implicite normalizate
                "impl_h": (1/avg_h) / vig,
                "impl_d": (1/avg_d) / vig,
                "impl_a": (1/avg_a) / vig,
                "margin": vig,
            }

            commence = ev.get("commence_time", "")
            # Determinam luna din data meciului
            try:
                match_dt = datetime.datetime.fromisoformat(commence.replace("Z", "+00:00"))
                match_month = match_dt.month
                match_date_iso = commence
            except Exception:
                match_dt = now
                match_month = now.month
                match_date_iso = now.isoformat()

            matches.append({
                "home":        home,
                "away":        away,
                "home_raw":    home_raw,
                "away_raw":    away_raw,
                "league":      LEAGUE_NAMES.get(league_code, league_code),
                "league_code": league_code,
                "match_date":  match_date_iso,
                "month":       match_month,
                "odds":        odds,
                "odds_event_id": ev.get("id", ""),
            })

    print(f"  Meciuri gasite in urmatoarele 72h: {len(matches)}")
    return matches


# ─── Supabase helpers ─────────────────────────────────────────────────────────

def _get_supabase():
    """Returneaza clientul Supabase sau None daca lipsesc credentialele."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ATENTIE: SUPABASE_URL / SUPABASE_KEY lipsa — DB dezactivat")
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"ATENTIE: Supabase init esuat: {e}")
        return None


def _insert_signal(client, signal: dict, match_info: dict) -> bool:
    """
    Insereaza un semnal BET in Supabase.
    ON CONFLICT (home_team, away_team, match_day) DO NOTHING —
    match_day = coloana date separata (evita problema IMMUTABLE pe timestamptz::date).
    """
    # Extrage data (fara timp) din match_date ISO string
    try:
        match_day = datetime.datetime.fromisoformat(
            match_info["match_date"].replace("Z", "+00:00")
        ).strftime("%Y-%m-%d")
    except Exception:
        match_day = datetime.date.today().isoformat()

    row = {
        "match_date":          match_info["match_date"],
        "match_day":           match_day,
        "home_team":           match_info["home"],
        "away_team":           match_info["away"],
        "league":              match_info["league"],
        "signal":              signal["signal"],
        "confidence_no_odds":  signal["confidence_no_odds"],
        "confidence_market":   signal["confidence_market"],
        "implied_prob":        signal["implied_odds_prob"],
        "edge":                signal["edge"],
        "kelly_fraction":      signal["kelly_fraction"],
        "odds_at_signal":      signal["ref_odds"],
        "reason":              signal["reason"],
        "result":              None,
        "profit_loss":         None,
    }
    try:
        # upsert cu ignore_duplicates = ON CONFLICT DO NOTHING
        client.table("bet_signals").upsert(
            row,
            on_conflict="home_team,away_team,match_day",
            ignore_duplicates=True,
        ).execute()
        return True
    except Exception as e:
        # Fallback: insert simplu (daca upsert nu e suportat de versiunea supabase-py)
        try:
            client.table("bet_signals").insert(row).execute()
            return True
        except Exception as e2:
            err_str = str(e2).lower()
            if "duplicate" in err_str or "unique" in err_str or "23505" in err_str:
                return False  # duplicat — ignoram silentios
            print(f"  DB insert eroare: {e2}")
            return False


# ─── Pipeline principal ───────────────────────────────────────────────────────

def run_pipeline(
    no_odds_threshold: float = 0.70,
    value_margin: float = 0.05,
):
    """Fetch odds → analiza → insert semnale BET in Supabase."""
    load_models()
    client = _get_supabase()

    print("\n>>> Fetch cote live din Odds API...")
    matches = fetch_odds_live()

    if not matches:
        print("  Niciun meci gasit — verifica ODDS_API_KEY si conexiunea.")
        return

    print(f"\n>>> Analiza {len(matches)} meciuri (prag: {no_odds_threshold*100:.0f}% | edge: {value_margin*100:.0f}%)...")

    bets = []
    for m in matches:
        try:
            result = analyze_match(
                home=m["home"],
                away=m["away"],
                odds=m["odds"],
                month=m["month"],
                no_odds_threshold=no_odds_threshold,
                value_margin=value_margin,
            )
        except Exception as e:
            print(f"  [{m['home']} vs {m['away']}] Eroare analiza: {e}")
            continue

        if result["signal"] != "NO_BET":
            bets.append((result, m))

    print(f"\n  Semnale BET gasite: {len(bets)} / {len(matches)} meciuri")

    if not bets:
        print("  Niciun semnal BET azi — criterii prea stricte sau piata eficienta.")
        return

    # Afiseaza primul semnal complet
    first_sig, first_match = bets[0]
    print(f"\n  Primul semnal:")
    print(f"  {json.dumps({**first_sig, 'match_date': first_match['match_date'], 'league': first_match['league']}, indent=4, ensure_ascii=False)}")

    # Insert in Supabase
    if client:
        inserted = 0
        for sig, match_info in bets:
            if _insert_signal(client, sig, match_info):
                inserted += 1
        print(f"\n  Supabase: {inserted} semnale inserate (din {len(bets)} BET).")
    else:
        print("\n  Supabase indisponibil — semnalele nu au fost salvate.")

    print(f"\n{'='*60}")
    print(f"  SUMAR: {len(matches)} meciuri | {len(bets)} semnale BET")
    print(f"{'='*60}\n")


# ─── Update rezultate dupa meci ───────────────────────────────────────────────

def update_results():
    """
    Citeste semnalele pendente din Supabase (result IS NULL, match_date < now).
    Verifica rezultatul real din Odds API scores endpoint.
    Actualizeaza result = W / L / P (pending — date indisponibile inca).
    """
    load_models()
    client = _get_supabase()

    if not client:
        print("Supabase indisponibil.")
        return

    now_iso = datetime.datetime.utcnow().isoformat()

    # Fetch semnale pendente cu meci deja jucat
    try:
        resp = (
            client.table("bet_signals")
            .select("*")
            .is_("result", "null")
            .lt("match_date", now_iso)
            .execute()
        )
        pending = resp.data or []
    except Exception as e:
        print(f"Eroare fetch pendente: {e}")
        return

    if not pending:
        print("Niciun semnal pendent de actualizat.")
        return

    print(f"Semnale pendente de verificat: {len(pending)}")

    # Fetch scoruri din Odds API (ultimele 3 zile)
    scores_map: dict = {}  # (home_raw, away_raw) -> {"home_score": int, "away_score": int, "completed": bool}
    if ODDS_API_KEY:
        for sport in ODDS_SPORT_MAP:
            try:
                resp_s = requests.get(
                    f"{ODDS_API_URL}/sports/{sport}/scores/",
                    params={
                        "apiKey":   ODDS_API_KEY,
                        "daysFrom": 3,
                    },
                    timeout=10,
                )
                if resp_s.status_code == 200:
                    for ev in resp_s.json():
                        if not ev.get("completed"):
                            continue
                        scores = ev.get("scores") or []
                        score_dict = {s["name"]: int(s["score"]) for s in scores if s.get("score") is not None}
                        home_raw = ev.get("home_team", "")
                        away_raw = ev.get("away_team", "")
                        if home_raw and away_raw:
                            scores_map[(home_raw.lower(), away_raw.lower())] = {
                                "home_score": score_dict.get(home_raw),
                                "away_score": score_dict.get(away_raw),
                                "completed":  True,
                            }
            except Exception:
                continue

    print(f"Scoruri disponibile in Odds API: {len(scores_map)}")

    updated_w = updated_l = updated_p = 0

    for row in pending:
        home_raw = (row.get("home_team") or "").lower()
        away_raw = (row.get("away_team") or "").lower()
        signal   = row.get("signal")   # H / D / A
        kelly    = row.get("kelly_fraction") or 0.0
        odds_val = row.get("odds_at_signal") or 0.0

        score_info = scores_map.get((home_raw, away_raw))

        if not score_info:
            # Scorul nu e disponibil inca → marcam P (pending)
            new_result = "P"
            profit     = None
            updated_p += 1
        else:
            hs = score_info.get("home_score")
            as_ = score_info.get("away_score")

            if hs is None or as_ is None:
                new_result = "P"
                profit     = None
                updated_p += 1
            else:
                # Determina rezultatul real
                if hs > as_:
                    actual = "H"
                elif as_ > hs:
                    actual = "A"
                else:
                    actual = "D"

                if actual == signal:
                    new_result = "W"
                    profit     = round((odds_val - 1) * kelly, 4)
                    updated_w += 1
                else:
                    new_result = "L"
                    profit     = round(-kelly, 4)
                    updated_l += 1

        try:
            client.table("bet_signals").update({
                "result":      new_result,
                "profit_loss": profit,
            }).eq("id", row["id"]).execute()
        except Exception as e:
            print(f"  Update eroare [{row.get('id')}]: {e}")

    print(f"\n  Actualizat: {updated_w} W | {updated_l} L | {updated_p} P (asteptam scor)")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "results":
        print(">>> Update rezultate pendente...")
        update_results()
    else:
        run_pipeline()
