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

def _odd(prob: float) -> str:
    return f"{100 / max(prob, 1) * 1.08:.2f}"

def _bar(pct: float) -> str:
    filled = round(pct / 10)
    return '█' * filled + '░' * (10 - filled)

def _conf_emoji(conf: float) -> str:
    if conf >= 65: return '🟢'
    if conf >= 55: return '🟡'
    return '🔵'


# ─── Telegram ───────────────────────────────────────────────────────────────

def send_telegram(picks: list, date_str: str) -> bool:
    """Trimite picks pe canalul Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        logger.warning("[telegram] BOT_TOKEN sau CHANNEL_ID lipsesc")
        return False

    high = [p for p in picks if p["confidence"] >= 65]
    if not high:
        high = picks[:3]
    shown = high[:5]

    lines = [f"⚽ *OXIANO — Selecțiile zilei {date_str}*\n"]

    for p in shown:
        pred_short = '1' if p['prediction'] == 'H' else ('X' if p['prediction'] == 'D' else '2')
        pred_full  = p['home'] if p['prediction'] == 'H' else ('Egal' if p['prediction'] == 'D' else p['away'])
        conf_emoji = _conf_emoji(p['confidence'])
        lines.append(
            f"{p['flag']} *{p['home']}* vs *{p['away']}*\n"
            f"   {p['league']} · {p.get('time', '—')}\n"
            f"   ➤ {pred_short} — {pred_full}  |  ~{_odd(p['home_win'] if p['prediction']=='H' else p['away_win'] if p['prediction']=='A' else p['draw'])}\n"
            f"   {conf_emoji} Confidence: {p['confidence']}%\n"
        )

    lines.append("──────────────────")
    lines.append("⚠️ _Analiză statistică. Nu constituie sfat de pariere._")
    lines.append("🌐 oxiano.com")

    text = "\n".join(lines)

    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id":    TELEGRAM_CHANNEL_ID,
                "text":       text,
                "parse_mode": "MarkdownV2",
            },
            timeout=10,
        )
        if r.status_code == 200:
            logger.info("[telegram] Trimis %d picks", len(shown))
            return True
        logger.error("[telegram] Error %d: %s", r.status_code, r.text[:200])
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
    """Returneaza emailurile userilor care au acceptat notificari."""
    from db import get_client
    client = get_client()
    if client is None:
        return []
    try:
        rows = client.table("users").select("email").execute()
        return [r["email"] for r in rows.data if r.get("email")]
    except Exception:
        return []
