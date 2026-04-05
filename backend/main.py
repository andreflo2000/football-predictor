"""
FLOPI SAN — Backend API
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from predictor import predict_match, load_model, get_known_teams

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
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.get("/health")
@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "Flopi San API"}


# ─────────────────────────────────────────────
# LIGI DISPONIBILE
# ─────────────────────────────────────────────
@app.get("/api/leagues")
def api_leagues():
    return {"leagues": [
        {"id": "PL",  "name": "Premier League"},
        {"id": "PD",  "name": "La Liga"},
        {"id": "SA",  "name": "Serie A"},
        {"id": "BL1", "name": "Bundesliga"},
        {"id": "FL1", "name": "Ligue 1"},
    ]}


# ─────────────────────────────────────────────
# PREDICȚIE MECI (POST — cu cote optionale)
# ─────────────────────────────────────────────
class MatchRequest(BaseModel):
    home_team: str
    away_team: str
    # Cote optionale (bookmakers)
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
    """
    Predicție meci. Dacă sunt furnizate cote, acuratețea crește semnificativ.

    Exemple confidence:
    - >= 60%: acuratete ~70% (18% din meciuri)
    - >= 65%: acuratete ~75% (12% din meciuri)
    - >= 70%: acuratete ~78% (8% din meciuri)
    """
    try:
        odds = None
        if req.odds_b365h and req.odds_b365d and req.odds_b365a:
            odds = {
                "B365H": req.odds_b365h, "B365D": req.odds_b365d, "B365A": req.odds_b365a,
                "PSH":   req.odds_psh   or req.odds_b365h,
                "PSD":   req.odds_psd   or req.odds_b365d,
                "PSA":   req.odds_psa   or req.odds_b365a,
                "AvgH":  req.odds_avgh  or req.odds_b365h,
                "AvgD":  req.odds_avgd  or req.odds_b365d,
                "AvgA":  req.odds_avga  or req.odds_b365a,
                "MaxH":  req.odds_maxh  or req.odds_b365h,
                "MaxD":  req.odds_maxd  or req.odds_b365d,
                "MaxA":  req.odds_maxa  or req.odds_b365a,
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


# ─────────────────────────────────────────────
# PREDICȚIE SIMPLĂ (GET — ușor de testat)
# ─────────────────────────────────────────────
@app.get("/predict/{home_team}/{away_team}")
@app.get("/api/predict/{home_team}/{away_team}")
def predict_simple(home_team: str, away_team: str):
    try:
        return predict_match(home_team=home_team, away_team=away_team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# PREDICȚII MULTIPLE CU FILTRARE CONFIDENCE
# ─────────────────────────────────────────────
class BatchRequest(BaseModel):
    matches: list[dict]  # lista de {home_team, away_team, odds_b365h, ...}
    min_confidence: float = 0.0  # 0.0 = toate, 0.60 = high confidence only


@app.post("/api/predict/batch")
def predict_batch(req: BatchRequest):
    """
    Predicții multiple cu filtrare opțională după confidence.
    Util pentru a afișa doar meciurile cu confidence ridicată.
    """
    results = []
    for m in req.matches:
        try:
            odds = None
            if m.get("odds_b365h") and m.get("odds_b365d") and m.get("odds_b365a"):
                odds = {
                    "B365H": m["odds_b365h"], "B365D": m["odds_b365d"], "B365A": m["odds_b365a"],
                    "PSH":   m.get("odds_psh",  m["odds_b365h"]),
                    "PSD":   m.get("odds_psd",  m["odds_b365d"]),
                    "PSA":   m.get("odds_psa",  m["odds_b365a"]),
                    "AvgH":  m.get("odds_avgh", m["odds_b365h"]),
                    "AvgD":  m.get("odds_avgd", m["odds_b365d"]),
                    "AvgA":  m.get("odds_avga", m["odds_b365a"]),
                    "MaxH":  m.get("odds_maxh", m["odds_b365h"]),
                    "MaxD":  m.get("odds_maxd", m["odds_b365d"]),
                    "MaxA":  m.get("odds_maxa", m["odds_b365a"]),
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
    return {
        "count": len(results),
        "min_confidence": req.min_confidence,
        "predictions": results,
    }


# ─────────────────────────────────────────────
# LISTA ECHIPE CUNOSCUTE
# ─────────────────────────────────────────────
@app.get("/teams")
@app.get("/api/teams")
def teams():
    return {"teams": get_known_teams()}
