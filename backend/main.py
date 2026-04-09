"""
OXIANO — Backend API
"""

import os
import datetime
import time
import logging
from fastapi import FastAPI, HTTPException, Query, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import sentry_sdk

from predictor import predict_match, load_model, get_known_teams
from fixtures import get_today_fixtures, get_today_odds, _fetch_fixtures_for_range
from db import log_predictions_bulk, get_client
import cache as redis_cache
from auth import register_user, login_user, get_current_user, require_user
from ingestion import compute_and_store_picks, load_picks_from_db, auto_mark_results

logger = logging.getLogger(__name__)

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

# ── Sentry (erori in productie) ─────────────────────────────
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1)

# ── Rate limiter ─────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(title="Oxiano API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = [
    "https://oxiano.com",
    "https://www.oxiano.com",
    # development local
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "stripe-signature"],
    allow_credentials=True,
    max_age=600,  # cache preflight 10 minute
)


@app.on_event("startup")
async def startup_event():
    load_model()
    # Goleste cache la fiecare restart — evita date invechite
    try:
        import cache as _c
        for ns in ("daily", "fixtures"):
            import datetime as _dt
            today_str = _dt.date.today().isoformat()
            _c.delete(ns, f"{today_str}:0.5")
            _c.delete(ns, f"{today_str}:0.45")
    except Exception:
        pass

    # Porneste scheduler pentru pre-calculul zilnic
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone="Europe/Bucharest")

        # Calculeaza la 07:00 si 13:00 in fiecare zi
        scheduler.add_job(compute_and_store_picks, CronTrigger(hour=7,  minute=0))
        scheduler.add_job(compute_and_store_picks, CronTrigger(hour=13, minute=0))
        # Auto-marcare WIN/LOSS la 23:30 dupa terminarea majoritatii meciurilor
        scheduler.add_job(auto_mark_results, CronTrigger(hour=23, minute=30))

        scheduler.start()
        logger.info("Scheduler pornit: pre-calcul picks la 07:00 si 13:00")

        # Pre-calcul la startup cu delay — asteptam DNS-ul sa fie gata
        import threading
        def _delayed_compute():
            import time
            time.sleep(15)
            compute_and_store_picks()
        threading.Thread(target=_delayed_compute, daemon=True).start()
    except Exception as e:
        logger.warning("Scheduler init failed: %s", e)


CACHE_TTL_DAILY    = 1800   # 30 minute
CACHE_TTL_FIXTURES = 600    # 10 minute


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@app.get("/")
@app.head("/")
@app.get("/health")
@app.get("/api/health")
def api_health():
    import datetime as _dt
    return {"status": "ok", "service": "Oxiano API", "ts": _dt.datetime.utcnow().isoformat()}

@app.get("/ping")
@app.head("/ping")
def ping():
    """Keep-alive endpoint — pinged every 5 min by UptimeRobot."""
    return "pong"


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
class AuthRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
@limiter.limit("5/minute")
def auth_register(req: AuthRequest, request: Request):
    """Inregistrare cont nou."""
    if len(req.password) < 6:
        raise HTTPException(400, "Parola trebuie sa aiba minim 6 caractere")
    return register_user(req.email, req.password)


@app.post("/api/auth/login")
@limiter.limit("10/minute")
def auth_login(req: AuthRequest, request: Request):
    """Login — returneaza JWT token."""
    return login_user(req.email, req.password)


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(require_user)):
    """Returneaza datele utilizatorului curent."""
    return user


@app.delete("/api/auth/account")
def auth_delete_account(user: dict = Depends(require_user)):
    """Sterge contul si toate datele asociate (GDPR Art. 17)."""
    from db import get_client
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    try:
        uid = int(user["id"])
        client.table("predictions").delete().eq("user_id", uid).execute()
        client.table("users").delete().eq("id", uid).execute()
        return {"message": "Contul și datele tale au fost șterse complet."}
    except Exception as e:
        raise HTTPException(500, f"Eroare la ștergere: {str(e)}")


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
        # Div 2 (doar Championship disponibil pe free tier)
        {"id": 40,  "code": "ELC", "name": "Championship",      "country": "England",     "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "confederation": "UEFA", "rating": 75},
    ]}


# ─────────────────────────────────────────────
# DAILY PICKS — endpoint principal
# ─────────────────────────────────────────────

