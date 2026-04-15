"""
Football Predictor API - FastAPI Backend
Combină xG, Elo ratings și formă recentă pentru predicții 1X2 și scor exact.
"""

from fastapi import FastAPI, HTTPException, Query, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import httpx

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


# ─────────────────────────────────────────────
# GUMROAD WEBHOOK — update rol după plată
# ─────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Mapare Gumroad product permalink -> rol Oxiano
GUMROAD_PRODUCT_ROLES = {
    "lnjfx": "pro",
    "xzbxnc": "analyst",
}

@app.post("/webhook/gumroad")
async def gumroad_webhook(request: Request):
    """
    Gumroad trimite un POST aici după fiecare plată.
    Actualizează automat rolul userului în Supabase.
    """
    form_data = await request.form()

    email = form_data.get("email", "").lower().strip()
    product_permalink = form_data.get("product_permalink", "").lower().strip()
    sale_id = form_data.get("sale_id", "")

    if not email:
        raise HTTPException(status_code=400, detail="Email lipsă")

    # Determină rolul din produsul cumpărat
    new_role = GUMROAD_PRODUCT_ROLES.get(product_permalink)
    if not new_role:
        # Încearcă după numele produsului
        product_name = form_data.get("product_name", "").lower()
        if "pro" in product_name:
            new_role = "pro"
        elif "analyst" in product_name:
            new_role = "analyst"
        else:
            return {"status": "ignored", "reason": f"Produs necunoscut: {product_permalink}"}

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials lipsă în .env")

    # Actualizează rolul în Supabase
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/users?email=eq.{email}",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json={"role": new_role},
        )

    if response.status_code in (200, 204):
        return {
            "status": "success",
            "email": email,
            "new_role": new_role,
            "sale_id": sale_id,
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase error: {response.text}"
        )


# ─────────────────────────────────────────────
# DAILY PICKS — citire și scriere
# ─────────────────────────────────────────────

from datetime import date as date_type
from pydantic import BaseModel
from typing import Optional

class DailyPickCreate(BaseModel):
    match: str
    league: str
    pick: str          # ex: "1", "X", "2", "BTTS", "Over 2.5"
    confidence: float
    confidence_label: str  # HIGH / MEDIUM
    kelly_pct: float
    edge_pct: float
    value_bet: bool
    is_vip: bool = False
    odds: Optional[float] = None
    match_date: Optional[str] = None  # ISO date string


@app.get("/api/daily-picks")
async def get_daily_picks(
    request: Request,
    date: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD), default azi")
):
    """
    Returnează pick-urile zilei.
    - Free / neautentificat: vede doar pick-urile non-VIP
    - Analyst/Pro/Owner: vede toate pick-urile
    Autentificarea se face via Authorization: Bearer <supabase_jwt>
    """
    target_date = date or str(date_type.today())

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials lipsă")

    # Citire rol din JWT (opțional — fără token = free)
    user_role = "free"
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
        if resp.status_code == 200:
            user_data = resp.json()
            user_email = user_data.get("email", "")
            # Citire rol din tabela users
            async with httpx.AsyncClient() as client:
                role_resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/users?email=eq.{user_email}&select=role",
                    headers={
                        "apikey": SUPABASE_SERVICE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    },
                )
            if role_resp.status_code == 200:
                rows = role_resp.json()
                if rows:
                    user_role = rows[0].get("role", "free")

    # Filtrare VIP bazat pe rol
    can_see_vip = user_role in ("pro", "owner")

    async with httpx.AsyncClient() as client:
        picks_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/daily_picks?match_date=eq.{target_date}&order=created_at.asc",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            },
        )

    if picks_resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Supabase error: {picks_resp.text}")

    picks = picks_resp.json()

    # Filtrăm VIP dacă userul nu are acces
    if not can_see_vip:
        picks = [p for p in picks if not p.get("is_vip", False)]

    return {
        "date": target_date,
        "user_role": user_role,
        "picks": picks,
        "total": len(picks),
    }


@app.post("/api/daily-picks")
async def create_daily_pick(pick: DailyPickCreate, request: Request):
    """
    Creează un pick nou. Doar owner poate adăuga pick-uri.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials lipsă")

    # Verificare owner
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token lipsă")

    token = auth_header[7:]
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {token}",
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token invalid")

    user_email = resp.json().get("email", "")

    async with httpx.AsyncClient() as client:
        role_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/users?email=eq.{user_email}&select=role",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            },
        )

    rows = role_resp.json() if role_resp.status_code == 200 else []
    role = rows[0].get("role", "free") if rows else "free"

    if role != "owner":
        raise HTTPException(status_code=403, detail="Doar owner poate adăuga pick-uri")

    payload = pick.model_dump()
    payload["match_date"] = payload.get("match_date") or str(date_type.today())

    async with httpx.AsyncClient() as client:
        insert_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/daily_picks",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json=payload,
        )

    if insert_resp.status_code in (200, 201):
        return {"status": "created", "pick": insert_resp.json()}
    else:
        raise HTTPException(status_code=500, detail=f"Supabase error: {insert_resp.text}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
