"""
Weekly Fixtures Generator
Generează meciurile săptămânii grupate pe zile cu predicții complete.
"""

from datetime import datetime, timedelta
from models.betting import BettingCalculator
from models.predictor import EloEngine, PoissonModel, FormAnalyzer
from data.leagues import LEAGUES_LIST

betting_calc = BettingCalculator()
elo_engine = EloEngine()
poisson_model = PoissonModel()
form_analyzer = FormAnalyzer()

# Pre-seed Elo ratings
SEED_RATINGS = {
    # Premier League
    "Manchester City": 1820, "Arsenal": 1760, "Liverpool": 1790,
    "Chelsea": 1710, "Manchester United": 1680, "Tottenham": 1660,
    "Newcastle": 1640, "Aston Villa": 1630, "Brighton": 1610,
    "West Ham": 1580, "Everton": 1550, "Brentford": 1540,
    "Fulham": 1530, "Crystal Palace": 1520, "Wolves": 1510,
    "Nottingham Forest": 1510,
    # La Liga
    "Real Madrid": 1870, "Barcelona": 1830, "Atletico Madrid": 1750,
    "Sevilla": 1680, "Real Sociedad": 1640, "Athletic Bilbao": 1630,
    "Villarreal": 1620, "Valencia": 1590, "Betis": 1600, "Girona": 1580,
    # Bundesliga
    "Bayern Munich": 1860, "Borussia Dortmund": 1760, "Bayer Leverkusen": 1750,
    "RB Leipzig": 1720, "Stuttgart": 1660, "Eintracht Frankfurt": 1640,
    "Borussia Mönchengladbach": 1600, "Werder Bremen": 1580,
    "Hoffenheim": 1570, "Freiburg": 1570, "Wolfsburg": 1560, "Augsburg": 1540,
    # Serie A
    "Inter": 1780, "AC Milan": 1740, "Juventus": 1720, "Napoli": 1700,
    "Roma": 1670, "Lazio": 1660, "Atalanta": 1680, "Fiorentina": 1640,
    "Torino": 1560, "Bologna": 1580, "Udinese": 1540, "Cagliari": 1520,
    # Ligue 1
    "PSG": 1850, "Monaco": 1680, "Lyon": 1650, "Marseille": 1640,
    "Lille": 1630, "Nice": 1610, "Rennes": 1590, "Lens": 1580,
    # Eredivisie
    "Ajax": 1720, "PSV Eindhoven": 1730, "Feyenoord": 1700, "AZ Alkmaar": 1650,
    # Primeira Liga
    "Benfica": 1740, "Porto": 1730, "Sporting CP": 1710, "Braga": 1640,
    # Romania
    "FCSB": 1580, "CFR Cluj": 1570, "Rapid Bucuresti": 1550,
    "Universitatea Craiova": 1540, "Dinamo": 1510, "Farul Constanta": 1520,
    # Champions League
    "Atletico Madrid": 1750,
    # Brazil
    "Flamengo": 1700, "Palmeiras": 1710, "Atletico Mineiro": 1680,
    "Fluminense": 1660, "Santos": 1620, "Corinthians": 1630,
    # Argentina
    "River Plate": 1720, "Boca Juniors": 1710,
    # Saudi
    "Al-Hilal": 1680, "Al-Nassr": 1660, "Al-Ittihad": 1640, "Al-Ahli": 1620,
    # Japan
    "Vissel Kobe": 1620, "Urawa Red Diamonds": 1610,
    # Africa
    "Al Ahly": 1640, "Zamalek": 1610, "Mamelodi Sundowns": 1630,
}

elo_engine.ratings.update(SEED_RATINGS)


def get_league_rating(league_id: int) -> float:
    league = next((l for l in LEAGUES_LIST if l["id"] == league_id), None)
    return league["rating"] if league else 50.0


