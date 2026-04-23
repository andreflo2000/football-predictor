"""
Notificari zilnice: Email (Resend) + Telegram Bot.
Apelate dupa compute_and_store_picks() din ingestion.py.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

RESEND_API_KEY       = os.getenv("RESEND_API_KEY", "")
TELEGRAM_BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID  = os.getenv("TELEGRAM_CHANNEL_ID", "")  # ex: "@FlopiSanOfficial"
FROM_EMAIL           = "picks@oxiano.com"


# ─── Helpers ────────────────────────────────────────────────────────────────

def _bar(pct: float, width: int = 8) -> str:
    filled = round(pct / 100 * width)
    return '█' * filled + '░' * (width - filled)

def _kelly(conf: float, edge: float, has_odds: bool) -> float:
    p = conf / 100
    if has_odds and edge and edge > 0:
        p_market = max(0.05, p - edge / 100)
        odds = 1 / p_market
    else:
        odds = (1 / p) * 0.92
    b = odds - 1
    k = (b * p - (1 - p)) / b
    return round(max(0, min(0.10, k)) * 100, 1)

def _pred_label(p: dict) -> tuple[str, str]:
    """Returneaza (1/X/2, descriere)."""
    pred = p.get('prediction', 'H')
    if pred == 'H':   return '1', p['home']
    if pred == 'D':   return 'X', 'Egal'
    return '2', p['away']

def _pick_odd(p: dict) -> float:
    """Returneaza cota de piata pentru directia prezisa, sau cota implicita din confidence."""
    pred = p.get('prediction', 'H')
    if p.get('has_odds'):
        if pred == 'H' and p.get('odds_home'): return float(p['odds_home'])
        if pred == 'D' and p.get('odds_draw'): return float(p['odds_draw'])
        if pred == 'A' and p.get('odds_away'): return float(p['odds_away'])
    # Cota implicita din confidence cu marja 8%
    conf = max(0.40, p.get('confidence', 50) / 100)
    return round(1 / conf * 1.08, 2)

def build_daily_combo(picks: list, min_combined_odds: float = 1.80) -> list | None:
    """
    Construieste cel mai bun combo de 2-3 picks cu confidence >=70%
    si cota combinata >= min_combined_odds.
    Returneaza lista de picks selectati sau None daca nu se poate.
    """
    high = [p for p in picks if p.get('confidence', 0) >= 70]
    if len(high) < 2:
        return None

    # Sorteaza descrescator dupa confidence
    high = sorted(high, key=lambda x: x.get('confidence', 0), reverse=True)

    # Incearca combo de 2
    from itertools import combinations
    for combo in combinations(high[:6], 2):
        combined = 1.0
        for p in combo:
            combined *= _pick_odd(p)
        if combined >= min_combined_odds:
            return list(combo)

    # Incearca combo de 3
    for combo in combinations(high[:6], 3):
        combined = 1.0
        for p in combo:
            combined *= _pick_odd(p)
        if combined >= min_combined_odds:
            return list(combo)

    return None


def send_combo_telegram(picks: list, date_str: str) -> bool:
    """
    Trimite un mesaj COMBO ZI pe Telegram cu 2-3 picks selectate.
    Daca nu se poate construi un combo cu cota >=2.0, nu trimite nimic.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False

    combo = build_daily_combo(picks, min_combined_odds=1.80)
    if not combo:
        logger.info("[telegram] Niciun combo valid gasit pentru %s — nu se trimite mesaj", date_str)
        return False

    combined_odds = round(sum(_pick_odd(p) for p in combo) if False else
                          __import__('functools').reduce(lambda a, b: a * b, [_pick_odd(p) for p in combo]), 2)

    lines = [
        f"╔══════════════════════════╗",
        f"║  🎯 <b>OXIANO COMBO ZI</b>         ║",
        f"╚══════════════════════════╝",
        f"",
        f"📅 <b>{date_str}</b>  ·  Selecție automată model",
        f"<code>{'─' * 32}</code>",
        f"",
        f"🔗 <b>COMBO {len(combo)} PICKS</b>  <code>[cotă combinată ≈ {combined_odds:.2f}]</code>",
    ]

    for i, p in enumerate(combo, 1):
        num, label = _pred_label(p)
        conf = p['confidence']
        odd = _pick_odd(p)
        vbet = ' 💎' if p.get('value_bet') else ''
        lines.append(
            f"\n<b>{i}.</b> {p.get('flag','⚽')} <b>{p['home']} — {p['away']}</b>\n"
            f"<code>   {p['league']:<22} {p.get('time','—'):>5}</code>\n"
            f"<code>   Predicție : {num} · {label:<14}</code>{vbet}\n"
            f"<code>   Confidence: {_bar(conf, 8)} {conf:.1f}%  cotă ~{odd:.2f}</code>"
        )

    lines.append(
        f"\n<code>{'─' * 32}</code>\n"
        f"<b>Cotă combinată estimată: ~{combined_odds:.2f}</b>\n"
        f"<i>Analiză statistică. Nu sfat de pariere.</i>\n"
        f"🌐 <a href=\"https://oxiano.com/daily\">oxiano.com/daily</a>"
    )

    text = "\n".join(lines)
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHANNEL_ID, "text": text,
                  "parse_mode": "HTML", "disable_web_page_preview": True},
            timeout=10,
        )
        if r.status_code == 200:
            logger.info("[telegram] Combo trimis: %d picks, cotă %.2f", len(combo), combined_odds)
            return True
        logger.error("[telegram] Combo error %d: %s", r.status_code, r.text[:200])
        return False
    except Exception as e:
        logger.error("[telegram] Combo exception: %s", e)
        return False


