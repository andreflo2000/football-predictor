# 🏆 FootPredict — AI Football Predictions

> Predicții fotbal bazate pe **xG**, **Elo Ratings** și **XGBoost**  
> Backend: FastAPI · Frontend: Next.js 14 · Model: XGBoost + Poisson Dixon-Coles

---

## Arhitectură

```
football-predictor/
├── backend/              # FastAPI Python
│   ├── main.py           # Entry point API
│   ├── models/
│   │   └── predictor.py  # EloEngine, PoissonModel, XGBoostPredictor, FootballPredictor
│   ├── data/
│   │   ├── fetcher.py    # API-Football + football-data.org + FBref scraper
│   │   └── leagues.py    # Lista 100 ligi cu ID-uri
│   └── requirements.txt
├── frontend/             # Next.js 14 + TypeScript
│   ├── src/
│   │   ├── app/          # App Router
│   │   ├── components/   # ProbabilityChart, ScoreGrid, TeamStatsPanel, ModelBreakdown
│   │   └── lib/api.ts    # API client
│   └── package.json
└── colab/
    └── Football_Predictor_Colab.ipynb  # Test complet în Google Colab
```

---

## 🚀 Setup Rapid (Local)

### 1. Backend FastAPI

```bash
cd backend

# Instalare dependențe
pip install fastapi uvicorn xgboost pandas numpy scipy requests aiohttp \
    beautifulsoup4 lxml python-dotenv httpx

# Configurare API keys (opțional - funcționează și fără cu date demo)
cp .env.example .env
# Editați .env cu cheile voastre

# Pornire server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test: http://localhost:8000/docs  ← Swagger UI automat
```

### 2. Frontend Next.js

```bash
cd frontend

# Instalare dependențe
npm install next react react-dom chart.js react-chartjs-2 axios framer-motion

# Configurare
cp .env.local.example .env.local

# Development
npm run dev
# → http://localhost:3000
```

---

## 🧪 Test în Google Colab

```
1. Deschideți colab/Football_Predictor_Colab.ipynb în Google Colab
2. Rulați celulele în ordine
3. Celula 4: Test predicție Man City vs Arsenal (fără API keys)
4. Celula 5: Pornire FastAPI cu ngrok tunnel public URL
5. Celula 6-7: Vizualizări Matplotlib
```

**Nu necesită API keys pentru modul demo!**

---

## 🔑 API Keys (Gratuite)

### API-Football (100 req/zi gratis)
1. Înregistrare: https://dashboard.api-football.com/
2. Plan Free: 100 request/zi, toate endpoint-urile
3. Setați `API_FOOTBALL_KEY=xxx` în `backend/.env`

### football-data.org (10 req/min gratis)
1. Înregistrare: https://www.football-data.org/client/register
2. Acces: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie și altele
3. Setați `FOOTBALL_DATA_KEY=xxx` în `backend/.env`

### FBref xG (scraping, fără key)
- Scraping automat, respectă rate limiting (0.5s între requests)
- Funcționează pentru echipe cu ID FBref definit în `fetcher.py`
- Adăugați IDs pentru mai multe echipe în dicționarul `fbref_ids`

---

## 📊 Modelul de Predicție

### 1. Elo Rating System
- Rating inițial: 1500
- Home advantage: +100 puncte
- K-factor: 32 (actualizat după fiecare meci)
- Probabilitate draw estimată prin formula empirică: `0.26 * exp(-Δelo/600)`

### 2. Poisson Dixon-Coles
- Model bidirecțional: λ (goluri gazdă), μ (goluri oaspete)
- Corecție Dixon-Coles pentru scoruri mici (ρ = -0.13)
- λ = (xG_for_home + xG_against_away) / 2 × 1.15 (home boost)
- μ = (xG_for_away + xG_against_home) / 2 × 0.90 (away penalty)

### 3. XGBoost Classifier (14 features)
```
home_elo, away_elo, elo_diff,
home_xg_for, home_xg_against,
away_xg_for, away_xg_against,
home_form, away_form,
home_goals_avg, away_goals_avg,
h2h_home_wins, h2h_draws, h2h_away_wins
```
- n_estimators: 200, max_depth: 6, learning_rate: 0.1
- Antrenat pe date sintetice (în producție: date reale din football-data.org)

### 4. Ensemble Final
```
Predicție = XGBoost×40% + Poisson×40% + Elo×20%
```

---

## ☁️ Deployment Producție

### Backend → Render (Gratuit)

1. Push cod pe GitHub
2. https://render.com → "New Web Service"
3. Setări:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.11
4. Adăugați Environment Variables:
   - `API_FOOTBALL_KEY`
   - `FOOTBALL_DATA_KEY`
5. URL generat: `https://your-app.onrender.com`

> ⚠️ Planul gratuit Render se oprește după 15min inactivitate (cold start ~30s)

### Frontend → Vercel (Gratuit)

1. Push cod `frontend/` pe GitHub
2. https://vercel.com → "Import Project"
3. Framework: Next.js (auto-detectat)
4. Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://your-app.onrender.com`
5. Deploy automat la fiecare push

```bash
# Alternativ CLI:
npm install -g vercel
cd frontend
vercel --prod
```

### Variante alternative gratuite:
- **Railway**: https://railway.app (similar Render, 5$/lună credit gratuit)
- **Fly.io**: https://fly.io (512MB RAM gratuit)
- **Koyeb**: https://koyeb.com (plan gratuit cu sleep)

---

## 📁 Integrare fișier ligi (din Word)

După ce urcați fișierul cu 100 ligi, actualizați `backend/data/leagues.py`:

```python
# Adăugați/modificați entries în LEAGUES_LIST
{"rank": 1, "id": 39, "name": "Premier League", "country": "England", 
 "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "confederation": "UEFA", "fd_code": "PL"},
```

Sau folosiți scriptul de import:

```python
# import_leagues.py
import pandas as pd
# Citiți din Excel/CSV exportat din Word
df = pd.read_csv('ligi.csv')
for _, row in df.iterrows():
    print(f'{{"rank": {row.rank}, "id": TODO, "name": "{row.name}", ...}}')
```

---

## 🧩 Extindere Model

### Antrenament pe date reale
```python
# 1. Descărcați date istorice
from data.fetcher import DataFetcher
fetcher = DataFetcher()
matches = await fetcher.get_historical_matches('PL', 2023)

# 2. Construiți features
# 3. Antrenați XGBoost
from models.predictor import XGBoostPredictor
predictor = XGBoostPredictor()
predictor._train_on_real_data(matches)
```

### Adăugare features noi
Editați `XGBoostPredictor.feature_names` și `predict_proba()` în `models/predictor.py`.

---

## API Endpoints

| Endpoint | Metodă | Descriere |
|----------|--------|-----------|
| `/api/leagues` | GET | Lista 100 ligi |
| `/api/fixtures/{league_id}` | GET | Meciuri ligă |
| `/api/predict` | GET | Predicție meci |
| `/api/team-stats/{team_id}` | GET | Statistici echipă |
| `/api/health` | GET | Status API |
| `/docs` | GET | Swagger UI |

---

## ⚠️ Disclaimer

Aplicație cu scop **educațional și de cercetare**.  
Nu reprezintă sfaturi de pariuri. Jocurile de noroc pot crea dependență.
