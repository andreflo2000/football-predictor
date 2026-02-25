"""
Data Fetcher — API-Football v3 cu cache agresiv
- Fixtures: cache 6 ore (se reîmprospătează rar)
- Statistici echipă: cache 12 ore
- Ultimele meciuri: cache 3 ore
- Total requesturi/zi: ~20-30 (față de 100 limita gratuită)
"""

import os
import json
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")
API_BASE = "https://v3.football.api-sports.io"

# ─── Cache persistent în memorie cu TTL ───────────────────────────────────────
class TTLCache:
    def __init__(self):
        self._data = {}
        self._expires = {}

    def get(self, key: str):
        if key in self._data:
            if datetime.now() < self._expires[key]:
                return self._data[key]
            else:
                del self._data[key]
                del self._expires[key]
        return None

    def set(self, key: str, value, ttl_seconds: int):
        self._data[key] = value
        self._expires[key] = datetime.now() + timedelta(seconds=ttl_seconds)

    def clear(self):
        self._data.clear()
        self._expires.clear()

    def stats(self):
        return {
            "keys": len(self._data),
            "keys_list": list(self._data.keys())
        }

# Cache global — trăiește cât timp serverul rulează
_cache = TTLCache()

# TTL-uri (în secunde)
TTL_FIXTURES   = 6 * 3600   # 6 ore — meciurile nu se schimbă des
TTL_TEAM_STATS = 12 * 3600  # 12 ore — statisticile sezonului
TTL_LAST_5     = 3 * 3600   # 3 ore — ultimele meciuri
TTL_H2H        = 24 * 3600  # 24 ore — head to head istoric

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
    "Borussia Dortmund":{"last_5":["W","L","W","D","W"],"xg_for_history":[1.8,1.2,2.0,1.5,1.7],"xg_against_history":[1.0,1.6,0.9,1.1,1.2],"goals_avg":1.8,"h2h_home_wins":2,"h2h_draws":2,"h2h_away_wins":3},
    "PSG":              {"last_5":["W","W","D","W","W"],"xg_for_history":[2.5,2.0,1.8,2.3,2.7],"xg_against_history":[0.6,0.9,1.1,0.7,0.5],"goals_avg":2.6,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Inter":            {"last_5":["W","W","W","D","W"],"xg_for_history":[2.0,1.8,2.3,1.5,1.9],"xg_against_history":[0.7,0.9,0.6,1.0,0.8],"goals_avg":2.1,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Juventus":         {"last_5":["W","D","W","D","W"],"xg_for_history":[1.5,1.3,1.7,1.4,1.6],"xg_against_history":[0.8,0.9,0.7,0.9,0.8],"goals_avg":1.6,"h2h_home_wins":3,"h2h_draws":3,"h2h_away_wins":1},
    "AC Milan":         {"last_5":["W","W","D","L","W"],"xg_for_history":[1.7,1.9,1.4,1.1,1.8],"xg_against_history":[0.9,0.8,1.0,1.4,0.7],"goals_avg":1.7,"h2h_home_wins":3,"h2h_draws":2,"h2h_away_wins":2},
    "Atletico Madrid":  {"last_5":["W","D","W","W","D"],"xg_for_history":[1.5,1.2,1.8,1.4,1.6],"xg_against_history":[0.7,0.8,0.6,0.9,0.7],"goals_avg":1.6,"h2h_home_wins":3,"h2h_draws":3,"h2h_away_wins":1},
    "FCSB":             {"last_5":["W","W","D","W","L"],"xg_for_history":[1.4,1.6,1.2,1.5,1.1],"xg_against_history":[0.9,1.0,0.8,1.1,1.3],"goals_avg":1.4,"h2h_home_wins":3,"h2h_draws":2,"h2h_away_wins":2},
    "CFR Cluj":         {"last_5":["D","W","W","D","W"],"xg_for_history":[1.2,1.4,1.5,1.1,1.3],"xg_against_history":[0.8,0.9,0.7,1.0,0.9],"goals_avg":1.3,"h2h_home_wins":2,"h2h_draws":3,"h2h_away_wins":2},
    "Rapid Bucuresti":  {"last_5":["L","W","D","W","W"],"xg_for_history":[1.3,1.5,1.1,1.4,1.6],"xg_against_history":[1.1,0.9,1.2,0.8,1.0],"goals_avg":1.4,"h2h_home_wins":2,"h2h_draws":2,"h2h_away_wins":3},
    "Flamengo":         {"last_5":["W","W","W","D","W"],"xg_for_history":[2.0,1.8,2.2,1.6,1.9],"xg_against_history":[0.8,1.0,0.7,1.1,0.9],"goals_avg":2.0,"h2h_home_wins":4,"h2h_draws":1,"h2h_away_wins":2},
    "Palmeiras":        {"last_5":["W","D","W","W","D"],"xg_for_history":[1.8,1.5,1.9,1.7,1.6],"xg_against_history":[0.7,0.9,0.8,0.6,1.0],"goals_avg":1.8,"h2h_home_wins":3,"h2h_draws":2,"h2h_away_wins":2},
    "River Plate":      {"last_5":["W","W","D","W","L"],"xg_for_history":[1.9,2.1,1.6,1.8,1.3],"xg_against_history":[0.8,0.7,1.0,0.9,1.4],"goals_avg":1.8,"h2h_home_wins":4,"h2h_draws":2,"h2h_away_wins":1},
    "Boca Juniors":     {"last_5":["D","W","L","W","W"],"xg_for_history":[1.5,1.7,1.2,1.6,1.8],"xg_against_history":[1.0,0.9,1.3,0.8,0.7],"goals_avg":1.6,"h2h_home_wins":1,"h2h_draws":2,"h2h_away_wins":4},
    "Al-Hilal":         {"last_5":["W","W","W","W","D"],"xg_for_history":[2.2,2.5,1.9,2.3,2.0],"xg_against_history":[0.6,0.5,0.8,0.7,0.9],"goals_avg":2.3,"h2h_home_wins":5,"h2h_draws":1,"h2h_away_wins":1},
    "Al-Nassr":         {"last_5":["W","W","D","W","L"],"xg_for_history":[2.0,2.3,1.7,2.1,1.5],"xg_against_history":[0.8,0.7,1.0,0.9,1.3],"goals_avg":2.0,"h2h_home_wins":3,"h2h_draws":1,"h2h_away_wins":3},
}


