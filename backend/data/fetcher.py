"""
Data Fetcher — football-data.org API (gratuit, 10 competiții majore)
Cache agresiv: fixtures 6h, stats 12h, form 3h
"""

import os
import json
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "b7a245f650554efd8af759f4c571bd40")
FD_BASE = "https://api.football-data.org/v4"

# Map league_id → competition code football-data.org
LEAGUE_TO_CODE = {
    39:  "PL",   # Premier League
    140: "PD",   # La Liga
    78:  "BL1",  # Bundesliga
    135: "SA",   # Serie A
    61:  "FL1",  # Ligue 1
    88:  "DED",  # Eredivisie
    94:  "PPL",  # Primeira Liga
    2:   "CL",   # Champions League
    3:   "EL",   # Europa League
    848: "ECL",  # Conference League
    66:  "EC",   # European Championship
    2001:"CLI",  # Copa Libertadores (limitată)
}

# ─── Cache cu TTL ─────────────────────────────────────────────────────────────
class TTLCache:
    def __init__(self):
        self._data = {}
        self._expires = {}

    def get(self, key):
        if key in self._data:
            if datetime.now() < self._expires[key]:
                return self._data[key]
            del self._data[key], self._expires[key]
        return None

    def set(self, key, value, ttl_seconds):
        self._data[key] = value
        self._expires[key] = datetime.now() + timedelta(seconds=ttl_seconds)

    def stats(self):
        return {"keys": len(self._data), "keys_list": list(self._data.keys())}

_cache = TTLCache()
TTL_FIXTURES = 6 * 3600
TTL_STATS    = 12 * 3600
TTL_FORM     = 3 * 3600

# ─── Demo fallback ─────────────────────────────────────────────────────────────
DEFAULT_TEAM_DATA = {
    "last_5": ["W","D","L","W","D"],
    "xg_for_history": [1.5,1.3,1.7,1.2,1.6],
    "xg_against_history": [1.1,1.3,0.9,1.4,1.0],
    "goals_avg": 1.4,
    "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
}