# ─── Telegram ───────────────────────────────────────────────────────────────

def send_telegram(picks: list, date_str: str) -> bool:
    """Trimite picks pe canalul Telegram (HTML parse mode)."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        logger.warning("[telegram] BOT_TOKEN sau CHANNEL_ID lipsesc")
        return False

    # Daca nu sunt picks cu confidence suficient, trimite mesaj explicit
    high = [p for p in picks if p.get('confidence', 0) >= 65]
    med  = [p for p in picks if 55 <= p.get('confidence', 0) < 65]
    shown_high = high[:4]
    shown_med  = med[:2] if len(shown_high) < 3 else med[:1]
    shown = shown_high + shown_med
    if not shown:
        if not picks:
            shown = picks[:3]

    if not shown:
        no_picks_text = (
            f"╔══════════════════════════╗\n"
            f"║  🔬 <b>OXIANO DAILY ANALYSIS</b>   ║\n"
            f"╚══════════════════════════╝\n"
            f"\n"
            f"📅 <b>{date_str}</b>\n"
            f"<code>{'─' * 32}</code>\n"
            f"\n"
            f"⏸ <b>Fara selectii astazi</b>\n"
            f"\n"
            f"<i>Modelul nu a identificat niciun meci cu certitudine &gt;50% in competitiile monitorizate."
            f" Revenim maine.</i>\n"
            f"\n"
            f"<code>{'─' * 32}</code>\n"
            f"<i>Statistical analysis only. Not betting advice.</i>\n"
            f"🌐 <a href=\"https://oxiano.com/daily\">oxiano.com/daily</a>"
        )
        try:
            r = requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id":                  TELEGRAM_CHANNEL_ID,
                    "text":                     no_picks_text,
                    "parse_mode":               "HTML",
                    "disable_web_page_preview": True,
                },
                timeout=10,
            )
            if r.status_code == 200:
                logger.info("[telegram] Trimis mesaj 'fara selectii' pentru %s", date_str)
                return True
            logger.error("[telegram] Error %d: %s", r.status_code, r.text[:300])
            return False
        except Exception as e:
            logger.error("[telegram] Exception: %s", e)
            return False

    total_high = len(high)
    total_med  = len(med)

    # ── HEADER ──────────────────────────────────────────────────
    lines = [
        f"╔══════════════════════════╗",
        f"║  🔬 <b>OXIANO DAILY ANALYSIS</b>   ║",
        f"╚══════════════════════════╝",
        f"",
        f"📅 <b>{date_str}</b>  ·  XGBoost + Elo + Market Edge",
        f"<code>{'─' * 32}</code>",
    ]

    # ── HIGH CONFIDENCE ─────────────────────────────────────────
    if shown_high:
        lines.append(f"\n🟢 <b>HIGH CONFIDENCE</b>  <code>[{total_high} picks ≥65%]</code>")
        for p in shown_high:
            num, label = _pred_label(p)
            kelly = _kelly(p['confidence'], p.get('edge', 0), p.get('has_odds', False))
            edge  = p.get('edge', 0)
            conf  = p['confidence']
            vbet  = ' <b>💎 VALUE</b>' if p.get('value_bet') else ''
            lines.append(
                f"\n{p.get('flag','⚽')} <b>{p['home']} — {p['away']}</b>\n"
                f"<code>  {p['league']:<22} {p.get('time','—'):>5}</code>\n"
                f"<code>  Prediction : {num} · {label:<16}</code>{vbet}\n"
                f"<code>  Confidence : {_bar(conf, 10)} {conf:.1f}%</code>"
                + (f"\n<code>  Kelly      : {kelly}% stake</code>" if kelly > 0 else "")
                + (f"\n<code>  Market edge: +{edge:.1f}%</code>" if edge > 0 else "")
            )

    # ── MEDIUM CONFIDENCE ───────────────────────────────────────
    if shown_med:
        lines.append(f"\n🟡 <b>MEDIUM CONFIDENCE</b>  <code>[{total_med} picks 55–65%]</code>")
        for p in shown_med:
            num, label = _pred_label(p)
            conf = p['confidence']
            lines.append(
                f"\n{p.get('flag','⚽')} <b>{p['home']} — {p['away']}</b>\n"
                f"<code>  {p['league']:<22} {p.get('time','—'):>5}</code>\n"
                f"<code>  {num} · {label:<18} {conf:.1f}%</code>"
            )

    # ── FOOTER ──────────────────────────────────────────────────
    lines.append(
        f"\n<code>{'─' * 32}</code>\n"
        f"<i>Statistical analysis only. Not betting advice.</i>\n"
        f"🌐 <a href=\"https://oxiano.com/daily\">oxiano.com/daily</a>"
    )

    text = "\n".join(lines)

    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id":                  TELEGRAM_CHANNEL_ID,
                "text":                     text,
                "parse_mode":               "HTML",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
        if r.status_code == 200:
            logger.info("[telegram] Trimis %d picks", len(shown))
            return True
        logger.error("[telegram] Error %d: %s", r.status_code, r.text[:300])
        return False
    except Exception as e:
        logger.error("[telegram] Exception: %s", e)
        return False


# ─── Email ──────────────────────────────────────────────────────────────────

def send_email_digest(picks: list, date_str: str, subscribers: list[str]) -> int:
    """Trimite email digest catre lista de subscribers. Returneaza nr de emailuri trimise."""
    if not RESEND_API_KEY:
        logger.warning("[email] RESEND_API_KEY lipseste")
        return 0
    if not subscribers:
        return 0

    high = [p for p in picks if p["confidence"] >= 65]
    shown = high[:5] if high else picks[:3]

    rows_html = ""
    for p in shown:
        pred_short = '1' if p['prediction'] == 'H' else ('X' if p['prediction'] == 'D' else '2')
        pred_full  = p['home'] if p['prediction'] == 'H' else ('Egal' if p['prediction'] == 'D' else p['away'])
        conf_color = '#22c55e' if p['confidence'] >= 65 else '#f59e0b'
        rows_html += f"""
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:12px 8px;color:#f1f5f9;font-weight:600">{p['flag']} {p['home']} vs {p['away']}</td>
          <td style="padding:12px 8px;color:#94a3b8;font-size:12px">{p['league']}</td>
          <td style="padding:12px 8px;font-weight:700;color:{conf_color}">{pred_short} — {pred_full}</td>
          <td style="padding:12px 8px;font-weight:700;color:{conf_color};text-align:right">{p['confidence']}%</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#0f172a;font-family:monospace;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#f1f5f9;font-size:22px;letter-spacing:0.1em;margin:0">⚽ OXIANO</h1>
      <p style="color:#3b82f6;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.2em">Selecțiile zilei · {date_str}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#0f172a">
          <th style="padding:10px 8px;color:#475569;font-size:10px;text-align:left;text-transform:uppercase">Meci</th>
          <th style="padding:10px 8px;color:#475569;font-size:10px;text-align:left;text-transform:uppercase">Ligă</th>
          <th style="padding:10px 8px;color:#475569;font-size:10px;text-align:left;text-transform:uppercase">Predicție</th>
          <th style="padding:10px 8px;color:#475569;font-size:10px;text-align:right;text-transform:uppercase">Conf</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>

    <div style="margin-top:20px;padding:12px;background:#1e293b;border-radius:8px;border-left:3px solid #ef4444">
      <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6">
        ⚠️ <strong style="color:#f1f5f9">Disclaimer:</strong> Oxiano oferă analiză statistică cu scop educațional.
        Nu reprezintă sfat de pariere sau recomandare financiară.
      </p>
    </div>

    <div style="text-align:center;margin-top:20px">
      <a href="https://oxiano.com/daily"
        style="background:#3b82f6;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700">
        Vezi toate pick-urile →
      </a>
    </div>

    <p style="text-align:center;color:#334155;font-size:10px;margin-top:20px">
      Oxiano · oxiano.com<br>
      <a href="https://oxiano.com/privacy" style="color:#475569">Dezabonare / Confidențialitate</a>
    </p>
  </div>
</body></html>"""

    sent = 0
    try:
        import resend
        resend.api_key = RESEND_API_KEY

        # Trimite batch (max 50 per request pe free tier)
        for email in subscribers[:50]:
            try:
                resend.Emails.send({
                    "from":    f"Oxiano <{FROM_EMAIL}>",
                    "to":      [email],
                    "subject": f"⚽ Pick-urile zilei {date_str} — {len(shown)} selecții HIGH conf",
                    "html":    html,
                })
                sent += 1
            except Exception as e:
                logger.error("[email] Failed for %s: %s", email, e)
    except Exception as e:
        logger.error("[email] Resend init failed: %s", e)

    logger.info("[email] Trimis %d emailuri pentru %s", sent, date_str)
    return sent


def get_subscribers() -> list[str]:
    """Returneaza emailurile userilor care au dat consimtamant explicit GDPR pentru notificari."""
    from db import get_client
    client = get_client()
    if client is None:
        return []
    try:
        rows = (
            client.table("users")
            .select("email")
            .eq("notifications_consent", True)
            .execute()
        )
        return [r["email"] for r in rows.data if r.get("email")]
    except Exception:
        return []