class DataFetcher:
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._request_count = 0  # contor requesturi azi

    async def _get_session(self):
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=15)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    def _headers(self):
        return {
            "x-apisports-key": API_FOOTBALL_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io",
        }

    async def _api_get(self, endpoint: str, params: dict) -> dict:
        """Request cu rate limiting și error handling."""
        if not API_FOOTBALL_KEY:
            return {}
        self._request_count += 1
        logger.info(f"API request #{self._request_count}: {endpoint} {params}")
        try:
            session = await self._get_session()
            url = f"{API_BASE}/{endpoint}"
            async with session.get(url, headers=self._headers(), params=params) as resp:
                if resp.status == 429:
                    logger.warning("Rate limit atins! Aștept 2 secunde...")
                    await asyncio.sleep(2)
                    return {}
                if resp.status != 200:
                    logger.error(f"API error {resp.status} pentru {endpoint}")
                    return {}
                data = await resp.json()
                # Verifică erori API-Football
                errors = data.get("errors", {})
                if errors:
                    logger.error(f"API-Football errors: {errors}")
                    return {}
                remaining = data.get("results", -1)
                logger.info(f"API OK — {data.get('results', 0)} rezultate")
                return data
        except asyncio.TimeoutError:
            logger.error(f"Timeout pentru {endpoint}")
            return {}
        except Exception as e:
            logger.error(f"API request error: {e}")
            return {}

    # ─── FIXTURES ─────────────────────────────────────────────────────────────
    async def get_fixtures(self, league_id: int, season: int = 2024) -> list:
        """
        Aduce meciurile viitoare (next=20) cu cache 6 ore.
        Un singur request per ligă la fiecare 6 ore.
        """
        cache_key = f"fixtures_{league_id}_{season}"
        cached = _cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache HIT fixtures liga {league_id}")
            return cached

        if not API_FOOTBALL_KEY:
            return []

        data = await self._api_get("fixtures", {
            "league": league_id,
            "season": season,
            "next": 20,
            "timezone": "Europe/Bucharest",
        })

        fixtures = []
        for f in data.get("response", []):
            fix   = f.get("fixture", {})
            teams = f.get("teams", {})
            raw   = fix.get("date", "")
            fixtures.append({
                "id":      fix.get("id"),
                "home":    teams.get("home", {}).get("name", ""),
                "away":    teams.get("away", {}).get("name", ""),
                "home_id": teams.get("home", {}).get("id"),
                "away_id": teams.get("away", {}).get("id"),
                "date":    raw[:10] if raw else "",
                "time":    raw[11:16] if len(raw) >= 16 else "",
                "status":  fix.get("status", {}).get("short", "NS"),
            })

        if fixtures:
            _cache.set(cache_key, fixtures, TTL_FIXTURES)
            logger.info(f"Cache SET fixtures liga {league_id}: {len(fixtures)} meciuri (6h)")
        return fixtures

    # ─── STATISTICI ECHIPĂ ─────────────────────────────────────────────────────
    async def get_team_stats_live(self, team_id: int, league_id: int, season: int = 2024) -> dict:
        """Statistici sezon cu cache 12 ore."""
        if not team_id or not API_FOOTBALL_KEY:
            return {}

        cache_key = f"stats_{team_id}_{league_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = await self._api_get("teams/statistics", {
            "team": team_id,
            "league": league_id,
            "season": season,
        })

        r = data.get("response", {})
        if not r:
            return {}

        goals_for = r.get("goals", {}).get("for", {})
        goals_ag  = r.get("goals", {}).get("against", {})
        form_str  = (r.get("form") or "WDLWD")[-5:]
        avg_for   = float(goals_for.get("average", {}).get("total") or 1.4)
        avg_ag    = float(goals_ag.get("average", {}).get("total") or 1.2)

        xg_for  = [round(avg_for * v, 2) for v in [1.0, 0.9, 1.1, 0.95, 1.05]]
        xg_ag   = [round(avg_ag  * v, 2) for v in [1.0, 0.9, 1.1, 0.95, 1.05]]
        form    = [c for c in form_str if c in ("W","D","L")]

        result = {
            "last_5":             form[:5] or ["W","D","L","W","D"],
            "xg_for_history":     xg_for,
            "xg_against_history": xg_ag,
            "goals_avg":          avg_for,
            "goals_against_avg":  avg_ag,
            "h2h_home_wins": 2, "h2h_draws": 2, "h2h_away_wins": 2,
        }
        _cache.set(cache_key, result, TTL_TEAM_STATS)
        logger.info(f"Cache SET stats echipa {team_id} (12h)")
        return result

    # ─── ULTIMELE 5 MECIURI ────────────────────────────────────────────────────
    async def get_last_fixtures(self, team_id: int, league_id: int = None, season: int = 2024) -> list:
        """Ultimele 5 meciuri cu cache 3 ore."""
        if not team_id or not API_FOOTBALL_KEY:
            return []

        cache_key = f"last5_{team_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = await self._api_get("fixtures", {
            "team": team_id,
            "last": 5,
        })

        matches = []
        for f in data.get("response", []):
            teams = f.get("teams", {})
            goals = f.get("goals", {})
            is_home = teams.get("home", {}).get("id") == team_id
            gf = goals.get("home") if is_home else goals.get("away")
            ga = goals.get("away") if is_home else goals.get("home")
            if gf is None or ga is None:
                continue
            result = "W" if gf > ga else "D" if gf == ga else "L"
            matches.append({
                "result": result,
                "goals_for": int(gf),
                "goals_against": int(ga),
                "is_home": is_home,
            })

        if matches:
            _cache.set(cache_key, matches, TTL_LAST_5)
            logger.info(f"Cache SET last5 echipa {team_id} (3h)")
        return matches

    # ─── MAIN GETTER ──────────────────────────────────────────────────────────
    async def get_team_data(self, team_name: str, team_id: int = None, league_id: int = 39) -> dict:
        """
        Agregă date reale + fallback demo.
        Prioritate: API live > DEMO_TEAM_DATA > DEFAULT
        """
        # Baza: demo sau default
        data = dict(DEMO_TEAM_DATA.get(team_name, DEFAULT_TEAM_DATA))
        data["_source"] = "demo"

        if API_FOOTBALL_KEY and team_id:
            try:
                # 1. Statistici sezon (1 request, cache 12h)
                stats = await self.get_team_stats_live(team_id, league_id, 2024)
                if stats:
                    data.update(stats)
                    data["_source"] = "api_stats"

                # 2. Ultimele 5 meciuri (1 request, cache 3h)
                last5 = await self.get_last_fixtures(team_id, league_id, 2024)
                if len(last5) >= 3:
                    data["last_5"]             = [m["result"] for m in last5[:5]]
                    data["xg_for_history"]     = [round(m["goals_for"]     * 1.05, 2) for m in last5[:5]]
                    data["xg_against_history"] = [round(m["goals_against"] * 1.05, 2) for m in last5[:5]]
                    data["goals_avg"]          = round(sum(m["goals_for"] for m in last5) / len(last5), 2)
                    data["_source"]            = "api_full"

                logger.info(f"✅ {team_name}: sursa={data['_source']}")

            except Exception as e:
                logger.warning(f"API failed pentru {team_name}: {e} — folosesc demo")

        return data

    async def get_team_stats(self, team_id: int, league_id: int, season: int) -> dict:
        return await self.get_team_stats_live(team_id, league_id, season)

    def cache_stats(self) -> dict:
        """Statistici cache pentru monitoring."""
        return {
            "request_count": self._request_count,
            "cache": _cache.stats(),
        }

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
