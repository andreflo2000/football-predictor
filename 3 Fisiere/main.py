"""
FLOPI SAN — Backend API
Adaugă aceste endpoint-uri în main.py-ul tău existent
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from predictor import predict_match, load_model, get_known_teams

app = FastAPI(title="Flopi San API")

# CORS — permite frontend-ului să acceseze API-ul
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Încărcăm modelul la pornirea serverului
@app.on_event("startup")
async def startup_event():
    load_model()


# ─────────────────────────────────────────────
# HEALTH CHECK (UptimeRobot ping la acesta)
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "Flopi San API"}


# ─────────────────────────────────────────────
# PREDICȚIE MECI
# ─────────────────────────────────────────────
class MatchRequest(BaseModel):
    home_team: str
    away_team: str
    neutral: bool = False
    tournament: str = "Friendly"


@app.post("/predict")
def predict(req: MatchRequest):
    """
    Exemplu request:
    POST /predict
    {
        "home_team": "Romania",
        "away_team": "France",
        "neutral": false,
        "tournament": "UEFA Euro qualification"
    }
    """
    try:
        result = predict_match(
            home_team=req.home_team,
            away_team=req.away_team,
            neutral=req.neutral,
            tournament=req.tournament
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# PREDICȚIE SIMPLĂ (GET — ușor de testat din browser)
# ─────────────────────────────────────────────
@app.get("/predict/{home_team}/{away_team}")
def predict_simple(home_team: str, away_team: str):
    """
    Exemplu: GET /predict/Romania/France
    """
    try:
        return predict_match(home_team=home_team, away_team=away_team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# LISTA ECHIPE CUNOSCUTE
# ─────────────────────────────────────────────
@app.get("/teams")
def teams():
    """Returnează toate echipele din baza de date."""
    return {"teams": get_known_teams()}
