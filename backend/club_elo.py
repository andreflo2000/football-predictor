"""
Club-elo.com integration — Elo ratings externe, gratuite, actualizate saptamanal.
API: http://api.clubelo.com/DATE (CSV, fara API key)
Cache Redis 24h pentru a nu suprasolicita sursa.
"""
import csv
import io
import datetime
import logging

import requests

logger = logging.getLogger(__name__)

# Mapare nume Club-elo -> nume folosit in model
# Doar exceptiile — restul se potrivesc direct
CLUBELO_TO_MODEL: dict[str, str] = {
    "Bayern":         "Bayern Munich",
    "PSV":            "PSV Eindhoven",
    "Bilbao":         "Ath Bilbao",
    "Frankfurt":      "Ein Frankfurt",
    "Sociedad":       "Real Sociedad",
    "Atletico":       "Atletico Madrid",
    "Dortmund":       "Borussia Dortmund",
    "Leverkusen":     "Bayer Leverkusen",
    "Gladbach":       "Borussia Mgladbach",
    "Hertha":         "Hertha Berlin",
    "Schalke":        "Schalke 04",
    "Forest":         "Nottm Forest",
    "Wolves":         "Wolverhampton",
    "Palace":         "Crystal Palace",
    "West Ham":       "West Ham",
    "Man City":       "Manchester City",
    "Man United":     "Manchester United",
    "Tottenham":      "Tottenham",
    "Sporting":       "Sporting CP",
    "Braga":          "Sp Braga",
    "Betis":          "Real Betis",
    "Celta":          "Celta Vigo",
    "Osasuna":        "CA Osasuna",
    "Girona":         "Girona",
    "Vallecano":      "Rayo Vallecano",
    "Lens":           "RC Lens",
    "Strasbourg":     "RC Strasbourg",
    "St Etienne":     "Saint-Etienne",
    "Guimaraes":      "Vitoria Guimaraes",
}


def fetch_club_elo(redis_cache=None) -> dict[str, float]:
    """
    Descarca si returneaza Elo-urile de pe clubelo.com pentru ziua curenta.
    Returneaza dict: {team_name: elo_float}
    Foloseste Redis cache 24h daca e disponibil.
    """
    today = datetime.date.today().isoformat()
    cache_key = f"clubelo:{today}"

    # 1. Verifica Redis cache
    if redis_cache is not None:
        cached = redis_cache.get("clubelo", today)
        if cached is not None:
            logger.info("[club_elo] Din cache Redis (%s, %d echipe)", today, len(cached))
            return cached

    # 2. Fetch de la API
    try:
        resp = requests.get(
            f"http://api.clubelo.com/{today}",
            timeout=10,
            headers={"User-Agent": "Oxiano/1.0 (oxiano.com)"},
        )
        if resp.status_code != 200:
            logger.warning("[club_elo] API a returnat %d", resp.status_code)
            return {}

        reader = csv.DictReader(io.StringIO(resp.text))
        result: dict[str, float] = {}

        for row in reader:
            club_name = row.get("Club", "").strip()
            try:
                elo = float(row["Elo"])
            except (ValueError, KeyError):
                continue

            # Aplica maparea sau foloseste numele direct
            model_name = CLUBELO_TO_MODEL.get(club_name, club_name)
            result[model_name] = elo

        logger.info("[club_elo] Incarcat %d echipe de la clubelo.com", len(result))

        # 3. Salveaza in Redis 24h
        if redis_cache is not None and result:
            redis_cache.set("clubelo", today, result, ttl=86400)

        return result

    except Exception as e:
        logger.error("[club_elo] Eroare fetch: %s", e)
        return {}