DEMO_TEAM_DATA = {
    "Manchester City":   {"last_5":["W","W","W","D","W"],"xg_for_history":[2.1,1.9,2.5,1.7,2.0],"xg_against_history":[0.7,0.9,0.5,1.1,0.8],"goals_avg":2.3},
    "Arsenal":           {"last_5":["W","D","W","W","L"],"xg_for_history":[1.8,1.5,1.9,2.1,1.3],"xg_against_history":[0.9,0.8,1.0,0.7,1.4],"goals_avg":1.8},
    "Liverpool":         {"last_5":["W","W","D","W","W"],"xg_for_history":[2.0,2.3,1.6,2.1,1.9],"xg_against_history":[0.8,0.6,1.1,0.7,0.9],"goals_avg":2.1},
    "Chelsea":           {"last_5":["D","W","L","W","D"],"xg_for_history":[1.4,1.7,1.1,1.8,1.3],"xg_against_history":[1.1,0.9,1.5,0.8,1.2],"goals_avg":1.5},
    "Tottenham Hotspur": {"last_5":["W","L","W","D","L"],"xg_for_history":[1.6,1.1,1.8,1.3,1.0],"xg_against_history":[1.2,1.5,0.9,1.1,1.6],"goals_avg":1.5},
    "Manchester United": {"last_5":["L","D","W","L","D"],"xg_for_history":[1.2,1.0,1.5,1.1,1.3],"xg_against_history":[1.4,1.2,1.0,1.5,1.1],"goals_avg":1.2},
    "Real Madrid":       {"last_5":["W","W","W","W","D"],"xg_for_history":[2.3,1.8,2.5,2.0,1.6],"xg_against_history":[0.6,0.8,0.4,0.9,1.0],"goals_avg":2.5},
    "Barcelona":         {"last_5":["W","D","W","L","W"],"xg_for_history":[1.9,1.5,2.1,1.2,1.8],"xg_against_history":[0.8,1.0,0.7,1.6,0.9],"goals_avg":2.1},
    "Bayern Munich":     {"last_5":["W","W","W","W","W"],"xg_for_history":[2.8,2.1,3.0,2.4,2.6],"xg_against_history":[0.5,0.8,0.4,0.9,0.6],"goals_avg":2.9},
    "Borussia Dortmund": {"last_5":["W","L","W","D","W"],"xg_for_history":[1.8,1.2,2.0,1.5,1.7],"xg_against_history":[1.0,1.6,0.9,1.1,1.2],"goals_avg":1.8},
    "Bayer Leverkusen":  {"last_5":["W","W","D","W","W"],"xg_for_history":[2.0,1.8,1.6,2.1,1.9],"xg_against_history":[0.7,0.8,0.9,0.6,0.8],"goals_avg":2.0},
    "PSG":               {"last_5":["W","W","D","W","W"],"xg_for_history":[2.5,2.0,1.8,2.3,2.7],"xg_against_history":[0.6,0.9,1.1,0.7,0.5],"goals_avg":2.6},
    "Inter":             {"last_5":["W","W","W","D","W"],"xg_for_history":[2.0,1.8,2.3,1.5,1.9],"xg_against_history":[0.7,0.9,0.6,1.0,0.8],"goals_avg":2.1},
    "Juventus":          {"last_5":["W","D","W","D","W"],"xg_for_history":[1.5,1.3,1.7,1.4,1.6],"xg_against_history":[0.8,0.9,0.7,0.9,0.8],"goals_avg":1.6},
    "AC Milan":          {"last_5":["W","W","D","L","W"],"xg_for_history":[1.7,1.9,1.4,1.1,1.8],"xg_against_history":[0.9,0.8,1.0,1.4,0.7],"goals_avg":1.7},
    "Atletico Madrid":   {"last_5":["W","D","W","W","D"],"xg_for_history":[1.5,1.2,1.8,1.4,1.6],"xg_against_history":[0.7,0.8,0.6,0.9,0.7],"goals_avg":1.6},
    "FCSB":              {"last_5":["W","W","D","W","L"],"xg_for_history":[1.4,1.6,1.2,1.5,1.1],"xg_against_history":[0.9,1.0,0.8,1.1,1.3],"goals_avg":1.4},
    "CFR Cluj":          {"last_5":["D","W","W","D","W"],"xg_for_history":[1.2,1.4,1.5,1.1,1.3],"xg_against_history":[0.8,0.9,0.7,1.0,0.9],"goals_avg":1.3},
}
# Adaugă h2h default la toate
for k in DEMO_TEAM_DATA:
    DEMO_TEAM_DATA[k].setdefault("h2h_home_wins", 2)
    DEMO_TEAM_DATA[k].setdefault("h2h_draws", 2)
    DEMO_TEAM_DATA[k].setdefault("h2h_away_wins", 2)


