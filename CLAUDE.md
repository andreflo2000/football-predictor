# Oxiano / Football Predictor — Context pentru Claude

## Stack
- Backend: FastAPI (Python) — `backend/`
- Frontend: Next.js 14 + TypeScript — `frontend/`
- DB: Supabase (`njjxnkbqfpkqxzyzctlm`)
- Plăți: Gumroad (florianparv.gumroad.com)

## Supabase
- URL: https://njjxnkbqfpkqxzyzctlm.supabase.co
- Credențiale: în `backend/.env`
- Tabele: users, predictions, tracked_matches, daily_picks, pick_results
- RLS: activat pe toate ✓, trigger auto-RLS activat ✓
- Coloana `role` în users: free / analyst / pro / owner
- Coloana `is_vip` în daily_picks: BOOLEAN

## Roluri
- **owner**: florianparvu@yahoo.com — acces total
- **pro** (99 RON/lună): picks VIP + toate funcțiile
- **analyst** (39 RON/lună): predicții + statistici + track record
- **free**: acces limitat

## Gumroad Webhook
- Endpoint: POST `/webhook/gumroad`
- Pro permalink: `lnjfx`
- Analyst permalink: `xzbxnc`
- ⚠️ Backend NU e deploiat pe Render încă

## Viziunea modelului (oxiano.com/manual)
XGBoost calibrat pe 225.000 meciuri. 8 indicatori per pick:
1. Confidence % (≥65% HIGH, 55-64% MEDIUM)
2. Edge % vs Pinnacle closing odds (≥5% = value bet)
3. Kelly % fracțional (max 10% bankroll)
4. Value Bet 💎 (confidence ≥65% + edge ≥5%, frecvență 0.3-0.8/zi)
5. Elo rating (1700+=elită)
6. H2H ultimele 6 meciuri
7. xG din date istorice
8. Formă recentă W5/W10 home/away + streak

## De făcut (în ordine)
1. Deploy backend pe Render → URL real în Gumroad webhook
2. Integrare cote Pinnacle pentru Edge %
3. Antrenament XGBoost pe 225k meciuri reale (CSV-uri în proiect)
4. Kelly % + Value Bet signal în API