def _mask_vip_picks(picks: list, user: Optional[dict]) -> list:
    """Mascheaza datele vip_only pentru useri non-pro/vip."""
    tier = (user or {}).get("tier", "free")
    if tier in ("pro", "vip"):
        return picks
    result = []
    for p in picks:
        if p.get("vip_only"):
            result.append({
                **p,
                "home_win": None, "draw": None, "away_win": None,
                "prediction": None, "prediction_label": "VIP",
                "confidence": None, "confidence_level": "vip",
                "high_confidence": False,
                "home_elo": None, "away_elo": None,
                "home_form": None, "away_form": None,
                "edge": None, "value_bet": None,
                "market_signal": None, "upset_risk": None,
            })
        else:
            result.append(p)
    return result


@app.get("/api/daily")
@limiter.limit("30/minute")
def daily_picks(
    request: Request,
    date: Optional[str] = None,
    min_confidence: float = Query(0.50, ge=0.0, le=1.0),
    user: Optional[dict] = Depends(get_current_user),
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

    cache_key = f"{target}:{min_confidence}"

    # 1. Redis cache (cel mai rapid)
    cached = redis_cache.get("daily", cache_key)
    if cached:
        return {**cached, "picks": _mask_vip_picks(cached["picks"], user)}

    # 2. Supabase daily_picks (pre-calculat de scheduler)
    db_data = load_picks_from_db(target)
    if db_data:
        # Aplica filtrul de confidence
        all_picks = db_data["picks"]
        filtered  = [p for p in all_picks if p["confidence"] >= min_confidence * 100]
        db_data["picks"]       = filtered
        db_data["total_picks"] = len(filtered)
        db_data["high_conf"]   = len([p for p in filtered if p["confidence"] >= 65])
        db_data["med_conf"]    = len([p for p in filtered if 55 <= p["confidence"] < 65])
        db_data["low_conf"]    = len([p for p in filtered if p["confidence"] < 55])
        redis_cache.set("daily", cache_key, db_data, ttl=CACHE_TTL_DAILY)
        return {**db_data, "picks": _mask_vip_picks(db_data["picks"], user)}

    # 3. Calcul live (fallback daca DB nu are date)
    known    = get_known_teams()
    fixtures = get_today_fixtures(date=target, known_teams=known)
    actual_date = fixtures[0].get("date", target) if fixtures else target
    odds_map = get_today_odds(known_teams=known)

    picks  = []
    errors = []

    for fix in fixtures:
        try:
            key  = (fix["home"].lower(), fix["away"].lower())
            odds = odds_map.get(key)
            result = predict_match(home_team=fix["home"], away_team=fix["away"], odds=odds)

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
                "home_win":         round(result["home_win"] * 100, 1),
                "draw":             round(result["draw"] * 100, 1),
                "away_win":         round(result["away_win"] * 100, 1),
                "prediction":       result["prediction"],
                "prediction_label": result["prediction_label"],
                "confidence":       round(result["confidence"] * 100, 1),
                "confidence_level": result["confidence_level"],
                "high_confidence":  result["high_confidence"],
                "home_elo":         result.get("home_elo", 1500),
                "away_elo":         result.get("away_elo", 1500),
                "home_form":        round(result.get("home_form", 0.4) * 100, 0),
                "away_form":        round(result.get("away_form", 0.4) * 100, 0),
                "has_odds":         odds is not None,
                "vip_only":         False,
                "model_version":    "xgb-v1",
                "edge":             result.get("edge", 0.0),
                "value_bet":        result.get("value_bet", False),
                "market_signal":    result.get("market_signal", "NO_ODDS"),
                "upset_risk":       result.get("upset_risk", False),
            })
        except Exception as e:
            errors.append({"match": f"{fix['home']} vs {fix['away']}", "error": str(e)})

    picks.sort(key=lambda x: x["confidence"], reverse=True)

    # CLV logging
    if picks:
        try:
            log_predictions_bulk(picks, actual_date)
        except Exception:
            pass

    high_conf = [p for p in picks if p["confidence"] >= 65]
    med_conf  = [p for p in picks if 55 <= p["confidence"] < 65]
    low_conf  = [p for p in picks if p["confidence"] < 55]

    response = {
        "date":           actual_date,
        "requested_date": target,
        "total_fixtures": len(fixtures),
        "total_picks":    len(picks),
        "high_conf":      len(high_conf),
        "med_conf":       len(med_conf),
        "low_conf":       len(low_conf),
        "picks":          picks,
        "errors":         errors[:5],
        "cached":         False,
        "source":         "live",
    }

    redis_cache.set("daily", cache_key, response, ttl=CACHE_TTL_DAILY)
    return {**response, "picks": _mask_vip_picks(response["picks"], user)}