class DataFetcher:
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._request_count = 0

    async def _get_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=15),
                headers={"X-Auth-Token": FOOTBALL_DATA_KEY}
            )
        return self._session

    async def _get(self, endpoint: str, params: dict = {}) -> dict:
        self._request_count += 1
        logger.info(f"FD request #{self._request_count}: {endpoint}")
        try:
            session = await self._get_session()
            url = f"{FD_BASE}/{endpoint}"
            async with session.get(url, params=params) as resp:
                if resp.status == 429:
                    logger.warning("Rate limit — aștept 60s")
                    await asyncio.sleep(60)
                    return {}
                if resp.status in (400, 403, 404):
                    logger.warning(f"FD {resp.status} pentru {endpoint}")
                    return {}
                if resp.status != 200:
                    logger.error(f"FD error {resp.status}")
                    return {}
                return await resp.json()
        except Exception as e:
            logger.error(f"FD request error: {e}")
            return {}

    # ─── FIXTURES ─────────────────────────────────────────────────────────────
    async def get_fixtures(self, league_id: int, season: int = 2024) -> list:
        """Meciurile viitoare din football-data.org, cache 6h."""
        code = LEAGUE_TO_CODE.get(league_id)
        if not code or not FOOTBALL_DATA_KEY:
            return []

        cache_key = f"fd_fix_{league_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache HIT fixtures {league_id}")
            return cached

        # football-data.org: /competitions/{code}/matches?status=SCHEDULED
        data = await self._get(
            f"competitions/{code}/matches",
            {"status": "SCHEDULED", "limit": 20}
        )

        fixtures = []
        for m in data.get("matches", []):
            utc_date = m.get("utcDate", "")
            # Convertim UTC → ora României (UTC+2 iarna, UTC+3 vara)
            try:
                dt_utc = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
                dt_ro = dt_utc + timedelta(hours=2)  # UTC+2 iarna
                date_str = dt_ro.strftime("%Y-%m-%d")
                time_str = dt_ro.strftime("%H:%M")
            except Exception:
                date_str = utc_date[:10] if utc_date else ""
                time_str = ""

            home = m.get("homeTeam", {})
            away = m.get("awayTeam", {})
            fixtures.append({
                "id":      m.get("id"),
                "home":    home.get("shortName") or home.get("name", ""),
                "away":    away.get("shortName") or away.get("name", ""),
                "home_id": home.get("id"),
                "away_id": away.get("id"),
                "date":    date_str,
                "time":    time_str,
                "status":  m.get("status", "SCHEDULED"),
            })

        if fixtures:
            _cache.set(cache_key, fixtures, TTL_FIXTURES)
            logger.info(f"Cache SET fixtures {league_id}: {len(fixtures)} meciuri (6h)")

        return fixtures

    # ─── FORMA ECHIPĂ din ultimele meciuri ────────────────────────────────────
    async def get_team_form(self, team_id: int, league_id: int) -> dict:
        """Ultimele 5 meciuri ale echipei, cache 3h."""
        if not team_id or not FOOTBALL_DATA_KEY:
            return {}

        cache_key = f"fd_form_{team_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = await self._get(f"teams/{team_id}/matches", {"status": "FINISHED", "limit": 5})

        matches = data.get("matches", [])
        if not matches:
            return {}

        form = []
        goals_for_list = []
        goals_ag_list  = []

        for m in matches:
            teams  = m.get("homeTeam", {}), m.get("awayTeam", {})
            score  = m.get("score", {}).get("fullTime", {})
            is_home = m.get("homeTeam", {}).get("id") == team_id
            gf = score.get("home" if is_home else "away") or 0
            ga = score.get("away" if is_home else "home") or 0
            form.append("W" if gf > ga else "D" if gf == ga else "L")
            goals_for_list.append(int(gf))
            goals_ag_list.append(int(ga))

        avg_for = round(sum(goals_for_list) / len(goals_for_list), 2) if goals_for_list else 1.4
        result = {
            "last_5":             form[:5],
            "xg_for_history":     [round(g * 1.05, 2) for g in goals_for_list[:5]],
            "xg_against_history": [round(g * 1.05, 2) for g in goals_ag_list[:5]],
            "goals_avg":          avg_for,
            "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
        }

        _cache.set(cache_key, result, TTL_FORM)
        logger.info(f"Cache SET form echipa {team_id} (3h) — forma: {form}")
        return result

    # ─── MAIN GETTER ──────────────────────────────────────────────────────────
    async def get_team_data(self, team_name: str, team_id: int = None, league_id: int = 39) -> dict:
        """Date reale cu fallback la demo."""
        data = dict(DEMO_TEAM_DATA.get(team_name, DEFAULT_TEAM_DATA))
        data["_source"] = "demo"

        code = LEAGUE_TO_CODE.get(league_id)
        if FOOTBALL_DATA_KEY and team_id and code:
            try:
                form = await self.get_team_form(team_id, league_id)
                if form:
                    data.update(form)
                    data["_source"] = "live"
                    logger.info(f"✅ Date reale pentru {team_name}")
            except Exception as e:
                logger.warning(f"FD failed {team_name}: {e}")

        return data

    async def get_team_stats(self, team_id: int, league_id: int, season: int) -> dict:
        return await self.get_team_form(team_id, league_id)

    def cache_stats(self) -> dict:
        return {
            "request_count": self._request_count,
            "cache": _cache.stats()
        }

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
