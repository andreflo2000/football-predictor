"""
Hot-swap Data Ingestion — pre-calculeaza pick-urile zilei si le salveaza in Supabase.
Ruleaza la startup + la fiecare 6 ore via APScheduler.
"""
import logging
import datetime
import json

from db import get_client
import cache as redis_cache

logger = logging.getLogger(__name__)

MODEL_VERSION = "xgb-v2"  # bump: filtre TIMED/SCHEDULED + doar 10 ligi active


def compute_and_store_picks(date: str = None) -> dict:
    """
    Calculeaza pick-urile pentru `date` (default: azi) si le salveaza
    in tabelul daily_picks. Returneaza datele salvate.
    """
    # Import local ca sa evitam circular imports
    from predictor import predict_match, get_known_teams
    from fixtures import get_today_fixtures, get_today_odds

    target = date or datetime.date.today().isoformat()
    logger.info("[ingestion] Start pre-calcul picks pentru %s", target)

    known    = get_known_teams()
    fixtures = get_today_fixtures(date=target, known_teams=known)
    actual_date = fixtures[0].get("date", target) if fixtures else target
    odds_map = get_today_odds(known_teams=known)

    picks  = []
    errors = []

    for fix in fixtures:
        try:
            key  = (fix["home"].lower(), fix["away"].lower())
            odds = odds_map.get(key)
            result = predict_match(home_team=fix["home"], away_team=fix["away"], odds=odds)

            picks.append({
                "home":             fix["home"],
                "away":             fix["away"],
                "home_raw":         fix.get("home_raw", fix["home"]),
                "away_raw":         fix.get("away_raw", fix["away"]),
                "league":           fix["league"],
                "flag":             fix["flag"],
                "time":             fix.get("time", ""),
                "competition_code": fix.get("competition_code", ""),
                "home_win":         round(result["home_win"] * 100, 1),
                "draw":             round(result["draw"] * 100, 1),
                "away_win":         round(result["away_win"] * 100, 1),
                "prediction":       result["prediction"],
                "prediction_label": result["prediction_label"],
                "confidence":       round(result["confidence"] * 100, 1),
                "confidence_level": result["confidence_level"],
                "high_confidence":  result["high_confidence"],
                "home_elo":         result.get("home_elo", 1500),
                "away_elo":         result.get("away_elo", 1500),
                "home_form":        round(result.get("home_form", 0.4) * 100, 0),
                "away_form":        round(result.get("away_form", 0.4) * 100, 0),
                "has_odds":         odds is not None,
                "vip_only":         False,   # viitor: top picks = VIP
                "model_version":    MODEL_VERSION,
            })
        except Exception as e:
            errors.append({"match": f"{fix['home']} vs {fix['away']}", "error": str(e)})

    picks.sort(key=lambda x: x["confidence"], reverse=True)

    # Top 3 picks cu confidence >= 65% devin VIP-only (monetizare)
    vip_count = 0
    for p in picks:
        if p["confidence"] >= 65 and vip_count < 3:
            p["vip_only"] = True
            vip_count += 1

    high_conf = [p for p in picks if p["confidence"] >= 65]
    med_conf  = [p for p in picks if 55 <= p["confidence"] < 65]
    low_conf  = [p for p in picks if p["confidence"] < 55]

    # Banker = cel mai confident pick
    banker = picks[0] if high_conf else (picks[0] if picks else None)

    payload = {
        "date":           actual_date,
        "requested_date": target,
        "total_fixtures": len(fixtures),
        "total_picks":    len(picks),
        "high_conf":      len(high_conf),
        "med_conf":       len(med_conf),
        "low_conf":       len(low_conf),
        "picks":          picks,
        "banker":         banker,
        "errors":         errors[:5],
        "cached":         True,
        "model_version":  MODEL_VERSION,
        "computed_at":    datetime.datetime.utcnow().isoformat(),
    }

    # Salveaza in Supabase daily_picks (upsert pe pick_date)
    client = get_client()
    if client:
        try:
            client.table("daily_picks").upsert({
                "pick_date":     actual_date,
                "picks":         json.dumps(picks, default=str),
                "banker":        json.dumps(banker, default=str) if banker else None,
                "model_version": MODEL_VERSION,
            }, on_conflict="pick_date").execute()
            logger.info("[ingestion] Salvat %d picks in Supabase pentru %s", len(picks), actual_date)
        except Exception as e:
            logger.error("[ingestion] Supabase upsert failed: %s", e)

    # Invalideaza cache Redis ca sa serveasca datele noi
    redis_cache.delete("daily", f"{target}:0.5")
    redis_cache.delete("daily", f"{actual_date}:0.5")

    logger.info("[ingestion] Complet: %d picks pentru %s", len(picks), actual_date)

    # Trimite notificari (Telegram + Email) doar la rularea de dimineata
    hour = datetime.datetime.utcnow().hour
    if picks and 5 <= hour <= 9:
        try:
            from notifications import send_telegram, send_email_digest, get_subscribers
            date_fmt = datetime.datetime.strptime(actual_date, "%Y-%m-%d").strftime("%d.%m.%Y")
            send_telegram(picks, date_fmt)
            subs = get_subscribers()
            if subs:
                send_email_digest(picks, date_fmt, subs)
        except Exception as e:
            logger.warning("[ingestion] Notificari failed: %s", e)

    return payload


def load_picks_from_db(date: str) -> dict | None:
    """
    Citeste pick-urile pre-calculate din Supabase.
    Returneaza None daca nu exista.
    """
    client = get_client()
    if client is None:
        return None
    try:
        rows = client.table("daily_picks").select("*").eq("pick_date", date).execute()
        if not rows.data:
            return None
        row = rows.data[0]

        # Daca versiunea difera, sterge si forteaza recompute
        if row.get("model_version") != MODEL_VERSION:
            logger.info("[ingestion] Versiune veche (%s) — sterg si recomputez", row.get("model_version"))
            client.table("daily_picks").delete().eq("pick_date", date).execute()
            redis_cache.delete("daily", f"{date}:0.5")
            redis_cache.delete("daily", f"{date}:0.45")
            return None

        picks  = json.loads(row["picks"])  if isinstance(row["picks"],  str) else row["picks"]
        banker = json.loads(row["banker"]) if isinstance(row["banker"], str) else row["banker"]

        high_conf = [p for p in picks if p["confidence"] >= 65]
        med_conf  = [p for p in picks if 55 <= p["confidence"] < 65]
        low_conf  = [p for p in picks if p["confidence"] < 55]

        return {
            "date":           date,
            "requested_date": date,
            "total_fixtures": len(picks),
            "total_picks":    len(picks),
            "high_conf":      len(high_conf),
            "med_conf":       len(med_conf),
            "low_conf":       len(low_conf),
            "picks":          picks,
            "banker":         banker,
            "errors":         [],
            "cached":         True,
            "source":         "supabase",
        }
    except Exception as e:
        logger.error("[ingestion] load_picks_from_db failed: %s", e)
        return None