def get_league_info(league_id: int) -> dict:
    league = next((l for l in LEAGUES_LIST if l["id"] == league_id), None)
    if league:
        return {"name": league["name"], "country": league["country"], "flag": league["flag"], "rating": league["rating"]}
    # Cupe europene
    cups = {
        2:   {"name": "UEFA Champions League", "country": "Europe", "flag": "🏆", "rating": 100.0},
        3:   {"name": "UEFA Europa League",    "country": "Europe", "flag": "🥈", "rating": 95.0},
        848: {"name": "UEFA Conference League","country": "Europe", "flag": "🥉", "rating": 90.0},
    }
    return cups.get(league_id, {"name": "Unknown", "country": "", "flag": "🌍", "rating": 50.0})


def predict_fixture(fixture: dict, league_id: int) -> dict:
    """Generează predicție completă pentru un meci."""
    home = fixture["home"]
    away = fixture["away"]
    league_rating = get_league_rating(league_id)

    # xG estimat din Elo + valori default
    home_elo = elo_engine.get_rating(home)
    away_elo = elo_engine.get_rating(away)
    elo_diff = (home_elo - away_elo + 100) / 400  # home advantage

    # Lambda și Mu din Elo
    base_lambda = 1.45 + elo_diff * 0.8
    base_mu = 1.15 - elo_diff * 0.6
    lambda_ = max(0.3, min(base_lambda, 4.0))
    mu = max(0.3, min(base_mu, 4.0))

    # Calculează toate piețele
    markets = betting_calc.calculate_all_markets(
        lambda_=lambda_,
        mu=mu,
        home_team=home,
        away_team=away,
        league_rating=league_rating,
    )

    return {
        "fixture_id": fixture["id"],
        "home": home,
        "away": away,
        "home_id": fixture.get("home_id"),
        "away_id": fixture.get("away_id"),
        "date": fixture.get("date", ""),
        "time": fixture.get("time", "TBD"),
        "league_id": league_id,
        "league": get_league_info(league_id),
        "home_elo": round(home_elo),
        "away_elo": round(away_elo),
        "markets": markets,
    }


def get_weekly_fixtures(all_fixtures: dict) -> dict:
    """
    Grupează toate fixture-urile pe zile ale săptămânii.
    all_fixtures: {league_id: [fixtures]}
    """
    # Calculăm ziua curentă și săptămâna
    today = datetime.now()
    # Găsim lunea curentă
    monday = today - timedelta(days=today.weekday())

    days = {}
    day_names = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"]

    for i, day_name in enumerate(day_names):
        day_date = monday + timedelta(days=i)
        days[day_name] = {
            "date": day_date.strftime("%Y-%m-%d"),
            "display_date": day_date.strftime("%d %b"),
            "day_name": day_name,
            "matches": []
        }

    # Distribuie meciurile pe zile
    # Dacă data nu e specificată, distribuie echilibrat
    all_matches = []
    for league_id, fixtures in all_fixtures.items():
        for fixture in fixtures:
            predicted = predict_fixture(fixture, int(league_id))
            all_matches.append(predicted)

    # Sortare: meciuri cu dată specificată pe ziua corectă,
    # restul distribuite echilibrat pe week
    day_keys = list(days.keys())

    for idx, match in enumerate(all_matches):
        date_str = match.get("date", "")
        assigned = False

        if date_str:
            try:
                match_date = datetime.strptime(date_str[:10], "%Y-%m-%d")
                weekday = match_date.weekday()
                if 0 <= weekday <= 6:
                    days[day_keys[weekday]]["matches"].append(match)
                    assigned = True
            except Exception:
                pass

        if not assigned:
            # Distribuire round-robin echilibrată
            day_idx = idx % 7
            days[day_keys[day_idx]]["matches"].append(match)

    # Sortare meciuri în fiecare zi după rating ligă (ligi mai importante primele)
    for day in days.values():
        day["matches"].sort(key=lambda m: m["league"].get("rating", 0), reverse=True)
        day["total_matches"] = len(day["matches"])

    return {
        "week_start": monday.strftime("%Y-%m-%d"),
        "week_end": (monday + timedelta(days=6)).strftime("%Y-%m-%d"),
        "days": days,
        "total_matches": sum(len(d["matches"]) for d in days.values()),
    }