LEGACY_MAP = {
    "39": "PL", "78": "BL1", "135": "SA", "140": "PD", "61": "FL1",
    "88": "DED", "94": "PPL", "2": "CL", "3": "EL",
    "40": "ELC", "79": "BL2", "136": "SB", "62": "FL2", "141": "SD",
}


# ─────────────────────────────────────────────
# FIXTURES pentru o liga
# ─────────────────────────────────────────────
@app.get("/api/fixtures/{competition_code}")
@limiter.limit("20/minute")
def get_fixtures(request: Request, competition_code: str, date: Optional[str] = None):
    code  = LEGACY_MAP.get(str(competition_code), competition_code.upper())
    base  = datetime.date.fromisoformat(date) if date else datetime.date.today()
    cache_key = f"{code}:{base.isoformat()}"

    cached = redis_cache.get("fixtures", cache_key)
    if cached:
        return cached

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

    redis_cache.set("fixtures", cache_key, result, ttl=CACHE_TTL_FIXTURES)
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
@limiter.limit("20/minute")
def predict(req: MatchRequest, request: Request):
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

    import math

    hw = round(result["home_win"] * 100, 1)
    dr = round(result["draw"] * 100, 1)
    aw = round(result["away_win"] * 100, 1)

    xg_home = round(result.get("home_goals_avg", max(0.3, 1.0 + (result["home_win"] - 0.333) * 2.5)), 2)
    xg_away = round(result.get("away_goals_avg", max(0.3, 0.9 + (result["away_win"] - 0.333) * 2.5)), 2)

    home_elo = result.get("home_elo", 1500)
    away_elo = result.get("away_elo", 1500)
    home_form_pct = result.get("home_form", 0.4)
    away_form_pct = result.get("away_form", 0.4)

    # ── Elo model (formula clasica Bradley-Terry) ──────────────
    elo_diff = home_elo - away_elo
    elo_hw   = round(1 / (1 + 10 ** (-elo_diff / 400)) * 100, 1)
    elo_aw   = round(1 / (1 + 10 ** (elo_diff / 400)) * 100, 1)
    elo_dr   = round(max(0, 100 - elo_hw - elo_aw), 1)
    # Redistribuim draw mai realist (15-25% din spatiu)
    draw_share = min(28, max(15, 22 - abs(elo_diff) * 0.02))
    elo_hw2 = round((elo_hw / (elo_hw + elo_aw)) * (100 - draw_share), 1)
    elo_aw2 = round((elo_aw / (elo_hw + elo_aw)) * (100 - draw_share), 1)
    elo_dr2 = round(100 - elo_hw2 - elo_aw2, 1)

    # ── Poisson model (Dixon-Coles simplificat) ────────────────
    def poisson_pmf(lam: float, k: int) -> float:
        return (lam ** k) * math.exp(-lam) / math.factorial(k)

    p_home, p_draw, p_away = 0.0, 0.0, 0.0
    for i in range(8):
        for j in range(8):
            p = poisson_pmf(xg_home, i) * poisson_pmf(xg_away, j)
            if i > j:   p_home += p
            elif i == j: p_draw += p
            else:        p_away += p
    poi_hw = round(p_home * 100, 1)
    poi_dr = round(p_draw * 100, 1)
    poi_aw = round(p_away * 100, 1)

    def form_str(form_val: float) -> list:
        wins   = round(form_val * 5)
        draws  = 1 if wins < 5 else 0
        losses = max(0, 5 - wins - draws)
        return (['W'] * wins + ['D'] * draws + ['L'] * losses)[:5]

    return {
        "home_team": home_team,
        "away_team": away_team,
        "prediction": {
            "home_win": hw,
            "draw":     dr,
            "away_win": aw,
            "method":   "XGBoost + Elo + Poisson",
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
            "elo_rating":  home_elo,
            "goals_avg":   xg_home,
            "xg_for":      xg_home,
            "xg_against":  xg_away * 0.8,
        },
        "away_stats": {
            "form":        form_str(away_form_pct),
            "elo_rating":  away_elo,
            "goals_avg":   xg_away,
            "xg_for":      xg_away,
            "xg_against":  xg_home * 0.8,
        },
        "confidence":       round(result["confidence"] * 100, 1),
        "confidence_level": result.get("confidence_level", "LOW"),
        "model_breakdown": {
            "xgboost": {"home_win": hw,      "draw": dr,      "away_win": aw},
            "elo":     {"home_win": elo_hw2, "draw": elo_dr2, "away_win": elo_aw2},
            "poisson": {"home_win": poi_hw,  "draw": poi_dr,  "away_win": poi_aw},
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
# TRACK RECORD
# ─────────────────────────────────────────────
@app.get("/api/track-record")
def track_record():
    """Statistici acuratete live din tabelul predictions."""
    from db import get_client
    import datetime as _dt
    client = get_client()
    if client is None:
        return {"total": 0, "tracking_since": "Aprilie 2026"}
    try:
        rows = client.table("predictions").select("confidence, result").execute()
        data = rows.data or []
        resolved = [r for r in data if r.get("result") in ("WIN", "LOSS")]

        high = [r for r in resolved if r["confidence"] >= 0.65]
        med  = [r for r in resolved if 0.55 <= r["confidence"] < 0.65]

        def acc(lst):
            wins = sum(1 for r in lst if r["result"] == "WIN")
            return round(wins / len(lst) * 100, 1) if lst else 0

        # Prima predictie logata
        first_row = client.table("predictions").select("created_at").order("created_at").limit(1).execute()
        since = first_row.data[0]["created_at"][:10] if first_row.data else "Aprilie 2026"
        days  = (datetime.date.today() - datetime.date.fromisoformat(since)).days if since != "Aprilie 2026" else 0

        # Citeste si din pick_results (WIN/LOSS marcate de admin)
        pr_rows = client.table("pick_results").select("confidence, result").execute()
        pr_data = pr_rows.data or []
        pr_resolved = [r for r in pr_data if r.get("result") in ("win", "loss")]

        # Combina ambele surse
        all_resolved = resolved + [
            {"confidence": r.get("confidence", 0.6), "result": "WIN" if r["result"] == "win" else "LOSS"}
            for r in pr_resolved
        ]
        all_high = [r for r in all_resolved if r["confidence"] >= 0.65]
        all_med  = [r for r in all_resolved if 0.55 <= r["confidence"] < 0.65]

        return {
            "total":               len(all_resolved),
            "high_conf_total":     len(all_high),
            "high_conf_wins":      sum(1 for r in all_high if r["result"] == "WIN"),
            "high_conf_accuracy":  acc(all_high),
            "med_conf_total":      len(all_med),
            "med_conf_wins":       sum(1 for r in all_med if r["result"] == "WIN"),
            "med_conf_accuracy":   acc(all_med),
            "tracking_since":      since,
            "days_tracked":        days,
        }
    except Exception as e:
        return {"total": 0, "tracking_since": "Aprilie 2026", "error": str(e)}


@app.get("/api/track-record/history")
def track_record_history(limit: int = Query(100, le=500)):
    """Returneaza istoricul individual al pick-urilor marcate WIN/LOSS/VOID."""
    client = get_client()
    if client is None:
        return {"results": []}
    try:
        rows = client.table("pick_results").select("*").order("pick_date", desc=True).limit(limit).execute()
        data = rows.data or []

        # Calculeaza equity curve (stake fix 1 unitate, odds medii 2.0)
        results = []
        running_units = 0.0
        for r in reversed(data):  # cronologic pentru equity
            if r["result"] == "win":
                running_units += 1.0
            elif r["result"] == "loss":
                running_units -= 1.0
            results.append({
                "date":         r["pick_date"],
                "home":         r["home"],
                "away":         r["away"],
                "result":       r["result"],
                "confidence":   round(r.get("confidence", 0.6) * 100, 1),
                "actual_score": r.get("actual_score", ""),
                "equity":       round(running_units, 2),
            })

        results.reverse()  # cel mai recent primul

        resolved = [r for r in data if r["result"] in ("win", "loss")]
        wins = sum(1 for r in resolved if r["result"] == "win")
        high = [r for r in resolved if r.get("confidence", 0) >= 0.65]
        high_wins = sum(1 for r in high if r["result"] == "win")

        return {
            "results": results,
            "summary": {
                "total":         len(resolved),
                "wins":          wins,
                "losses":        len(resolved) - wins,
                "accuracy":      round(wins / len(resolved) * 100, 1) if resolved else 0,
                "high_conf_accuracy": round(high_wins / len(high) * 100, 1) if high else 0,
                "final_equity":  round(running_units, 2),
            }
        }
    except Exception as e:
        return {"results": [], "error": str(e)}


# ─────────────────────────────────────────────
# ADMIN — marcare rezultate WIN/LOSS
# ─────────────────────────────────────────────
class PickResultRequest(BaseModel):
    pick_date: str           # YYYY-MM-DD
    home: str
    away: str
    result: str              # 'win' | 'loss' | 'void'
    confidence: float = 0.6  # 0.0-1.0
    actual_score: Optional[str] = None


@app.post("/api/admin/picks/result")
def admin_set_pick_result(
    req: PickResultRequest,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    """Marcheaza rezultatul unui pick (WIN/LOSS). Necesita X-Admin-Key header."""
    if not ADMIN_SECRET or x_admin_key != ADMIN_SECRET:
        raise HTTPException(403, "Unauthorized")
    if req.result not in ("win", "loss", "void"):
        raise HTTPException(400, "result must be win, loss, or void")
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    try:
        client.table("pick_results").upsert({
            "pick_date":    req.pick_date,
            "home":         req.home,
            "away":         req.away,
            "result":       req.result,
            "confidence":   req.confidence,
            "actual_score": req.actual_score,
        }, on_conflict="pick_date,home,away").execute()
        return {"ok": True, "saved": f"{req.home} vs {req.away} ({req.pick_date}) = {req.result}"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/admin/picks/auto-results")
def admin_auto_results(
    date: Optional[str] = None,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    """Trigger manual auto-marcare WIN/LOSS pentru o data. Necesita X-Admin-Key."""
    if not ADMIN_SECRET or x_admin_key != ADMIN_SECRET:
        raise HTTPException(403, "Unauthorized")
    result = auto_mark_results(date)
    return result


@app.get("/api/admin/picks/results")
def admin_get_pick_results(
    date: Optional[str] = None,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    """Lista rezultatele salvate. Necesita X-Admin-Key header."""
    if not ADMIN_SECRET or x_admin_key != ADMIN_SECRET:
        raise HTTPException(403, "Unauthorized")
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    try:
        q = client.table("pick_results").select("*").order("pick_date", desc=True)
        if date:
            q = q.eq("pick_date", date)
        rows = q.execute()
        return {"results": rows.data or []}
    except Exception as e:
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────
# TRACKED MATCHES — tracker personal al userului
# ─────────────────────────────────────────────
class TrackedMatchRequest(BaseModel):
    home: str
    away: str
    league: str
    flag: str = "⚽"
    date: str
    time: str = ""
    prediction: str
    market: str = "1X2"


class MatchResultUpdate(BaseModel):
    result: str   # 'pending' | 'correct' | 'wrong'


@app.get("/api/tracked-matches")
def get_tracked_matches(user: dict = Depends(require_user)):
    """Returneaza toate meciurile tracked ale userului curent."""
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    rows = client.table("tracked_matches").select("*").eq("user_id", user["id"]).order("added_at", desc=True).execute()
    return {"matches": rows.data or []}


@app.post("/api/tracked-matches")
def add_tracked_match(req: TrackedMatchRequest, user: dict = Depends(require_user)):
    """Adauga un meci in tracker-ul personal."""
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    row = client.table("tracked_matches").insert({
        "user_id":    user["id"],
        "home":       req.home,
        "away":       req.away,
        "league":     req.league,
        "flag":       req.flag,
        "date":       req.date,
        "time":       req.time,
        "prediction": req.prediction,
        "market":     req.market,
        "result":     "pending",
        "added_at":   datetime.date.today().isoformat(),
    }).execute()
    return row.data[0]


@app.patch("/api/tracked-matches/{match_id}")
def update_tracked_match(match_id: int, body: MatchResultUpdate, user: dict = Depends(require_user)):
    """Actualizeaza rezultatul unui meci tracked."""
    if body.result not in ("pending", "correct", "wrong"):
        raise HTTPException(400, "result must be pending, correct, or wrong")
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    existing = client.table("tracked_matches").select("user_id").eq("id", match_id).execute()
    if not existing.data or str(existing.data[0]["user_id"]) != str(user["id"]):
        raise HTTPException(404, "Not found")
    client.table("tracked_matches").update({"result": body.result}).eq("id", match_id).execute()
    return {"ok": True}


@app.delete("/api/tracked-matches/{match_id}")
def delete_tracked_match(match_id: int, user: dict = Depends(require_user)):
    """Sterge un meci din tracker."""
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    existing = client.table("tracked_matches").select("user_id").eq("id", match_id).execute()
    if not existing.data or str(existing.data[0]["user_id"]) != str(user["id"]):
        raise HTTPException(404, "Not found")
    client.table("tracked_matches").delete().eq("id", match_id).execute()
    return {"ok": True}


@app.delete("/api/tracked-matches")
def clear_tracked_matches(user: dict = Depends(require_user)):
    """Sterge toate meciurile tracked ale userului."""
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")
    client.table("tracked_matches").delete().eq("user_id", user["id"]).execute()
    return {"ok": True}


# ─────────────────────────────────────────────
# GUMROAD CHECKOUT
# ─────────────────────────────────────────────
GUMROAD_PRODUCTS = {
    "analyst": {
        "permalink": "xzbxnc",
        "url":       "https://florianparv.gumroad.com/l/xzbxnc",
        "name":      "Analyst",
        "price_usd": 6,
        "tier":      "analyst",
    },
    "pro": {
        "permalink": "lnjfx",
        "url":       "https://florianparv.gumroad.com/l/lnjfx",
        "name":      "Pro",
        "price_usd": 17,
        "tier":      "pro",
    },
}


@app.get("/api/stripe/plans")
def gumroad_plans():
    """Returneaza planurile disponibile."""
    return {
        k: {
            "name":      v["name"],
            "price_usd": v["price_usd"],
            "tier":      v["tier"],
        }
        for k, v in GUMROAD_PRODUCTS.items()
    }


class CheckoutRequest(BaseModel):
    plan: str   # "analyst" | "pro"


@app.post("/api/checkout/session")
@limiter.limit("10/minute")
def create_checkout_session(
    req: CheckoutRequest,
    request: Request,
    user: dict = Depends(require_user),
):
    """Returneaza URL-ul Gumroad pentru checkout. Necesita autentificare."""
    plan = GUMROAD_PRODUCTS.get(req.plan)
    if not plan:
        raise HTTPException(400, f"Plan necunoscut: {req.plan}")

    # Trimitem email-ul userului catre Gumroad pentru pre-fill
    import urllib.parse
    params = urllib.parse.urlencode({
        "email":   user["email"],
        "wanted":  "true",
        # user_id ca referinta pentru webhook
        "referral_code": str(user["id"]),
    })
    checkout_url = f"{plan['url']}?{params}"

    return {"url": checkout_url}


@app.post("/api/webhook/gumroad")
async def gumroad_webhook(request: Request):
    """
    Ping Gumroad — upgradeaza/downgradeaza tier dupa events de plata.
    Setat in Gumroad Settings → Advanced → Ping.
    """
    try:
        body = await request.body()
        # Gumroad trimite form-encoded
        from urllib.parse import parse_qs
        data = {k: v[0] for k, v in parse_qs(body.decode("utf-8")).items()}
    except Exception:
        raise HTTPException(400, "Payload invalid")

    email        = data.get("email", "")
    permalink    = data.get("product_permalink", "")
    cancelled    = data.get("cancelled", "false").lower() == "true"
    refunded     = data.get("refunded", "false").lower() == "true"

    logger.info("[gumroad] Ping: permalink=%s email=%s cancelled=%s", permalink, email, cancelled)

    if not email:
        return {"received": True}

    # Identifica tier-ul din permalink
    tier = "free"
    for plan_key, plan_data in GUMROAD_PRODUCTS.items():
        if plan_data["permalink"] == permalink:
            tier = plan_data["tier"]
            break

    client = get_client()
    if not client:
        return {"received": True}

    try:
        rows = client.table("users").select("id").eq("email", email).execute()
        if not rows.data:
            logger.warning("[gumroad] User negasit pentru email: %s", email)
            return {"received": True}

        user_id = rows.data[0]["id"]

        if cancelled or refunded:
            client.table("users").update({"tier": "free"}).eq("id", user_id).execute()
            logger.info("[gumroad] Downgraded user %s → free", user_id)
        else:
            client.table("users").update({"tier": tier}).eq("id", user_id).execute()
            logger.info("[gumroad] Upgraded user %s → %s", user_id, tier)

    except Exception as e:
        logger.error("[gumroad] DB update failed: %s", e)

    return {"received": True}


# ─────────────────────────────────────────────
# ECHIPE CUNOSCUTE
# ─────────────────────────────────────────────
@app.get("/teams")
@app.get("/api/teams")
def teams():
    return {"teams": get_known_teams()}
