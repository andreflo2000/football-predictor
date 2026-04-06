"""
FLOPI SAN — Backend API
"""

import datetime
import time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from predictor import predict_match, load_model, get_known_teams
from fixtures import get_today_fixtures, get_today_odds, _fetch_fixtures_for_range

app = FastAPI(title="Flopi San API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    load_model()


# ─────────────────────────────────────────────
# CACHE simplu in memorie pentru /api/daily
# ─────────────────────────────────────────────
_daily_cache: dict = {}   # {"2024-01-15": {"ts": 123456, "data": {...}}}
CACHE_TTL = 1800          # 30 minute


def _get_cached_daily(date: str):
    entry = _daily_cache.get(date)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _set_cached_daily(date: str, data: dict):
    _daily_cache[date] = {"ts": time.time(), "data": data}


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@app.get("/health")
@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "Flopi San API"}


# ─────────────────────────────────────────────
# LIGI
# ─────────────────────────────────────────────
@app.get("/api/leagues")
def api_leagues():
    return {"leagues": [
        # Div 1
        {"id": 39,  "code": "PL",  "name": "Premier League",   "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "confederation": "UEFA", "rating": 100},
        {"id": 140, "code": "PD",  "name": "La Liga",           "country": "Spain",       "flag": "🇪🇸",       "confederation": "UEFA", "rating": 95},
        {"id": 135, "code": "SA",  "name": "Serie A",           "country": "Italy",       "flag": "🇮🇹",       "confederation": "UEFA", "rating": 90},
        {"id": 78,  "code": "BL1", "name": "Bundesliga",        "country": "Germany",     "flag": "🇩🇪",       "confederation": "UEFA", "rating": 88},
        {"id": 61,  "code": "FL1", "name": "Ligue 1",           "country": "France",      "flag": "🇫🇷",       "confederation": "UEFA", "rating": 82},
        {"id": 2,   "code": "CL",  "name": "Champions League",  "country": "Europe",      "flag": "🏆",        "confederation": "UEFA", "rating": 99},
        {"id": 3,   "code": "EL",  "name": "Europa League",     "country": "Europe",      "flag": "🌍",        "confederation": "UEFA", "rating": 80},
        {"id": 94,  "code": "PPL", "name": "Primeira Liga",     "country": "Portugal",    "flag": "🇵🇹",       "confederation": "UEFA", "rating": 72},
        {"id": 88,  "code": "DED", "name": "Eredivisie",        "country": "Netherlands", "flag": "🇳🇱",       "confederation": "UEFA", "rating": 70},
        # Div 2
        {"id": 40,  "code": "ELC", "name": "Championship",      "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "confederation": "UEFA", "rating": 75},
        {"id": 79,  "code": "BL2", "name": "2. Bundesliga",     "country": "Germany",     "flag": "🇩🇪",       "confederation": "UEFA", "rating": 68},
        {"id": 136, "code": "SB",  "name": "Serie B",           "country": "Italy",       "flag": "🇮🇹",       "confederation": "UEFA", "rating": 65},
        {"id": 62,  "code": "FL2", "name": "Ligue 2",           "country": "France",      "flag": "🇫🇷",       "confederation": "UEFA", "rating": 63},
        {"id": 141, "code": "SD",  "name": "La Liga 2",         "country": "Spain",       "flag": "🇪🇸",       "confederation": "UEFA", "rating": 65},
    ]}


# ─────────────────────────────────────────────
# DAILY PICKS — endpoint principal
# ─────────────────────────────────────────────
@app.get("/api/daily")
def daily_picks(
    date: Optional[str] = None,
    min_confidence: float = Query(0.50, ge=0.0, le=1.0),
):
    """
    Returneaza predictiile zilei, sortate descrescator dupa confidence.
    - date: YYYY-MM-DD (default: azi)
    - min_confidence: prag minim 0.0-1.0 (default: 0.50)

    Confidence levels:
    - >= 0.65  →  HIGH    (acuratete reala ~75%)
    - >= 0.55  →  MEDIUM  (acuratete reala ~65%)
    - < 0.55   →  LOW     (acuratete reala ~57%)
    """
    target = date or datetime.date.today().isoformat()

    cached = _get_cached_daily(f"{target}:{min_confidence}")
    if cached:
        return cached

    known    = get_known_teams()
    fixtures = get_today_fixtures(date=target, known_teams=known)
    # Data reala a meciurilor (poate fi diferita de target daca azi e pauza)
    actual_date = fixtures[0].get("date", target) if fixtures else target
    odds_map = get_today_odds(known_teams=known)   # {} daca nu avem ODDS_API_KEY

    picks  = []
    errors = []

    for fix in fixtures:
        try:
            # Cauta odds pentru acest meci
            key  = (fix["home"].lower(), fix["away"].lower())
            odds = odds_map.get(key)

            result = predict_match(
                home_team=fix["home"],
                away_team=fix["away"],
                odds=odds,
            )

            if result["confidence"] < min_confidence:
                continue

            picks.append({
                "home":             fix["home"],
                "away":             fix["away"],
                "home_raw":         fix.get("home_raw", fix["home"]),
                "away_raw":         fix.get("away_raw", fix["away"]),
                "league":           fix["league"],
                "flag":             fix["flag"],
                "time":             fix.get("time", ""),
                "competition_code": fix.get("competition_code", ""),
                # Predictie
                "home_win":         round(result["home_win"] * 100, 1),
                "draw":             round(result["draw"] * 100, 1),
                "away_win":         round(result["away_win"] * 100, 1),
                "prediction":       result["prediction"],
                "prediction_label": result["prediction_label"],
                "confidence":       round(result["confidence"] * 100, 1),
                "confidence_level": result["confidence_level"],
                "high_confidence":  result["high_confidence"],
                # Team info
                "home_elo":         result.get("home_elo", 1500),
                "away_elo":         result.get("away_elo", 1500),
                "home_form":        round(result.get("home_form", 0.4) * 100, 0),
                "away_form":        round(result.get("away_form", 0.4) * 100, 0),
                "has_odds":         odds is not None,
            })
        except Exception as e:
            errors.append({"match": f"{fix['home']} vs {fix['away']}", "error": str(e)})

    # Sorteaza: HIGH confidence first, then by confidence desc
    picks.sort(key=lambda x: x["confidence"], reverse=True)

    # Statistici
    high_conf  = [p for p in picks if p["confidence"] >= 65]
    med_conf   = [p for p in picks if 55 <= p["confidence"] < 65]
    low_conf   = [p for p in picks if p["confidence"] < 55]

    response = {
        "date":           actual_date,
        "requested_date": target,
        "total_fixtures": len(fixtures),
        "total_picks":    len(picks),
        "high_conf":      len(high_conf),
        "med_conf":       len(med_conf),
        "low_conf":       len(low_conf),
        "picks":          picks,
        "errors":         errors[:5],  # max 5 erori in raspuns
        "cached":         False,
    }

    _set_cached_daily(f"{target}:{min_confidence}", response)
    response["cached"] = False  # prima data e fresh
    return response


# Cache pentru fixtures per liga (TTL 10 minute)
_fixtures_cache: dict = {}
FIXTURES_TTL = 600

LEGACY_MAP = {
    "39": "PL", "78": "BL1", "135": "SA", "140": "PD", "61": "FL1",
    "88": "DED", "94": "PPL", "2": "CL", "3": "EL",
    "40": "ELC", "79": "BL2", "136": "SB", "62": "FL2", "141": "SD",
}


# ─────────────────────────────────────────────
# FIXTURES pentru o liga
# ─────────────────────────────────────────────
@app.get("/api/fixtures/{competition_code}")
def get_fixtures(competition_code: str, date: Optional[str] = None):
    code  = LEGACY_MAP.get(str(competition_code), competition_code.upper())
    base  = datetime.date.fromisoformat(date) if date else datetime.date.today()
    cache_key = f"{code}:{base.isoformat()}"

    # Verifica cache
    cached = _fixtures_cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < FIXTURES_TTL:
        return cached["data"]

    known   = get_known_teams()
    date_to = (base + datetime.timedelta(days=9)).isoformat()   # max 10 zile

    api_debug: dict = {}
    all_fix  = _fetch_fixtures_for_range(base.isoformat(), date_to, known, _debug=api_debug)
    filtered = [f for f in all_fix if f.get("competition_code") == code]
    codes_found = sorted({f.get("competition_code") for f in all_fix})

    result = {
        "fixtures": [
            {
                "id":      idx,
                "home":    f["home"],
                "away":    f["away"],
                "home_id": 0,
                "away_id": 0,
                "date":    f.get("date", base.isoformat()),
                "time":    f.get("time", ""),
            }
            for idx, f in enumerate(filtered)
        ],
        "debug": {
            "code_requested": code,
            "date_from": base.isoformat(),
            "date_to": date_to,
            "http_status": api_debug.get("http_status"),
            "error": api_debug.get("error"),
            "raw_match_count": api_debug.get("raw_match_count", 0),
            "total_parsed": len(all_fix),
            "competition_codes_found": codes_found,
            "filtered_count": len(filtered),
        }
    }

    _fixtures_cache[cache_key] = {"ts": time.time(), "data": result}
    return result


# ─────────────────────────────────────────────
# PREDICȚIE MECI (POST — cu cote optionale)
# ─────────────────────────────────────────────
class MatchRequest(BaseModel):
    home_team: str
    away_team: str
    odds_b365h: Optional[float] = None
    odds_b365d: Optional[float] = None
    odds_b365a: Optional[float] = None
    odds_psh:   Optional[float] = None
    odds_psd:   Optional[float] = None
    odds_psa:   Optional[float] = None
    odds_avgh:  Optional[float] = None
    odds_avgd:  Optional[float] = None
    odds_avga:  Optional[float] = None
    odds_maxh:  Optional[float] = None
    odds_maxd:  Optional[float] = None
    odds_maxa:  Optional[float] = None
    league_id:  int = 0
    month:      Optional[int] = None
    neutral:    bool = False
    tournament: str = "Friendly"


@app.post("/predict")
@app.post("/api/predict")
def predict(req: MatchRequest):
    try:
        odds = None
        if req.odds_b365h and req.odds_b365d and req.odds_b365a:
            odds = {
                "B365H": req.odds_b365h, "B365D": req.odds_b365d, "B365A": req.odds_b365a,
                "PSH":  req.odds_psh  or req.odds_b365h,
                "PSD":  req.odds_psd  or req.odds_b365d,
                "PSA":  req.odds_psa  or req.odds_b365a,
                "AvgH": req.odds_avgh or req.odds_b365h,
                "AvgD": req.odds_avgd or req.odds_b365d,
                "AvgA": req.odds_avga or req.odds_b365a,
                "MaxH": req.odds_maxh or req.odds_b365h,
                "MaxD": req.odds_maxd or req.odds_b365d,
                "MaxA": req.odds_maxa or req.odds_b365a,
            }
        result = predict_match(
            home_team=req.home_team,
            away_team=req.away_team,
            odds=odds,
            league_id=req.league_id,
            month=req.month,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/predict/{home_team}/{away_team}")
@app.get("/api/predict/{home_team}/{away_team}")
def predict_simple(home_team: str, away_team: str):
    try:
        return predict_match(home_team=home_team, away_team=away_team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/predict")
def predict_get(
    home_team: str,
    away_team: str,
    league_id: int = 0,
    home_team_id: Optional[int] = None,
    away_team_id: Optional[int] = None,
):
    """GET variant for frontend — returns nested format expected by page.tsx"""
    try:
        result = predict_match(home_team=home_team, away_team=away_team, league_id=league_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    hw = round(result["home_win"] * 100, 1)
    dr = round(result["draw"] * 100, 1)
    aw = round(result["away_win"] * 100, 1)

    # Use model's attack stats as xG estimate
    xg_home = round(result.get("home_goals_avg", max(0.3, 1.0 + (result["home_win"] - 0.333) * 2.5)), 2)
    xg_away = round(result.get("away_goals_avg", max(0.3, 0.9 + (result["away_win"] - 0.333) * 2.5)), 2)

    home_form_pct = result.get("home_form", 0.4)
    away_form_pct = result.get("away_form", 0.4)

    def form_str(form_val: float) -> list:
        """Convert form 0-1 to list of W/D/L strings for last 5"""
        wins  = round(form_val * 5)
        draws = 1 if wins < 5 else 0
        losses = max(0, 5 - wins - draws)
        res = ['W'] * wins + ['D'] * draws + ['L'] * losses
        return res[:5]

    return {
        "home_team": home_team,
        "away_team": away_team,
        "prediction": {
            "home_win": hw,
            "draw":     dr,
            "away_win": aw,
            "method":   "XGBoost + Elo",
        },
        "top_scores": [
            {"score": "1-0", "probability": round(hw * 0.28)},
            {"score": "2-1", "probability": round(hw * 0.20)},
            {"score": "1-1", "probability": round(dr * 0.45)},
            {"score": "0-0", "probability": round(dr * 0.30)},
            {"score": "0-1", "probability": round(aw * 0.28)},
            {"score": "0-2", "probability": round(aw * 0.20)},
        ],
        "expected_goals": {
            "home": xg_home,
            "away": xg_away,
        },
        "home_stats": {
            "form":        form_str(home_form_pct),
            "elo_rating":  result.get("home_elo", 1500),
            "goals_avg":   xg_home,
            "xg_for":      xg_home,
            "xg_against":  xg_away * 0.8,
        },
        "away_stats": {
            "form":        form_str(away_form_pct),
            "elo_rating":  result.get("away_elo", 1500),
            "goals_avg":   xg_away,
            "xg_for":      xg_away,
            "xg_against":  xg_home * 0.8,
        },
        "confidence":       round(result["confidence"] * 100, 1),
        "confidence_level": result.get("confidence_level", "LOW"),
        "model_breakdown": {
            "xgboost": {"home_win": hw, "draw": dr, "away_win": aw},
        },
    }


# ─────────────────────────────────────────────
# STANDINGS stub (nu avem date live de clasament)
# ─────────────────────────────────────────────
@app.get("/api/standings/{league}")
def api_standings(league: str):
    """Returns empty standings — no live standings data source yet."""
    return {"standings": [], "league": league, "note": "Standings not available"}


# ─────────────────────────────────────────────
# PREDICȚII BATCH cu filtrare confidence
# ─────────────────────────────────────────────
class BatchRequest(BaseModel):
    matches: list[dict]
    min_confidence: float = 0.0


@app.post("/api/predict/batch")
def predict_batch(req: BatchRequest):
    results = []
    for m in req.matches:
        try:
            odds = None
            if m.get("odds_b365h") and m.get("odds_b365d") and m.get("odds_b365a"):
                odds = {
                    "B365H": m["odds_b365h"], "B365D": m["odds_b365d"], "B365A": m["odds_b365a"],
                    "PSH": m.get("odds_psh", m["odds_b365h"]),
                    "PSD": m.get("odds_psd", m["odds_b365d"]),
                    "PSA": m.get("odds_psa", m["odds_b365a"]),
                    "AvgH": m.get("odds_avgh", m["odds_b365h"]),
                    "AvgD": m.get("odds_avgd", m["odds_b365d"]),
                    "AvgA": m.get("odds_avga", m["odds_b365a"]),
                    "MaxH": m.get("odds_maxh", m["odds_b365h"]),
                    "MaxD": m.get("odds_maxd", m["odds_b365d"]),
                    "MaxA": m.get("odds_maxa", m["odds_b365a"]),
                }
            result = predict_match(
                home_team=m["home_team"],
                away_team=m["away_team"],
                odds=odds,
                league_id=m.get("league_id", 0),
                month=m.get("month"),
            )
            if result["confidence"] >= req.min_confidence:
                results.append(result)
        except Exception:
            continue
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return {"count": len(results), "min_confidence": req.min_confidence, "predictions": results}


# ─────────────────────────────────────────────
# DEBUG — starea API-urilor externe
# ─────────────────────────────────────────────
@app.get("/api/debug")
def debug_status():
    import os, requests as req
    fd_key   = os.getenv("FOOTBALL_DATA_KEY", "")
    odds_key = os.getenv("ODDS_API_KEY", "")

    result = {
        "football_data_key_set": bool(fd_key),
        "odds_api_key_set":      bool(odds_key),
        "football_data_status":  None,
        "football_data_matches": None,
    }

    if fd_key:
        try:
            import datetime
            today = datetime.date.today().isoformat()
            r = req.get(
                "https://api.football-data.org/v4/matches",
                headers={"X-Auth-Token": fd_key},
                params={"dateFrom": today, "dateTo": today},
                timeout=10,
            )
            result["football_data_status"] = r.status_code
            if r.status_code == 200:
                data = r.json()
                result["football_data_matches"] = len(data.get("matches", []))
                result["competitions_today"] = list({
                    m.get("competition", {}).get("code", "?")
                    for m in data.get("matches", [])
                })
        except Exception as e:
            result["football_data_error"] = str(e)

    return result


# ─────────────────────────────────────────────
# ECHIPE CUNOSCUTE
# ─────────────────────────────────────────────
@app.get("/teams")
@app.get("/api/teams")
def teams():
    return {"teams": get_known_teams()}
