"""
Fixture fetcher — football-data.org API
Descarca meciurile zilei, normalizeaza numele echipelor,
returneaza o lista gata de predictat.
"""

import os
import requests
import datetime
from difflib import get_close_matches
from typing import Optional

API_KEY      = os.getenv("FOOTBALL_DATA_KEY", "")
ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
BASE_URL     = "https://api.football-data.org/v4"
ODDS_API_URL = "https://api.the-odds-api.com/v4"

# The-Odds-API sport keys → competition codes
ODDS_SPORT_MAP = {
    "soccer_epl":                      "PL",
    "soccer_germany_bundesliga":        "BL1",
    "soccer_italy_serie_a":             "SA",
    "soccer_spain_la_liga":             "PD",
    "soccer_france_ligue_1":            "FL1",
    "soccer_portugal_primeira_liga":    "PPL",
    "soccer_netherlands_eredivisie":    "DED",
    "soccer_uefa_champs_league":        "CL",
    "soccer_uefa_europa_league":        "EL",
}

# Ligrile acoperite (gratis in football-data.org)
COMPETITIONS = {
    "PL":  {"name": "Premier League",    "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "div": "E0"},
    "BL1": {"name": "Bundesliga",        "flag": "🇩🇪",       "div": "D1"},
    "SA":  {"name": "Serie A",           "flag": "🇮🇹",       "div": "I1"},
    "PD":  {"name": "La Liga",           "flag": "🇪🇸",       "div": "SP1"},
    "FL1": {"name": "Ligue 1",           "flag": "🇫🇷",       "div": "F1"},
    "PPL": {"name": "Primeira Liga",     "flag": "🇵🇹",       "div": "P1"},
    "DED": {"name": "Eredivisie",        "flag": "🇳🇱",       "div": "N1"},
    "CL":  {"name": "Champions League",  "flag": "🏆",        "div": "CL"},
    "EL":  {"name": "Europa League",     "flag": "🌍",        "div": "EL"},
    "PD2": {"name": "Liga Portugal 2",   "flag": "🇵🇹",       "div": "P2"},
    "BSA": {"name": "Brasileirao",       "flag": "🇧🇷",       "div": "BR"},
    "CLI": {"name": "Copa Libertadores", "flag": "🌎",        "div": "CL"},
}

# Normalizare: football-data.org team name → model team name
# Formatul football-data.org: "Arsenal FC", "Manchester City FC", etc.
FDORG_TO_MODEL = {
    # Premier League
    "Arsenal FC":                "Arsenal",
    "Chelsea FC":                "Chelsea",
    "Liverpool FC":              "Liverpool",
    "Manchester City FC":        "Man City",
    "Manchester United FC":      "Man United",
    "Tottenham Hotspur FC":      "Tottenham",
    "Newcastle United FC":       "Newcastle",
    "Aston Villa FC":            "Aston Villa",
    "West Ham United FC":        "West Ham",
    "Brighton & Hove Albion FC": "Brighton",
    "Brentford FC":              "Brentford",
    "Fulham FC":                 "Fulham",
    "Crystal Palace FC":         "Crystal Palace",
    "Wolverhampton Wanderers FC":"Wolves",
    "Everton FC":                "Everton",
    "Nottingham Forest FC":      "Nott'm Forest",
    "AFC Bournemouth":           "Bournemouth",
    "Leicester City FC":         "Leicester",
    "Southampton FC":            "Southampton",
    "Ipswich Town FC":           "Ipswich",
    "Leeds United FC":           "Leeds",
    "Sheffield United FC":       "Sheffield Utd",
    "Burnley FC":                "Burnley",
    "Luton Town FC":             "Luton",
    "Watford FC":                "Watford",
    "Norwich City FC":           "Norwich",
    "Sunderland AFC":            "Sunderland",
    "Swansea City AFC":          "Swansea",
    "Stoke City FC":             "Stoke",
    "Queens Park Rangers FC":    "QPR",
    "West Bromwich Albion FC":   "West Brom",
    "Middlesbrough FC":          "Middlesbrough",
    "Huddersfield Town AFC":     "Huddersfield",
    "Cardiff City FC":           "Cardiff",
    # Bundesliga
    "FC Bayern München":         "Bayern Munich",
    "Borussia Dortmund":         "Dortmund",
    "Bayer 04 Leverkusen":       "Leverkusen",
    "RB Leipzig":                "RB Leipzig",
    "VfB Stuttgart":             "Stuttgart",
    "Borussia Mönchengladbach":  "M'gladbach",
    "Eintracht Frankfurt":       "Ein Frankfurt",
    "TSG 1899 Hoffenheim":       "Hoffenheim",
    "SC Freiburg":               "Freiburg",
    "VfL Wolfsburg":             "Wolfsburg",
    "1. FC Union Berlin":        "Union Berlin",
    "1. FSV Mainz 05":           "Mainz",
    "FC Augsburg":               "Augsburg",
    "FC Köln":                   "FC Koln",
    "Hertha BSC":                "Hertha",
    "VfL Bochum 1848":           "Bochum",
    "Werder Bremen":             "Werder Bremen",
    "SV Darmstadt 98":           "Darmstadt",
    "1. FC Heidenheim 1846":     "Heidenheim",
    "Holstein Kiel":             "Holstein Kiel",
    "FC St. Pauli 1910":         "St. Pauli",
    "Hannover 96":               "Hannover",
    "Fortuna Düsseldorf":        "Dusseldorf",
    "Hamburger SV":              "Hamburger SV",
    "Schalke 04":                "Schalke 04",
    "Arminia Bielefeld":         "Bielefeld",
    # Serie A
    "Juventus FC":               "Juventus",
    "AC Milan":                  "Milan",
    "FC Internazionale Milano":  "Inter",
    "SSC Napoli":                "Napoli",
    "AS Roma":                   "Roma",
    "SS Lazio":                  "Lazio",
    "Atalanta BC":               "Atalanta",
    "ACF Fiorentina":            "Fiorentina",
    "Torino FC":                 "Torino",
    "Bologna FC 1909":           "Bologna",
    "Genoa CFC":                 "Genoa",
    "UC Sampdoria":              "Sampdoria",
    "Udinese Calcio":            "Udinese",
    "Cagliari Calcio":           "Cagliari",
    "Hellas Verona FC":          "Verona",
    "Parma Calcio 1913":         "Parma",
    "US Sassuolo Calcio":        "Sassuolo",
    "Venezia FC":                "Venezia",
    "Spezia Calcio":             "Spezia",
    "US Salernitana 1919":       "Salernitana",
    "US Lecce":                  "Lecce",
    "Empoli FC":                 "Empoli",
    "Frosinone Calcio":          "Frosinone",
    "Como 1907":                 "Como",
    "Monza":                     "Monza",
    # La Liga
    "Real Madrid CF":            "Real Madrid",
    "FC Barcelona":              "Barcelona",
    "Atlético de Madrid":        "Ath Madrid",
    "Sevilla FC":                "Sevilla",
    "Valencia CF":               "Valencia",
    "Villarreal CF":             "Villarreal",
    "Real Betis Balompié":       "Betis",
    "Real Sociedad de Fútbol":   "Sociedad",
    "Athletic Club":             "Ath Bilbao",
    "Rayo Vallecano de Madrid":  "Rayo Vallecano",
    "RCD Espanyol de Barcelona": "Espanol",
    "Getafe CF":                 "Getafe",
    "RC Celta de Vigo":          "Celta",
    "Deportivo Alavés":          "Alaves",
    "Granada CF":                "Granada",
    "Girona FC":                 "Girona",
    "UD Las Palmas":             "Las Palmas",
    "CA Osasuna":                "Osasuna",
    "Real Valladolid CF":        "Valladolid",
    "Cádiz CF":                  "Cadiz",
    "RCD Mallorca":              "Mallorca",
    "Almería":                   "Almeria",
    "UD Almería":                "Almeria",
    "Deportivo La Coruña":       "Deportivo",
    "Leganés":                   "Leganes",
    # Ligue 1
    "Paris Saint-Germain FC":    "Paris SG",
    "Olympique de Marseille":    "Marseille",
    "Olympique Lyonnais":        "Lyon",
    "AS Monaco FC":              "Monaco",
    "LOSC Lille":                "Lille",
    "Stade Rennais FC 1901":     "Rennes",
    "OGC Nice":                  "Nice",
    "RC Lens":                   "Lens",
    "RC Strasbourg Alsace":      "Strasbourg",
    "Montpellier HSC":           "Montpellier",
    "Stade de Reims":            "Reims",
    "FC Nantes":                 "Nantes",
    "Toulouse FC":               "Toulouse",
    "Angers SCO":                "Angers",
    "FC Metz":                   "Metz",
    "Stade Brestois 29":         "Brest",
    "Le Havre AC":               "Le Havre",
    "AJ Auxerre":                "Auxerre",
    "AS Saint-Étienne":          "St Etienne",
    "Girondins de Bordeaux":     "Bordeaux",
}


def _normalize_name(raw: str, known_teams: list) -> str:
    """
    Incearca sa normalizeze numele echipei din football-data.org
    catre formatul din modelul nostru.
    1. Lookup direct in FDORG_TO_MODEL
    2. Fuzzy match contra known_teams
    """
    # Lookup direct
    if raw in FDORG_TO_MODEL:
        return FDORG_TO_MODEL[raw]

    # Curata sufixe comune
    cleaned = raw
    for suffix in [" FC", " AFC", " CF", " SC", " AC", " United", " City"]:
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break

    if cleaned in known_teams:
        return cleaned

    # Fuzzy match (cutoff 0.7)
    matches = get_close_matches(cleaned, known_teams, n=1, cutoff=0.70)
    if matches:
        return matches[0]

    # Fuzzy match pe raw
    matches2 = get_close_matches(raw, known_teams, n=1, cutoff=0.65)
    if matches2:
        return matches2[0]

    return raw  # Returnam originalul daca nu gasim


def _fetch_fixtures_for_date(target: str, known_teams: list) -> list:
    """Fetch meciuri dintr-o singura data. Returneaza lista goala daca nu sunt."""
    headers = {"X-Auth-Token": API_KEY}
    params  = {"dateFrom": target, "dateTo": target}
    try:
        resp = requests.get(f"{BASE_URL}/matches", headers=headers, params=params, timeout=15)
        if resp.status_code in (429, 401, 403):
            return []
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []

    fixtures = []
    for m in data.get("matches", []):
        comp_code = m.get("competition", {}).get("code", "")
        if comp_code not in COMPETITIONS:
            continue
        home_raw = m.get("homeTeam", {}).get("name", "")
        away_raw = m.get("awayTeam", {}).get("name", "")
        status   = m.get("status", "")
        if not home_raw or not away_raw:
            continue
        if status in ("FINISHED", "CANCELLED", "POSTPONED"):
            continue

        comp = COMPETITIONS[comp_code]
        home = _normalize_name(home_raw, known_teams or [])
        away = _normalize_name(away_raw, known_teams or [])

        time_str = ""
        utc_str = m.get("utcDate", "")
        if utc_str:
            try:
                dt = datetime.datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
                dt_local = dt + datetime.timedelta(hours=1)
                time_str = dt_local.strftime("%H:%M")
            except Exception:
                pass

        fixtures.append({
            "home":             home,
            "away":             away,
            "home_raw":         home_raw,
            "away_raw":         away_raw,
            "league":           comp["name"],
            "flag":             comp["flag"],
            "div":              comp["div"],
            "time":             time_str,
            "date":             target,
            "competition_code": comp_code,
            "status":           status,
        })
    return fixtures


def get_today_fixtures(date: Optional[str] = None, known_teams: list = None) -> list:
    """
    Returneaza meciurile pentru data ceruta (default: azi).
    Daca azi nu sunt meciuri din ligile suportate, cauta urmatoarele 4 zile.
    Fallback final: meciuri demo.
    """
    if not API_KEY:
        return _demo_fixtures()

    base = datetime.date.fromisoformat(date) if date else datetime.date.today()

    # Cauta maxim 5 zile inainte (azi + urmatoarele 4)
    for offset in range(5):
        target   = (base + datetime.timedelta(days=offset)).isoformat()
        fixtures = _fetch_fixtures_for_date(target, known_teams or [])
        if fixtures:
            if offset > 0:
                print(f"    Azi nu sunt meciuri — am gasit {len(fixtures)} in {target}")
            return fixtures

    return _demo_fixtures()


def get_today_odds(known_teams: list = None) -> dict:
    """
    Descarca cotele de azi din The-Odds-API (gratis: 500 req/luna).
    Returneaza un dict: (home_normalized, away_normalized) -> {B365H, B365D, B365A, ...}
    Necesita env var ODDS_API_KEY.
    """
    if not ODDS_API_KEY:
        return {}

    odds_map = {}

    for sport, comp_code in ODDS_SPORT_MAP.items():
        try:
            url = f"{ODDS_API_URL}/sports/{sport}/odds/"
            params = {
                "apiKey":      ODDS_API_KEY,
                "regions":     "eu",
                "markets":     "h2h",
                "oddsFormat":  "decimal",
                "dateFormat":  "iso",
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 401:
                break   # cheie invalida — nu mai incercam
            if resp.status_code == 422:
                continue  # sport indisponibil
            if resp.status_code != 200:
                continue
            events = resp.json()
        except Exception:
            continue

        for ev in events:
            home_raw = ev.get("home_team", "")
            away_raw = ev.get("away_team", "")
            home = _normalize_name(home_raw, known_teams or [])
            away = _normalize_name(away_raw, known_teams or [])

            # Aduna cotele de la toti bookmakers disponibili
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
                        all_h.append(oh); all_d.append(od); all_a.append(oa)
                        if bk["key"] in ("bet365", "betway"):
                            b365_h, b365_d, b365_a = oh, od, oa

            if not all_h:
                continue

            avg_h = sum(all_h) / len(all_h)
            avg_d = sum(all_d) / len(all_d)
            avg_a = sum(all_a) / len(all_a)

            odds_map[(home.lower(), away.lower())] = {
                "B365H": b365_h or avg_h,
                "B365D": b365_d or avg_d,
                "B365A": b365_a or avg_a,
                "AvgH":  avg_h,
                "AvgD":  avg_d,
                "AvgA":  avg_a,
                "MaxH":  max(all_h),
                "MaxD":  max(all_d),
                "MaxA":  max(all_a),
                "PSH":   b365_h or avg_h,
                "PSD":   b365_d or avg_d,
                "PSA":   b365_a or avg_a,
            }

    return odds_map


def _demo_fixtures() -> list:
    """Meciuri demo daca nu avem API key sau conexiune."""
    return [
        {"home": "Arsenal",      "away": "Chelsea",          "league": "Premier League", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "div": "E0",  "time": "17:30", "competition_code": "PL",  "status": "TIMED", "home_raw": "Arsenal FC", "away_raw": "Chelsea FC"},
        {"home": "Bayern Munich","away": "Dortmund",         "league": "Bundesliga",      "flag": "🇩🇪",      "div": "D1",  "time": "18:30", "competition_code": "BL1", "status": "TIMED", "home_raw": "FC Bayern München", "away_raw": "Borussia Dortmund"},
        {"home": "Inter",        "away": "Milan",            "league": "Serie A",         "flag": "🇮🇹",      "div": "I1",  "time": "20:45", "competition_code": "SA",  "status": "TIMED", "home_raw": "FC Internazionale Milano", "away_raw": "AC Milan"},
        {"home": "Real Madrid",  "away": "Barcelona",        "league": "La Liga",         "flag": "🇪🇸",      "div": "SP1", "time": "21:00", "competition_code": "PD",  "status": "TIMED", "home_raw": "Real Madrid CF", "away_raw": "FC Barcelona"},
        {"home": "Paris SG",     "away": "Marseille",        "league": "Ligue 1",         "flag": "🇫🇷",      "div": "F1",  "time": "20:45", "competition_code": "FL1", "status": "TIMED", "home_raw": "Paris Saint-Germain FC", "away_raw": "Olympique de Marseille"},
        {"home": "Liverpool",    "away": "Manchester City",  "league": "Premier League",  "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "div": "E0",  "time": "16:00", "competition_code": "PL",  "status": "TIMED", "home_raw": "Liverpool FC", "away_raw": "Manchester City FC"},
    ]
