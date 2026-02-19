"""
Football Predictor API - FastAPI Backend
Combină xG, Elo ratings și formă recentă pentru predicții 1X2 și scor exact.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models.predictor import FootballPredictor
from data.fetcher import DataFetcher
from data.leagues import LEAGUES_LIST

app = FastAPI(
    title="Football Predictor API",
    description="Predicții fotbal bazate pe xG, Elo și formă recentă cu XGBoost",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = FootballPredictor()
fetcher = DataFetcher()


@app.get("/")
async def root():
    return {"message": "Football Predictor API", "status": "online"}


@app.get("/api/leagues")
async def get_leagues():
    """Returnează lista celor 100 ligi cu ID-uri API-Football."""
    return {"leagues": LEAGUES_LIST}


@app.get("/api/fixtures/{league_id}")
async def get_fixtures(league_id: int, season: int = 2024):
    """Fixtures pentru o ligă dată (live + upcoming)."""
    try:
        fixtures = await fetcher.get_fixtures(league_id, season)
        return {"fixtures": fixtures, "league_id": league_id}
    except Exception as e:
        # Fallback la date demo
        return {"fixtures": get_demo_fixtures(league_id), "league_id": league_id, "demo": True}


@app.get("/api/predict")
async def predict_match(
    home_team: str = Query(..., description="Numele echipei gazdă"),
    away_team: str = Query(..., description="Numele echipei oaspete"),
    league_id: int = Query(39, description="ID liga API-Football"),
    home_team_id: int = Query(None),
    away_team_id: int = Query(None),
):
    """
    Predicție completă pentru un meci.
    Returnează: probabilități 1X2, scor exact (top 10), xG estimate, Elo ratings.
    """
    try:
        result = await predictor.predict(
            home_team=home_team,
            away_team=away_team,
            league_id=league_id,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
        )
        return result
    except Exception as e:
        # Fallback la predicție demo
        return predictor.demo_prediction(home_team, away_team)


@app.get("/api/team-stats/{team_id}")
async def get_team_stats(team_id: int, league_id: int = 39, season: int = 2024):
    """Statistici echipă: formă, xG, Elo curent."""
    try:
        stats = await fetcher.get_team_stats(team_id, league_id, season)
        return stats
    except Exception as e:
        return {"error": str(e), "team_id": team_id}


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": predictor.model_loaded,
        "demo_mode": predictor.demo_mode,
    }


def get_demo_fixtures(league_id: int):
    """Fixtures demo pentru testare fără API key."""
    fixtures_map = {
        39: [  # Premier League
            {"id": 1, "home": "Manchester City", "away": "Arsenal", "home_id": 50, "away_id": 42, "date": "2025-03-01"},
            {"id": 2, "home": "Liverpool", "away": "Chelsea", "home_id": 40, "away_id": 49, "date": "2025-03-02"},
            {"id": 3, "home": "Manchester United", "away": "Tottenham", "home_id": 33, "away_id": 47, "date": "2025-03-02"},
            {"id": 4, "home": "Newcastle", "away": "Aston Villa", "home_id": 34, "away_id": 66, "date": "2025-03-03"},
            {"id": 5, "home": "Brighton", "away": "West Ham", "home_id": 51, "away_id": 48, "date": "2025-03-04"},
        ],
        140: [  # La Liga
            {"id": 10, "home": "Real Madrid", "away": "Barcelona", "home_id": 541, "away_id": 529, "date": "2025-03-01"},
            {"id": 11, "home": "Atletico Madrid", "away": "Sevilla", "home_id": 530, "away_id": 536, "date": "2025-03-02"},
        ],
        135: [  # Serie A
            {"id": 20, "home": "Inter", "away": "AC Milan", "home_id": 505, "away_id": 489, "date": "2025-03-01"},
            {"id": 21, "home": "Juventus", "away": "Napoli", "home_id": 496, "away_id": 492, "date": "2025-03-02"},
        ],
    }
    return fixtures_map.get(league_id, fixtures_map[39])


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
