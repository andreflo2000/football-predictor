"""
Football Predictor API - FastAPI Backend
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
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

# ─── Date dinamice Romania ─────────────────────────────────────────────────────
def get_ro_dates():
    try:
        import pytz
        tz = pytz.timezone("Europe/Bucharest")
        now = datetime.now(tz)
    except Exception:
        now = datetime.now()
    return {
        "yesterday": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
        "today":     now.strftime("%Y-%m-%d"),
        "tomorrow":  (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        "after":     (now + timedelta(days=2)).strftime("%Y-%m-%d"),
    }

DEMO_FIXTURES = {
    39:  [  # Premier League - Etapa 27 (22-23 Feb) + Etapa 28 (28 Feb - 1 Mar)
        {"id":101,"home":"Tottenham","away":"Arsenal","home_id":47,"away_id":42,"date":"2026-02-22","time":"18:30"},
        {"id":102,"home":"Everton","away":"Manchester United","home_id":45,"away_id":33,"date":"2026-02-23","time":"22:00"},
        {"id":103,"home":"Wolves","away":"Aston Villa","home_id":39,"away_id":66,"date":"2026-02-27","time":"22:00"},
        {"id":104,"home":"Bournemouth","away":"Sunderland","home_id":35,"away_id":43,"date":"2026-02-28","time":"16:00"},
        {"id":105,"home":"Burnley","away":"Brentford","home_id":44,"away_id":55,"date":"2026-02-28","time":"16:00"},
        {"id":106,"home":"Liverpool","away":"West Ham","home_id":40,"away_id":48,"date":"2026-02-28","time":"16:00"},
        {"id":107,"home":"Newcastle","away":"Everton","home_id":34,"away_id":45,"date":"2026-02-28","time":"16:00"},
        {"id":108,"home":"Leeds","away":"Manchester City","home_id":63,"away_id":50,"date":"2026-02-28","time":"18:30"},
    ],
    140: [  # La Liga - Etapa 26 (21-23 Feb) + Etapa 27 (28 Feb)
        {"id":201,"home":"Getafe","away":"Sevilla","home_id":546,"away_id":559,"date":"2026-02-22","time":"14:00"},
        {"id":202,"home":"Barcelona","away":"Levante","home_id":529,"away_id":724,"date":"2026-02-22","time":"16:15"},
        {"id":203,"home":"Celta Vigo","away":"Mallorca","home_id":558,"away_id":798,"date":"2026-02-22","time":"18:30"},
        {"id":204,"home":"Villarreal","away":"Valencia","home_id":533,"away_id":532,"date":"2026-02-22","time":"21:00"},
        {"id":205,"home":"Alaves","away":"Girona","home_id":719,"away_id":547,"date":"2026-02-23","time":"22:00"},
        {"id":206,"home":"Rayo Vallecano","away":"Ath. Bilbao","home_id":726,"away_id":531,"date":"2026-02-28","time":"16:00"},
        {"id":207,"home":"Barcelona","away":"Villarreal","home_id":529,"away_id":533,"date":"2026-02-28","time":"18:15"},
        {"id":208,"home":"Mallorca","away":"Real Sociedad","home_id":798,"away_id":548,"date":"2026-02-28","time":"16:00"},
    ],
    78:  [  # Bundesliga - Etapa 23 (20-22 Feb) deja jucată, Etapa 24 (28 Feb)
        {"id":301,"home":"Freiburg","away":"Gladbach","home_id":160,"away_id":163,"date":"2026-02-22","time":"17:30"},
        {"id":302,"home":"Stuttgart","away":"Hamburger SV","home_id":172,"away_id":180,"date":"2026-02-22","time":"15:30"},
        {"id":303,"home":"Bayern Munich","away":"Eintracht Frankfurt","home_id":157,"away_id":169,"date":"2026-02-28","time":"18:30"},
        {"id":304,"home":"Borussia Dortmund","away":"RB Leipzig","home_id":165,"away_id":173,"date":"2026-03-07","time":"18:30"},
        {"id":305,"home":"Bayer Leverkusen","away":"Freiburg","home_id":168,"away_id":160,"date":"2026-03-01","time":"17:30"},
        {"id":306,"home":"Wolfsburg","away":"Union Berlin","home_id":161,"away_id":182,"date":"2026-03-01","time":"15:30"},
    ],
    135: [  # Serie A - Etapa 27 (22-23 Feb) + Etapa 28 (27-28 Feb)
        {"id":401,"home":"AC Milan","away":"Parma","home_id":489,"away_id":499,"date":"2026-02-22","time":"18:00"},
        {"id":402,"home":"AS Roma","away":"Cremonese","home_id":497,"away_id":512,"date":"2026-02-22","time":"20:45"},
        {"id":403,"home":"Fiorentina","away":"Pisa","home_id":502,"away_id":515,"date":"2026-02-23","time":"15:00"},
        {"id":404,"home":"Bologna","away":"Udinese","home_id":500,"away_id":494,"date":"2026-02-23","time":"18:00"},
        {"id":405,"home":"Inter","away":"Genoa","home_id":505,"away_id":495,"date":"2026-02-28","time":"21:00"},
        {"id":406,"home":"Napoli","away":"Verona","home_id":492,"away_id":504,"date":"2026-02-28","time":"19:00"},
        {"id":407,"home":"Juventus","away":"Lazio","home_id":496,"away_id":487,"date":"2026-02-27","time":"21:00"},
    ],
    61:  [  # Ligue 1 - Etapa 24 (22-23 Feb)
        {"id":501,"home":"Nice","away":"Rennes","home_id":84,"away_id":93,"date":"2026-02-22","time":"17:00"},
        {"id":502,"home":"Marseille","away":"Lille","home_id":81,"away_id":79,"date":"2026-02-22","time":"19:00"},
        {"id":503,"home":"PSG","away":"Lens","home_id":85,"away_id":116,"date":"2026-02-22","time":"21:05"},
        {"id":504,"home":"Monaco","away":"Lyon","home_id":91,"away_id":80,"date":"2026-02-23","time":"21:05"},
        {"id":505,"home":"Strasbourg","away":"Nantes","home_id":95,"away_id":83,"date":"2026-02-23","time":"15:00"},
    ],
    88:  [  # Eredivisie - Etapa 23 (22 Feb)
        {"id":601,"home":"Sparta Rotterdam","away":"NEC","home_id":401,"away_id":397,"date":"2026-02-22","time":"14:30"},
        {"id":602,"home":"PSV Eindhoven","away":"Ajax","home_id":392,"away_id":194,"date":"2026-02-22","time":"16:45"},
        {"id":603,"home":"Feyenoord","away":"AZ Alkmaar","home_id":396,"away_id":384,"date":"2026-02-22","time":"14:30"},
    ],
    94:  [  # Primeira Liga - Etapa 24
        {"id":701,"home":"Benfica","away":"Sporting CP","home_id":211,"away_id":228,"date":"2026-02-22","time":"21:30"},
        {"id":702,"home":"Porto","away":"Braga","home_id":212,"away_id":217,"date":"2026-02-23","time":"18:00"},
        {"id":703,"home":"Vitoria","away":"Famalicao","home_id":229,"away_id":236,"date":"2026-02-22","time":"17:30"},
    ],
    2:   [  # UEFA Champions League - Playoff retur (24-25 Feb 2026)
        {"id":20001,"home":"Atletico Madrid","away":"Club Brugge","home_id":530,"away_id":245,"date":"2026-02-24","time":"19:45"},
        {"id":20002,"home":"Bayer Leverkusen","away":"Olympiacos","home_id":168,"away_id":700,"date":"2026-02-24","time":"22:00"},
        {"id":20003,"home":"Inter","away":"Bodo/Glimt","home_id":505,"away_id":760,"date":"2026-02-24","time":"22:00"},
        {"id":20004,"home":"Newcastle","away":"Qarabag","home_id":34,"away_id":840,"date":"2026-02-24","time":"22:00"},
        {"id":20005,"home":"Atalanta","away":"Borussia Dortmund","home_id":499,"away_id":165,"date":"2026-02-25","time":"19:45"},
        {"id":20006,"home":"Juventus","away":"Galatasaray","home_id":496,"away_id":611,"date":"2026-02-25","time":"22:00"},
        {"id":20007,"home":"PSG","away":"Monaco","home_id":85,"away_id":91,"date":"2026-02-25","time":"22:00"},
        {"id":20008,"home":"Real Madrid","away":"Benfica","home_id":541,"away_id":211,"date":"2026-02-25","time":"22:00"},
    ],
    3:   [  # UEFA Europa League - Playoff retur (26 Feb 2026)
        {"id":30001,"home":"Manchester United","away":"PAOK","home_id":33,"away_id":586,"date":"2026-02-26","time":"19:45"},
        {"id":30002,"home":"Lazio","away":"Fenerbahce","home_id":487,"away_id":636,"date":"2026-02-26","time":"22:00"},
        {"id":30003,"home":"Ajax","away":"Galatasaray","home_id":194,"away_id":611,"date":"2026-02-26","time":"22:00"},
        {"id":30004,"home":"Eintracht Frankfurt","away":"Sevilla","home_id":169,"away_id":559,"date":"2026-02-26","time":"22:00"},
    ],
    848: [  # UEFA Conference League - Playoff retur (26 Feb 2026)
        {"id":40001,"home":"Chelsea","away":"Fiorentina","home_id":49,"away_id":502,"date":"2026-02-26","time":"19:45"},
        {"id":40002,"home":"FCSB","away":"Molde","home_id":670,"away_id":772,"date":"2026-02-26","time":"22:00"},
        {"id":40003,"home":"Gent","away":"Rapid Wien","home_id":246,"away_id":403,"date":"2026-02-26","time":"19:45"},
    ],
    71:  [  # Brasileirao - Sezon incepe Aprilie, meciuri programate
        {"id":1001,"home":"Flamengo","away":"Palmeiras","home_id":127,"away_id":121,"date":"2026-04-05","time":"22:00"},
        {"id":1002,"home":"Atletico Mineiro","away":"Fluminense","home_id":1062,"away_id":119,"date":"2026-04-05","time":"20:00"},
        {"id":1003,"home":"Santos","away":"Corinthians","home_id":118,"away_id":131,"date":"2026-04-06","time":"22:00"},
    ],
    128: [  # Argentine Primera - Copa de la Liga
        {"id":1101,"home":"River Plate","away":"Boca Juniors","home_id":186,"away_id":193,"date":"2026-02-22","time":"22:30"},
        {"id":1102,"home":"Racing Club","away":"Independiente","home_id":194,"away_id":195,"date":"2026-02-22","time":"20:00"},
        {"id":1103,"home":"San Lorenzo","away":"Lanus","home_id":196,"away_id":199,"date":"2026-02-22","time":"17:00"},
    ],
    253: [  # MLS - Sezon incepe Martie 2026
        {"id":2001,"home":"Inter Miami","away":"LA Galaxy","home_id":1161,"away_id":1597,"date":"2026-03-01","time":"02:30"},
        {"id":2002,"home":"NYCFC","away":"Atlanta United","home_id":1599,"away_id":1612,"date":"2026-03-01","time":"00:30"},
        {"id":2003,"home":"Seattle Sounders","away":"Portland Timbers","home_id":1650,"away_id":1649,"date":"2026-03-01","time":"03:00"},
    ],
    262: [  # Liga MX - Etapa 8 (22-23 Feb)
        {"id":2101,"home":"Club America","away":"Chivas","home_id":1351,"away_id":1352,"date":"2026-02-22","time":"22:00"},
        {"id":2102,"home":"Cruz Azul","away":"Pumas UNAM","home_id":1353,"away_id":1356,"date":"2026-02-23","time":"02:00"},
        {"id":2103,"home":"Tigres UANL","away":"Monterrey","home_id":1355,"away_id":1354,"date":"2026-02-22","time":"23:06"},
    ],
    307: [  # Saudi Pro League - Etapa 22 (21-23 Feb)
        {"id":3001,"home":"Al-Hilal","away":"Al-Nassr","home_id":2932,"away_id":2931,"date":"2026-02-23","time":"18:00"},
        {"id":3002,"home":"Al-Ittihad","away":"Al-Ahli","home_id":2934,"away_id":2935,"date":"2026-02-22","time":"17:00"},
        {"id":3003,"home":"Al-Qadsiah","away":"Al-Shabab","home_id":2936,"away_id":2937,"date":"2026-02-21","time":"19:00"},
    ],
    98:  [  # J1 League - Etapa 2 (22 Feb)
        {"id":3101,"home":"Vissel Kobe","away":"Urawa Red Diamonds","home_id":2633,"away_id":2634,"date":"2026-02-22","time":"10:00"},
        {"id":3102,"home":"Kawasaki Frontale","away":"Yokohama F.Marinos","home_id":2635,"away_id":2636,"date":"2026-02-22","time":"07:00"},
        {"id":3103,"home":"Gamba Osaka","away":"Cerezo Osaka","home_id":2637,"away_id":2638,"date":"2026-02-22","time":"09:00"},
    ],
    103: [  # K League - Etapa 2 (22-23 Feb)
        {"id":3201,"home":"Jeonbuk","away":"Ulsan","home_id":2649,"away_id":2650,"date":"2026-02-22","time":"09:00"},
        {"id":3202,"home":"Suwon","away":"Seongnam","home_id":2651,"away_id":2652,"date":"2026-02-23","time":"10:00"},
    ],
    169: [  # Superliga Romania - Etapa 26 (21-24 Feb)
        {"id":4001,"home":"FCSB","away":"CFR Cluj","home_id":670,"away_id":671,"date":"2026-02-22","time":"20:30"},
        {"id":4002,"home":"Rapid Bucuresti","away":"Universitatea Craiova","home_id":672,"away_id":673,"date":"2026-02-23","time":"18:30"},
        {"id":4003,"home":"Dinamo","away":"Farul Constanta","home_id":674,"away_id":675,"date":"2026-02-24","time":"18:30"},
    ],
    207: [  # Egyptian Premier League
        {"id":5001,"home":"Al Ahly","away":"Zamalek","home_id":2670,"away_id":2671,"date":"2026-02-22","time":"19:00"},
        {"id":5002,"home":"Pyramids","away":"Future FC","home_id":2672,"away_id":2673,"date":"2026-02-23","time":"17:00"},
    ],
    197: [  # South African PSL - Etapa 22
        {"id":5101,"home":"Mamelodi Sundowns","away":"Kaizer Chiefs","home_id":2680,"away_id":2681,"date":"2026-02-22","time":"17:00"},
        {"id":5102,"home":"Orlando Pirates","away":"Cape Town City","home_id":2682,"away_id":2683,"date":"2026-02-24","time":"17:00"},
    ],
    233: [  # Chinese Super League - Sezon incepe Martie
        {"id":6001,"home":"Shandong Taishan","away":"Shanghai SIPG","home_id":2700,"away_id":2701,"date":"2026-03-07","time":"12:35"},
        {"id":6002,"home":"Guangzhou","away":"Beijing Guoan","home_id":2702,"away_id":2703,"date":"2026-03-07","time":"11:00"},
    ],
    17:  [  # Belgian Pro League - Etapa 28 (22-23 Feb)
        {"id":7001,"home":"Club Brugge","away":"Anderlecht","home_id":245,"away_id":244,"date":"2026-02-22","time":"18:15"},
        {"id":7002,"home":"Gent","away":"Standard","home_id":246,"away_id":248,"date":"2026-02-23","time":"16:00"},
    ],
    119: [  # Superliga Serbia
        {"id":7201,"home":"Red Star Belgrade","away":"Partizan","home_id":2740,"away_id":2741,"date":"2026-02-22","time":"18:00"},
    ],
    218: [  # Moroccan Botola
        {"id":7401,"home":"Wydad","away":"Raja Casablanca","home_id":2750,"away_id":2751,"date":"2026-02-22","time":"18:00"},
        {"id":7402,"home":"FAR Rabat","away":"Maghreb Fes","home_id":2752,"away_id":2753,"date":"2026-02-23","time":"16:00"},
    ],
    244: [  # Ekstraklasa Poland
        {"id":7701,"home":"Legia Warsaw","away":"Lech Poznan","home_id":2780,"away_id":2781,"date":"2026-02-22","time":"19:00"},
        {"id":7702,"home":"Wisla Krakow","away":"Slask Wroclaw","home_id":2782,"away_id":2783,"date":"2026-02-23","time":"15:30"},
    ],
}
# ─── Cupe europene ─────────────────────────────────────────────────────────────
EXTRA_LEAGUES = [
    {"rank": 0, "id": 2,   "name": "UEFA Champions League", "country": "Europe", "flag": "🏆", "confederation": "UEFA", "rating": 100.0},
    {"rank": 0, "id": 3,   "name": "UEFA Europa League",    "country": "Europe", "flag": "🥈", "confederation": "UEFA", "rating": 95.0},
    {"rank": 0, "id": 848, "name": "UEFA Conference League","country": "Europe", "flag": "🥉", "confederation": "UEFA", "rating": 90.0},
]


def get_fixtures_with_real_dates(league_id: int) -> list:
    """Returnează fixture-urile cu datele reale din DEMO_FIXTURES."""
    fixtures = DEMO_FIXTURES.get(league_id, [])
    result = []
    for f in fixtures:
        f_copy = dict(f)
        # Păstrăm data reală din fixture, adăugăm ora dacă lipsește
        if not f_copy.get("time"):
            hour_options = ["16:00", "18:30", "19:00", "20:00", "21:00", "21:45", "22:00"]
            f_copy["time"] = hour_options[f["id"] % len(hour_options)]
        result.append(f_copy)
    return result


# ─── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Football Predictor API", "status": "online"}


@app.get("/api/leagues")
async def get_leagues():
    all_leagues = EXTRA_LEAGUES + LEAGUES_LIST
    return {"leagues": all_leagues}


@app.get("/api/fixtures/{league_id}")
async def get_fixtures(league_id: int, season: int = 2024):
    try:
        fixtures = await fetcher.get_fixtures(league_id, season)
        if fixtures:
            dates = get_ro_dates()
            day_cycle = [dates["yesterday"], dates["today"], dates["tomorrow"], dates["after"]]
            hour_options = ["16:00", "18:30", "19:00", "20:00", "21:00", "21:45", "22:00"]
            for i, f in enumerate(fixtures):
                if not f.get("date") or f["date"] < dates["yesterday"]:
                    f["date"] = day_cycle[i % 4]
                f["time"] = hour_options[f.get("id", i) % len(hour_options)]
            return {"fixtures": fixtures, "league_id": league_id}
    except Exception:
        pass
    fixtures = get_fixtures_with_real_dates(league_id)
    return {"fixtures": fixtures, "league_id": league_id, "demo": True}


@app.get("/api/predict")
async def predict_match(
    home_team: str = Query(...),
    away_team: str = Query(...),
    league_id: int = Query(39),
    home_team_id: int = Query(None),
    away_team_id: int = Query(None),
):
    from models.betting import BettingCalculator

    try:
        result = await predictor.predict(
            home_team=home_team,
            away_team=away_team,
            league_id=league_id,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
        )
    except Exception:
        result = predictor.demo_prediction(home_team, away_team)

    pred       = result.get("prediction") or {}
    breakdown  = result.get("model_breakdown") or {}
    team_stats = result.get("team_stats") or {}
    xg         = result.get("expected_goals") or {"home": 1.45, "away": 1.15}

    home_p = float(pred.get("home_win") or 45.0)
    draw_p = float(pred.get("draw") or 27.0)
    away_p = float(pred.get("away_win") or 28.0)
    lam    = float(xg.get("home") or 1.45)
    mu     = float(xg.get("away") or 1.15)

    try:
        betting = BettingCalculator()
        league_info = next((l for l in LEAGUES_LIST if l["id"] == league_id), None)
        league_rating = float(league_info["rating"]) if league_info else 50.0
        markets = betting.calculate_all_markets(
            lambda_=lam, mu=mu,
            home_team=home_team, away_team=away_team,
            league_rating=league_rating,
        )
    except Exception:
        markets = {}

    elo_bd     = breakdown.get("elo") or {}
    poisson_bd = breakdown.get("poisson") or {}
    xgb_bd     = breakdown.get("xgboost") or {}

    raw_scores = result.get("top_scores") or []
    top_scores = []
    for s in raw_scores[:10]:
        try:
            if "score" in s:
                score_str = str(s["score"])
            elif "home_goals" in s and "away_goals" in s:
                score_str = f"{s['home_goals']}:{s['away_goals']}"
            else:
                score_str = "0:0"
            top_scores.append({
                "score": score_str,
                "probability": round(float(s.get("probability") or 5.0), 2)
            })
        except Exception:
            continue

    def fmt_stats(s):
        if not s:
            return None
        try:
            return {
                "elo_rating": int(float(s.get("elo") or 1500)),
                "xg_for":     round(float(s.get("xg_for") or 1.4), 2),
                "xg_against": round(float(s.get("xg_against") or 1.1), 2),
                "goals_avg":  round(float(s.get("xg_for") or 1.4), 2),
                "form":       s.get("form") or ["W","D","W","W","L"],
            }
        except Exception:
            return None

    return {
        "home_team": home_team,
        "away_team": away_team,
        "probabilities": {
            "home": round(home_p, 1),
            "draw": round(draw_p, 1),
            "away": round(away_p, 1),
        },
        "elo": {
            "home": round(float(elo_bd.get("home_win") or home_p), 1),
            "draw": round(float(elo_bd.get("draw") or draw_p), 1),
            "away": round(float(elo_bd.get("away_win") or away_p), 1),
        },
        "poisson": {
            "home": round(float(poisson_bd.get("home_win") or home_p), 1),
            "draw": round(float(poisson_bd.get("draw") or draw_p), 1),
            "away": round(float(poisson_bd.get("away_win") or away_p), 1),
        },
        "xgboost": {
            "home": round(float(xgb_bd.get("home_win") or home_p), 1),
            "draw": round(float(xgb_bd.get("draw") or draw_p), 1),
            "away": round(float(xgb_bd.get("away_win") or away_p), 1),
        },
        "expected_goals": {"home": round(lam, 2), "away": round(mu, 2)},
        "top_scores": top_scores,
        "home_stats": fmt_stats(team_stats.get("home")),
        "away_stats": fmt_stats(team_stats.get("away")),
        "markets": markets,
    }


@app.get("/api/team-stats/{team_id}")
async def get_team_stats(team_id: int, league_id: int = 39, season: int = 2024):
    try:
        stats = await fetcher.get_team_stats(team_id, league_id, season)
        return stats
    except Exception as e:
        return {"error": str(e), "team_id": team_id}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "model_loaded": predictor.model_loaded, "demo_mode": predictor.demo_mode}


# ─── WEEKLY ENDPOINT ───────────────────────────────────────────────────────────
from models.weekly import get_weekly_fixtures

@app.get("/api/weekly")
async def get_weekly():
    try:
        fixtures_with_dates = {}
        for league_id in DEMO_FIXTURES:
            fixtures_with_dates[league_id] = get_fixtures_with_real_dates(league_id)
        weekly = get_weekly_fixtures(fixtures_with_dates)
        return weekly
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
