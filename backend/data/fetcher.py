"""
Data Fetcher — API-Football v3 (api-sports.io)
Aduce fixtures reale, statistici echipe, forma și xG live.
"""

import os
import json
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"

# ─── Cache simplu în memorie (TTL 10 minute) ──────────────────────────────────
_cache: dict = {}
_cache_ts: dict = {}
CACHE_TTL = 600  # secunde

def _get_cache(key):
    if key in _cache:
        if (datetime.now().timestamp() - _cache_ts.get(key, 0)) < CACHE_TTL:
            return _cache[key]
    return None

def _set_cache(key, value):
    _cache[key] = value
    _cache_ts[key] = datetime.now().timestamp()

# ─── Date demo fallback ───────────────────────────────────────────────────────
DEFAULT_TEAM_DATA = {
    "last_5": ["W", "D", "L", "W", "D"],
    "xg_for_history": [1.5, 1.3, 1.7, 1.2, 1.6],
    "xg_against_history": [1.1, 1.3, 0.9, 1.4, 1.0],
    "goals_avg": 1.4,
    "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
}

DEMO_TEAM_DATA = {
    "Manchester City":  {"last_5":["W","W","W","D","W"],"xg_for_history":[2.1,1.9,2.5,1.7,2.0],"xg_against_history":[0.7,0.9,0.5,1.1,0.8],"goals_avg":2.3,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Arsenal":          {"last_5":["W","D","W","W","L"],"xg_for_history":[1.8,1.5,1.9,2.1,1.3],"xg_against_history":[0.9,0.8,1.0,0.7,1.4],"goals_avg":1.8,"h2h_home_wins":1,"h2h_draws":2,"h2h_away_wins":4},
    "Liverpool":        {"last_5":["W","W","D","W","W"],"xg_for_history":[2.0,2.3,1.6,2.1,1.9],"xg_against_history":[0.8,0.6,1.1,0.7,0.9],"goals_avg":2.1,"h2h_home_wins":3,"h2h_draws":3,"h2h_away_wins":2},
    "Chelsea":          {"last_5":["D","W","L","W","D"],"xg_for_history":[1.4,1.7,1.1,1.8,1.3],"xg_against_history":[1.1,0.9,1.5,0.8,1.2],"goals_avg":1.5,"h2h_home_wins":2,"h2h_draws":3,"h2h_away_wins":3},
    "Real Madrid":      {"last_5":["W","W","W","W","D"],"xg_for_history":[2.3,1.8,2.5,2.0,1.6],"xg_against_history":[0.6,0.8,0.4,0.9,1.0],"goals_avg":2.5,"h2h_home_wins":5,"h2h_draws":1,"h2h_away_wins":2},
    "Barcelona":        {"last_5":["W","D","W","L","W"],"xg_for_history":[1.9,1.5,2.1,1.2,1.8],"xg_against_history":[0.8,1.0,0.7,1.6,0.9],"goals_avg":2.1,"h2h_home_wins":2,"h2h_draws":1,"h2h_away_wins":5},
    "Bayern Munich":    {"last_5":["W","W","W","W","W"],"xg_for_history":[2.8,2.1,3.0,2.4,2.6],"xg_against_history":[0.5,0.8,0.4,0.9,0.6],"goals_avg":2.9,"h2h_home_wins":5,"h2h_draws":1,"h2h_away_wins":1},
    "PSG":              {"last_5":["W","W","D","W","W"],"xg_for_history":[2.5,2.0,1.8,2.3,2.7],"xg_against_history":[0.6,0.9,1.1,0.7,0.5],"goals_avg":2.6,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Inter":            {"last_5":["W","W","W","D","W"],"xg_for_history":[2.0,1.8,2.3,1.5,1.9],"xg_against_history":[0.7,0.9,0.6,1.0,0.8],"goals_avg":2.1,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Atletico Madrid":  {"last_5":["W","D","W","W","D"],"xg_for_history":[1.5,1.2,1.8,1.4,1.6],"xg_against_history":[0.7,0.8,0.6,0.9,0.7],"goals_avg":1.6,"h2h_home_wins":3,"h2h_draws":3,"h2h_away_wins":1},
    "Tottenham":        {"last_5":["W","L","W","D","L"],"xg_for_history":[1.6,1.1,1.8,1.3,1.0],"xg_against_history":[1.2,1.5,0.9,1.1,1.6],"goals_avg":1.5,"h2h_home_wins":2,"h2h_draws":2,"h2h_away_wins":3},
    "FCSB":             {"last_5":["W","W","D","W","L"],"xg_for_history":[1.4,1.6,1.2,1.5,1.1],"xg_against_history":[0.9,1.0,0.8,1.1,1.3],"goals_avg":1.4,"h2h_home_wins":3,"h2h_draws":2,"h2h_away_wins":2},
    "CFR Cluj":         {"last_5":["D","W","W","D","W"],"xg_for_history":[1.2,1.4,1.5,1.1,1.3],"xg_against_history":[0.8,0.9,0.7,1.0,0.9],"goals_avg":1.3,"h2h_home_wins":2,"h2h_draws":3,"h2h_away_wins":2},
}


class DataFetcher:
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None

    async def _session_get(self):
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=15)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    def _headers(self):
        return {
            "x-apisports-key": API_FOOTBALL_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io",
        }

    # ─── FIXTURES ─────────────────────────────────────────────────────────────
    async def get_fixtures(self, league_id: int, season: int = 2024) -> list:
        """
        Aduce meciurile viitoare din API-Football (next=15).
        Returnează lista cu date și ore în ora României (UTC+2).
        """
        if not API_FOOTBALL_KEY:
            logger.info("API_FOOTBALL_KEY lipsă — folosesc demo fixtures")
            return []

        cache_key = f"fix_{league_id}_{season}"
        cached = _get_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{API_BASE}/fixtures"
        params = {
            "league": league_id,
            "season": season,
            "next": 15,
            "timezone": "Europe/Bucharest",
        }

        try:
            session = await self._session_get()
            async with session.get(url, headers=self._headers(), params=params) as resp:
                if resp.status != 200:
                    logger.error(f"API-Football fixtures {resp.status}")
                    return []
                data = await resp.json()

            fixtures = []
            for f in data.get("response", []):
                fix = f.get("fixture", {})
                teams = f.get("teams", {})
                raw_date = fix.get("date", "")  # ISO cu timezone
                date_str = raw_date[:10] if raw_date else ""
                # Ora din API e deja în timezone-ul cerut (Europe/Bucharest)
                time_str = raw_date[11:16] if len(raw_date) >= 16 else ""

                fixtures.append({
                    "id": fix.get("id"),
                    "home": teams.get("home", {}).get("name", ""),
                    "away": teams.get("away", {}).get("name", ""),
                    "home_id": teams.get("home", {}).get("id"),
                    "away_id": teams.get("away", {}).get("id"),
                    "date": date_str,
                    "time": time_str,
                    "status": fix.get("status", {}).get("short", "NS"),
                })

            _set_cache(cache_key, fixtures)
            logger.info(f"API-Football: {len(fixtures)} meciuri pentru liga {league_id}")
            return fixtures

        except Exception as e:
            logger.error(f"get_fixtures error: {e}")
            return []

    # ─── STATISTICI ECHIPĂ ─────────────────────────────────────────────────────
    async def get_team_stats_live(self, team_id: int, league_id: int, season: int = 2024) -> dict:
        """Statistici reale: formă, goluri, xG proxy."""
        if not API_FOOTBALL_KEY or not team_id:
            return {}

        cache_key = f"stats_{team_id}_{league_id}_{season}"
        cached = _get_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{API_BASE}/teams/statistics"
        params = {"team": team_id, "league": league_id, "season": season}

        try:
            session = await self._session_get()
            async with session.get(url, headers=self._headers(), params=params) as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()

            r = data.get("response", {})
            if not r:
                return {}

            goals_for   = r.get("goals", {}).get("for", {})
            goals_ag    = r.get("goals", {}).get("against", {})
            form_str    = (r.get("form") or "WDLWD")[-5:]
            avg_for     = float(goals_for.get("average", {}).get("total") or 1.4)
            avg_ag      = float(goals_ag.get("average", {}).get("total") or 1.2)

            # Construim xG proxy din medie goluri (±10% variație)
            xg_for_hist     = [round(avg_for * (0.9 + 0.2 * (i % 3) / 2), 2) for i in range(5)]
            xg_against_hist = [round(avg_ag  * (0.9 + 0.2 * (i % 3) / 2), 2) for i in range(5)]
            form_list       = [c for c in form_str if c in ("W","D","L")]

            result = {
                "last_5":            form_list[:5] or ["W","D","L","W","D"],
                "xg_for_history":    xg_for_hist,
                "xg_against_history":xg_against_hist,
                "goals_avg":         avg_for,
                "goals_against_avg": avg_ag,
                "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
            }
            _set_cache(cache_key, result)
            return result

        except Exception as e:
            logger.error(f"get_team_stats_live error: {e}")
            return {}

    # ─── ULTIME 5 MECIURI ─────────────────────────────────────────────────────
    async def get_last_fixtures(self, team_id: int, league_id: int, season: int = 2024) -> list:
        """Ultimele 5 meciuri jucate ale echipei."""
        if not API_FOOTBALL_KEY or not team_id:
            return []

        cache_key = f"last5_{team_id}_{season}"
        cached = _get_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{API_BASE}/fixtures"
        params = {"team": team_id, "last": 5}

        try:
            session = await self._session_get()
            async with session.get(url, headers=self._headers(), params=params) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()

            matches = []
            for f in data.get("response", []):
                teams  = f.get("teams", {})
                goals  = f.get("goals", {})
                is_home = teams.get("home", {}).get("id") == team_id
                gf = goals.get("home") if is_home else goals.get("away")
                ga = goals.get("away") if is_home else goals.get("home")
                if gf is None or ga is None:
                    continue
                result = "W" if gf > ga else "D" if gf == ga else "L"
                matches.append({
                    "result": result,
                    "goals_for": gf,
                    "goals_against": ga,
                    "is_home": is_home,
                })

            _set_cache(cache_key, matches)
            return matches

        except Exception as e:
            logger.error(f"get_last_fixtures error: {e}")
            return []

    # ─── MAIN GETTER ──────────────────────────────────────────────────────────
    async def get_team_data(self, team_name: str, team_id: int = None, league_id: int = 39) -> dict:
        """
        Agregă date reale + fallback la demo.
        1. API-Football statistici sezon (goals avg, formă)
        2. Ultimele 5 meciuri pentru xG proxy
        3. Fallback demo/default
        """
        # Baza: date demo
        data = dict(DEMO_TEAM_DATA.get(team_name, DEFAULT_TEAM_DATA))

        if API_FOOTBALL_KEY and team_id:
            # Statistici sezon curent
            stats = await self.get_team_stats_live(team_id, league_id, 2024)
            if stats:
                data.update(stats)
                logger.info(f"✅ Date reale pentru {team_name}")

            # Ultimele 5 meciuri — xG proxy mai precis
            last5 = await self.get_last_fixtures(team_id, league_id, 2024)
            if len(last5) >= 3:
                data["last_5"] = [m["result"] for m in last5[:5]]
                data["xg_for_history"]     = [round(m["goals_for"]     * 1.05, 2) for m in last5[:5]]
                data["xg_against_history"] = [round(m["goals_against"] * 1.05, 2) for m in last5[:5]]
                data["goals_avg"] = round(
                    sum(m["goals_for"] for m in last5) / len(last5), 2
                )
        else:
            logger.info(f"Demo data pentru {team_name}")

        return data

    async def get_team_stats(self, team_id: int, league_id: int, season: int) -> dict:
        return await self.get_team_stats_live(team_id, league_id, season)

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
