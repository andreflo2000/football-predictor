# Football Predictor — CLAUDE.md

## Stack & Deploy
- **Backend**: FastAPI → Render (`https://football-predictor-api-n9sl.onrender.com`)
- **Frontend**: Next.js 14 → Vercel (`https://flopiforecastro.vercel.app`)
- **DB**: Supabase PostgreSQL (tabele: `users`, `predictions`, `daily_picks`)
- **Cache**: Upstash Redis REST API cu fallback in-memory (`cache.py`)
- **Model**: XGBoost 84 features (`xgb-v2`) — 3-layer cache: Redis → Supabase → live compute

## Structura backend (`/backend`)
```
main.py          # FastAPI app, toate endpoint-urile
predictor.py     # predict_match(), get_known_teams(), 84 features XGBoost+Elo+Poisson
ingestion.py     # compute_and_store_picks(), load_picks_from_db() — pre-calcul picks
fixtures.py      # get_today_fixtures(), get_today_odds() — API-Football
monte_carlo.py   # simulari Monte Carlo pentru score prediction
train.py         # antrenare model XGBoost
auth.py          # JWT register/login/me/delete GDPR
db.py            # get_client() → Supabase client
cache.py         # Redis REST cache cu fallback in-memory
notifications.py # Telegram bot + Resend email digest
models/          # betting.py, predictor.py, trainer.py, weekly.py
data/            # fetcher.py, leagues.py, scrape_fbref.py
```

## Structura frontend (`/frontend/src`)
```
app/daily/       # Picks zilnice — pagina principala
app/upgrade/     # Pricing Analyst 29 RON / Pro 79 RON (Gumroad)
app/login/       # Register/login toggle + delete GDPR
app/track-record/ # Statistici acuratete live
app/weekly/      # Picks saptamanale
app/terms/       # T&C ONJN-safe
app/privacy/     # GDPR Art.17
components/      # PredictionCard, PickSkeleton, DisclaimerBanner, GdprConsent,
                 # Onboarding (4 pasi), ModelBreakdown, Navbar, Logo
lib/api.ts       # toate fetch-urile catre backend
lib/auth.ts      # JWT token management
```

## Reguli critice

### Nu face fara sa intrebi
- Nu crea fisiere noi (editeaza existente)
- Nu schimba MODEL_VERSION din `ingestion.py` fara confirmare (invalideaza tot cache-ul)
- Nu push/deploy fara confirmare explicita

### Workflow pentru features noi
1. Citeste fisierele relevante inainte sa propui modificari
2. Implementeaza exact ce s-a cerut — fara features bonus, fara refactoring neinvitat
3. Nu adauga docstrings/comments/type hints la cod neatins
4. Nu adauga error handling pentru scenarii imposibile

### Prompturi de viziune
Cand primesc un prompt mare cu mai multe obiective:
1. Analizez complet ce e deja implementat vs. ce lipseste
2. Propun impartirea in etape (reconstructie = schimbari mari / optimizare = incrementale)
3. Astept confirmarea inainte sa incep o etapa

## Variabile de mediu (Render)
```
SUPABASE_URL, SUPABASE_KEY
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
API_FOOTBALL_KEY
JWT_SECRET
TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
RESEND_API_KEY
SENTRY_DSN
FRONTEND_URL
# Gumroad (de adaugat):
GUMROAD_ACCESS_TOKEN, GUMROAD_PRODUCT_ID_ANALYST, GUMROAD_PRODUCT_ID_PRO, GUMROAD_WEBHOOK_SECRET
```

## Comenzi utile
```bash
# Backend local
cd backend && uvicorn main:app --reload --port 8000

# Frontend local
cd frontend && npm run dev

# Antrenare model
cd backend && python train.py

# Android build (Capacitor)
cd frontend && npm run build && npx cap sync android
```

## Context business
- Proiect: **Flopi San** — predictii fotbal bazate pe quant analysis / BI (nu sfat de pariere)
- Utilizator: persoana fizica, fara SRL activ momentan → **Gumroad** (nu Stripe)
- SRL se activeaza dupa tractiune → migrare la Stripe
- Fara licenta ONJN → disclaimere obligatorii pe toate paginile

## Stare features (Aprilie 2026)
- [x] Auth JWT + rate limiting + GDPR
- [x] XGBoost model 84 features + Elo + Poisson
- [x] 3-layer cache + APScheduler 07:00/13:00 Bucharest
- [x] Telegram + Email notifications
- [x] VIP blur overlay (cod gata, asteapta LS)
- [x] Google Analytics 4 + Sentry
- [x] Android Capacitor (build ready)
- [ ] Gumroad conectat (env vars de adaugat pe Render)
- [ ] Track record auto-update WIN/LOSS
- [ ] SEO pages /predictii/premier-league etc.

## SQL Supabase nerutat inca
```sql
ALTER TABLE daily_picks ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'xgb-v1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_sub_id TEXT;
```
