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
from fixtures import get_today_fixtures, get_today_odds

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
        {"id": "PL",  "name": "Premier League"},
        {"id": "BL1", "name": "Bundesliga"},
        {"id": "SA",  "name": "Serie A"},
        {"id": "PD",  "name": "La Liga"},
        {"id": "FL1", "name": "Ligue 1"},
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


# ─────────────────────────────────────────────
# FIXTURES pentru o liga (compatibilitate frontend vechi)
# ─────────────────────────────────────────────
@app.get("/api/fixtures/{competition_code}")
def get_fixtures(competition_code: str, date: Optional[str] = None):
    target = date or datetime.date.today().isoformat()
    known  = get_known_teams()
    all_fix = get_today_fixtures(date=target, known_teams=known)
    # Filtreaza dupa competition_code (sau liga ID din vechi frontend)
    LEGACY_MAP = {
        "39": "PL", "78": "BL1", "135": "SA", "140": "PD", "61": "FL1",
        "88": "DED", "94": "PPL", "2": "CL", "3": "EL",
    }
    code = LEGACY_MAP.get(str(competition_code), competition_code.upper())
    filtered = [f for f in all_fix if f.get("competition_code") == code]
    return {"fixtures": [
        {"home": f["home"], "away": f["away"], "date": target, "time": f.get("time", "")}
        for f in filtered
    ]}


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
