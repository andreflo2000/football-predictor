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
                "home_venue_form":  round(result.get("home_venue_form", 0.4) * 100, 0),
                "away_venue_form":  round(result.get("away_venue_form", 0.4) * 100, 0),
                "btts_rate":        round(result.get("btts_rate", 0.5) * 100, 0),
                "over25_rate":      round(result.get("over25_rate", 0.5) * 100, 0),
                "has_odds":         odds is not None,
                "odds_home":        round(odds["AvgH"], 2) if odds and odds.get("AvgH") else None,
                "odds_draw":        round(odds["AvgD"], 2) if odds and odds.get("AvgD") else None,
                "odds_away":        round(odds["AvgA"], 2) if odds and odds.get("AvgA") else None,
                "vip_only":         False,
                "model_version":    MODEL_VERSION,
                # BI signals
                "edge":             result.get("edge", 0.0),
                "value_bet":        result.get("value_bet", False),
                "market_signal":    result.get("market_signal", "NO_ODDS"),
                "upset_risk":       result.get("upset_risk", False),
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


def auto_mark_results(date: str = None) -> dict:
    """
    Fetches rezultatele meciurilor FINISHED pentru `date` din football-data.org,
    le compara cu pick-urile salvate si marcheaza automat WIN/LOSS in pick_results.
    Ruleaza zilnic la 23:30 Bucharest via scheduler.
    Foloseste per-competition endpoint (TIER_ONE compatible).
    """
    import os, time, requests as req
    from predictor import get_known_teams
    from fixtures import _normalize_name, COMPETITIONS

    target = date or datetime.date.today().isoformat()
    logger.info("[results] Start auto-marcare rezultate pentru %s", target)

    api_key = os.getenv("FOOTBALL_DATA_KEY", "")
    if not api_key:
        logger.warning("[results] FOOTBALL_DATA_KEY nu e setat")
        return {"marked": 0, "error": "no api key"}

    known = get_known_teams()
    finished = []

    # Itereaza per competitie — /v4/matches general returneaza 0 pe TIER_ONE
    for code in COMPETITIONS:
        try:
            resp = req.get(
                f"https://api.football-data.org/v4/competitions/{code}/matches",
                headers={"X-Auth-Token": api_key},
                params={"dateFrom": target, "dateTo": target, "status": "FINISHED"},
                timeout=15,
            )
            if resp.status_code == 429:
                logger.warning("[results] Rate limit hit la %s - sleep 12s", code)
                time.sleep(12)
                resp = req.get(
                    f"https://api.football-data.org/v4/competitions/{code}/matches",
                    headers={"X-Auth-Token": api_key},
                    params={"dateFrom": target, "dateTo": target, "status": "FINISHED"},
                    timeout=15,
                )
            if resp.status_code != 200:
                logger.debug("[results] %s: HTTP %s", code, resp.status_code)
                time.sleep(0.3)
                continue
            for m in resp.json().get("matches", []):
                score = m.get("score", {}).get("fullTime", {})
                home_goals = score.get("home")
                away_goals = score.get("away")
                if home_goals is None or away_goals is None:
                    continue
                home_raw = m.get("homeTeam", {}).get("name", "")
                away_raw = m.get("awayTeam", {}).get("name", "")
                finished.append({
                    "home":       _normalize_name(home_raw, known),
                    "away":       _normalize_name(away_raw, known),
                    "home_goals": home_goals,
                    "away_goals": away_goals,
                })
            time.sleep(0.3)
        except Exception as e:
            logger.warning("[results] Fetch failed pentru %s: %s", code, e)
            continue

    logger.info("[results] Total meciuri FINISHED gasite: %d pentru %s", len(finished), target)

    if not finished:
        logger.info("[results] Niciun meci FINISHED gasit pentru %s", target)
        return {"marked": 0, "finished_found": 0}

    # Incarca pick-urile zilei din DB
    db_data = load_picks_from_db(target)
    if not db_data or not db_data.get("picks"):
        logger.info("[results] Nu exista picks in DB pentru %s", target)
        return {"marked": 0, "error": "no picks in db"}

    picks = db_data["picks"]

    # Construieste index rezultate: (home_lower, away_lower) -> (home_goals, away_goals)
    results_index = {
        (r["home"].lower(), r["away"].lower()): (r["home_goals"], r["away_goals"])
        for r in finished
    }

    client = get_client()
    if not client:
        return {"marked": 0, "error": "no db client"}

    marked = 0
    skipped = 0

    for pick in picks:
        key = (pick["home"].lower(), pick["away"].lower())
        if key not in results_index:
            skipped += 1
            continue

        home_goals, away_goals = results_index[key]
        prediction = pick.get("prediction")  # 'H', 'D', 'A'
        confidence = pick.get("confidence", 60) / 100

        # Determina rezultatul real
        if home_goals > away_goals:
            actual = "H"
        elif home_goals < away_goals:
            actual = "A"
        else:
            actual = "D"

        result = "win" if prediction == actual else "loss"

        try:
            client.table("pick_results").delete()\
                .eq("pick_date", target)\
                .eq("home", pick["home"])\
                .eq("away", pick["away"])\
                .execute()
            client.table("pick_results").insert({
                "pick_date":    target,
                "home":         pick["home"],
                "away":         pick["away"],
                "result":       result,
                "confidence":   confidence,
                "actual_score": f"{home_goals}-{away_goals}",
                "prediction":   pick.get("prediction"),
            }).execute()
            marked += 1
            logger.info("[results] %s vs %s: pred=%s actual=%s (%s-%s) -> %s",
                        pick["home"], pick["away"], prediction, actual,
                        home_goals, away_goals, result)
        except Exception as e:
            logger.error("[results] Insert failed pentru %s vs %s: %s", pick["home"], pick["away"], e)

    logger.info("[results] Complet: %d marcate, %d sarite pentru %s", marked, skipped, target)
    return {"marked": marked, "skipped": skipped, "finished_found": len(finished)}


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
            logger.info("[ingestion] Versiune veche (%s) - sterg si recomputez", row.get("model_version"))
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
