"""
Data Fetcher - integrează:
1. API-Football (api-football.com) - fixtures, standings, statistici
2. football-data.org - date istorice gratuite
3. FBref scraping light - xG data
"""

import os
import json
import asyncio
import aiohttp
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ─── Config API Keys (din .env sau variabile de mediu) ───────────────────────
API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")  # Gratuit la api-football.com
FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")  # Gratuit la football-data.org

# ─── DEMO DATA ───────────────────────────────────────────────────────────────

DEMO_TEAM_DATA = {
    "Manchester City": {
        "last_5": ["W", "W", "W", "D", "W"],
        "xg_for_history": [2.1, 1.9, 2.5, 1.7, 2.0],
        "xg_against_history": [0.7, 0.9, 0.5, 1.1, 0.8],
        "goals_avg": 2.3,
        "h2h_home_wins": 4, "h2h_draws": 2, "h2h_away_wins": 1,
    },
    "Arsenal": {
        "last_5": ["W", "D", "W", "W", "L"],
        "xg_for_history": [1.8, 1.5, 1.9, 2.1, 1.3],
        "xg_against_history": [0.9, 0.8, 1.0, 0.7, 1.4],
        "goals_avg": 1.8,
        "h2h_home_wins": 1, "h2h_draws": 2, "h2h_away_wins": 4,
    },
    "Liverpool": {
        "last_5": ["W", "W", "D", "W", "W"],
        "xg_for_history": [2.0, 2.3, 1.6, 2.1, 1.9],
        "xg_against_history": [0.8, 0.6, 1.1, 0.7, 0.9],
        "goals_avg": 2.1,
        "h2h_home_wins": 3, "h2h_draws": 3, "h2h_away_wins": 2,
    },
    "Chelsea": {
        "last_5": ["D", "W", "L", "W", "D"],
        "xg_for_history": [1.4, 1.7, 1.1, 1.8, 1.3],
        "xg_against_history": [1.1, 0.9, 1.5, 0.8, 1.2],
        "goals_avg": 1.5,
        "h2h_home_wins": 2, "h2h_draws": 3, "h2h_away_wins": 3,
    },
    "Real Madrid": {
        "last_5": ["W", "W", "W", "W", "D"],
        "xg_for_history": [2.3, 1.8, 2.5, 2.0, 1.6],
        "xg_against_history": [0.6, 0.8, 0.4, 0.9, 1.0],
        "goals_avg": 2.5,
        "h2h_home_wins": 5, "h2h_draws": 1, "h2h_away_wins": 2,
    },
    "Barcelona": {
        "last_5": ["W", "D", "W", "L", "W"],
        "xg_for_history": [1.9, 1.5, 2.1, 1.2, 1.8],
        "xg_against_history": [0.8, 1.0, 0.7, 1.6, 0.9],
        "goals_avg": 2.1,
        "h2h_home_wins": 2, "h2h_draws": 1, "h2h_away_wins": 5,
    },
}

DEFAULT_TEAM_DATA = {
    "last_5": ["W", "D", "L", "W", "D"],
    "xg_for_history": [1.5, 1.3, 1.7, 1.2, 1.6],
    "xg_against_history": [1.1, 1.3, 0.9, 1.4, 1.0],
    "goals_avg": 1.4,
    "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
}


class DataFetcher:
    """
    Fetch date din multiple surse cu fallback la demo data.
    """

    def __init__(self):
        self.session = None
        self._cache = {}

    async def _get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    # ─── API-FOOTBALL ────────────────────────────────────────────────────────

    async def get_fixtures(self, league_id: int, season: int = 2024) -> list:
        """
        Fixtures din API-Football.
        Endpoint: GET /v3/fixtures?league={id}&season={year}&next=10
        """
        if not API_FOOTBALL_KEY:
            logger.info("API_FOOTBALL_KEY not set, using demo fixtures")
            return []

        cache_key = f"fixtures_{league_id}_{season}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        url = f"https://v3.football.api-sports.io/fixtures"
        headers = {
            "x-apisports-key": API_FOOTBALL_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io"
        }
        params = {"league": league_id, "season": season, "next": 15}

        try:
            session = await self._get_session()
            async with session.get(url, headers=headers, params=params, timeout=10) as resp:
                data = await resp.json()
                fixtures = []
                for f in data.get("response", []):
                    fixture = {
                        "id": f["fixture"]["id"],
                        "home": f["teams"]["home"]["name"],
                        "away": f["teams"]["away"]["name"],
                        "home_id": f["teams"]["home"]["id"],
                        "away_id": f["teams"]["away"]["id"],
                        "date": f["fixture"]["date"][:10] if f["fixture"].get("date") else "",
                        "status": f["fixture"]["status"]["short"],
                    }
                    fixtures.append(fixture)
                self._cache[cache_key] = fixtures
                return fixtures
        except Exception as e:
            logger.error(f"API-Football error: {e}")
            return []

    async def get_team_stats_api_football(self, team_id: int, league_id: int, season: int) -> dict:
        """Statistici echipă din API-Football."""
        if not API_FOOTBALL_KEY:
            return {}

        url = "https://v3.football.api-sports.io/teams/statistics"
        headers = {"x-apisports-key": API_FOOTBALL_KEY}
        params = {"team": team_id, "league": league_id, "season": season}

        try:
            session = await self._get_session()
            async with session.get(url, headers=headers, params=params, timeout=10) as resp:
                data = await resp.json()
                r = data.get("response", {})
                goals = r.get("goals", {})
                return {
                    "goals_avg": goals.get("for", {}).get("average", {}).get("total", 1.5),
                    "goals_against_avg": goals.get("against", {}).get("average", {}).get("total", 1.2),
                    "form_string": r.get("form", "WWDWL")[:5],
                }
        except Exception as e:
            logger.error(f"Team stats error: {e}")
            return {}

    # ─── FOOTBALL-DATA.ORG ───────────────────────────────────────────────────

    async def get_historical_matches(self, competition_code: str, season: int = 2023) -> list:
        """
        Date istorice din football-data.org.
        API Key gratuit la football-data.org.
        Coduri: PL=Premier League, PD=La Liga, SA=Serie A, BL1=Bundesliga, FL1=Ligue 1
        """
        if not FOOTBALL_DATA_KEY:
            return []

        url = f"https://api.football-data.org/v4/competitions/{competition_code}/matches"
        headers = {"X-Auth-Token": FOOTBALL_DATA_KEY}
        params = {"season": season, "status": "FINISHED"}

        try:
            session = await self._get_session()
            async with session.get(url, headers=headers, params=params, timeout=15) as resp:
                data = await resp.json()
                matches = []
                for m in data.get("matches", []):
                    score = m.get("score", {}).get("fullTime", {})
                    home_g = score.get("home", 0) or 0
                    away_g = score.get("away", 0) or 0
                    result = "1" if home_g > away_g else "X" if home_g == away_g else "2"
                    matches.append({
                        "date": m["utcDate"][:10],
                        "home": m["homeTeam"]["name"],
                        "away": m["awayTeam"]["name"],
                        "home_goals": home_g,
                        "away_goals": away_g,
                        "result": result,
                    })
                return matches
        except Exception as e:
            logger.error(f"football-data.org error: {e}")
            return []

    # ─── FBREF xG SCRAPER ────────────────────────────────────────────────────

    async def scrape_xg_fbref(self, team_name: str, last_n: int = 5) -> dict:
        """
        Scraping light din FBref pentru xG.
        Folosim pagina de matches a echipei.
        IMPORTANT: Respectă robots.txt - rate limiting 5 req/min.
        """
        try:
            import re
            from bs4 import BeautifulSoup

            # URL FBref pentru echipă (necesită căutare/mapping)
            fbref_ids = {
                "Manchester City": "b8fd03ef",
                "Arsenal": "18bb7c10",
                "Liverpool": "822bd0ba",
                "Chelsea": "cff3d9bb",
                "Real Madrid": "53a2f082",
                "Barcelona": "206d90db",
            }

            team_id = fbref_ids.get(team_name)
            if not team_id:
                return {}

            url = f"https://fbref.com/en/squads/{team_id}/matchlogs/c9/schedule/"
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; FootballPredictor/1.0; research only)",
                "Accept-Language": "en-US,en;q=0.9",
            }

            session = await self._get_session()
            async with session.get(url, headers=headers, timeout=15) as resp:
                if resp.status != 200:
                    return {}
                html = await resp.text()

            soup = BeautifulSoup(html, "html.parser")

            # Extrage tabel schedule
            table = soup.find("table", {"id": re.compile("matchlogs")})
            if not table:
                return {}

            xg_for = []
            xg_against = []
            rows = table.find("tbody").find_all("tr")

            for row in rows:
                if row.get("class") and "spacer" in row.get("class", []):
                    continue
                cells = row.find_all("td")
                if len(cells) < 10:
                    continue

                # Caută coloanele xG (de obicei pozițiile 7-8 în tabel)
                for cell in cells:
                    data_stat = cell.get("data-stat", "")
                    if data_stat == "xg_for":
                        try:
                            xg_for.append(float(cell.text.strip()))
                        except:
                            pass
                    elif data_stat == "xg_against":
                        try:
                            xg_against.append(float(cell.text.strip()))
                        except:
                            pass

                if len(xg_for) >= last_n:
                    break

            # Rate limiting
            await asyncio.sleep(0.5)

            return {
                "xg_for_history": xg_for[:last_n],
                "xg_against_history": xg_against[:last_n],
            }

        except Exception as e:
            logger.warning(f"FBref scraping failed for {team_name}: {e}")
            return {}

    # ─── MAIN GETTER ─────────────────────────────────────────────────────────

    async def get_team_data(self, team_name: str, team_id: int = None, league_id: int = 39) -> dict:
        """
        Agregă date din toate sursele cu fallback.
        Prioritate: API-Football > FBref > Demo data
        """
        # 1. Start cu date demo sau default
        data = DEMO_TEAM_DATA.get(team_name, DEFAULT_TEAM_DATA.copy())

        # 2. Încearcă API-Football pentru statistici
        if team_id and API_FOOTBALL_KEY:
            try:
                api_stats = await self.get_team_stats_api_football(team_id, league_id, 2024)
                if api_stats:
                    data.update(api_stats)
                    # Convertește form string în list
                    if "form_string" in api_stats:
                        form_str = api_stats["form_string"]
                        data["last_5"] = list(form_str[:5].replace("W", "W").replace("D", "D").replace("L", "L"))
            except Exception as e:
                logger.warning(f"API-Football failed: {e}")

        # 3. Încearcă FBref pentru xG
        try:
            xg_data = await self.scrape_xg_fbref(team_name)
            if xg_data.get("xg_for_history"):
                data.update(xg_data)
        except Exception as e:
            logger.warning(f"FBref scraping failed: {e}")

        return data

    async def get_team_stats(self, team_id: int, league_id: int, season: int) -> dict:
        """Statistici complete echipă."""
        return await self.get_team_stats_api_football(team_id, league_id, season)

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
