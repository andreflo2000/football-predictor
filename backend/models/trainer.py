"""
Model Trainer v2 — Antrenament XGBoost pe date REALE din football-data.org
Rulează automat la pornirea serverului dacă modelul nu există sau e vechi.
Acoperă 5 sezoane × 8 ligi = ~20.000 meciuri reale.
"""

import os
import json
import math
import asyncio
import aiohttp
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, log_loss
    XGB_OK = True
except ImportError:
    XGB_OK = False

FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "b7a245f650554efd8af759f4c571bd40")
FD_BASE = "https://api.football-data.org/v4"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "trained_model.json")
META_PATH  = os.path.join(os.path.dirname(__file__), "model_meta.json")

# 8 ligi disponibile gratuit × 5 sezoane = ~20.000 meciuri
COMPETITIONS = {
    "PL":  {"name": "Premier League",  "seasons": [2019,2020,2021,2022,2023,2024]},
    "PD":  {"name": "La Liga",         "seasons": [2019,2020,2021,2022,2023,2024]},
    "BL1": {"name": "Bundesliga",      "seasons": [2019,2020,2021,2022,2023,2024]},
    "SA":  {"name": "Serie A",         "seasons": [2019,2020,2021,2022,2023,2024]},
    "FL1": {"name": "Ligue 1",         "seasons": [2019,2020,2021,2022,2023,2024]},
    "DED": {"name": "Eredivisie",      "seasons": [2020,2021,2022,2023,2024]},
    "PPL": {"name": "Primeira Liga",   "seasons": [2020,2021,2022,2023,2024]},
    "BSA": {"name": "Brasileirao",     "seasons": [2020,2021,2022,2023]},
}

FEATURE_COLS = [
    "home_elo","away_elo","elo_diff","elo_draw_prob",
    "home_xg_for","away_xg_for","home_xg_against","away_xg_against",
    "home_form","away_form",
    "home_win_rate","away_win_rate","home_draw_rate","away_draw_rate",
    "home_goals_avg","away_goals_avg","home_conceded_avg","away_conceded_avg",
    "home_gd_avg","away_gd_avg",
    "home_clean_sheets","away_clean_sheets",
    "home_btts_rate","away_btts_rate",
    "home_over25_rate","away_over25_rate",
    "h2h_home_wins","h2h_draws","h2h_away_wins",
]


# ─── Elo Tracker ──────────────────────────────────────────────────────────────
class EloTracker:
    K = 30
    HOME_ADV = 85

    def __init__(self):
        self.ratings = {}

    def get(self, team):
        return self.ratings.get(team, 1500.0)

    def expected(self, ra, rb):
        return 1.0 / (1 + 10 ** ((rb - ra) / 400))

    def update(self, home, away, result):
        ra = self.get(home) + self.HOME_ADV
        rb = self.get(away)
        ea = self.expected(ra, rb)
        sa, sb = {"H":(1,0),"D":(0.5,0.5),"A":(0,1)}.get(result,(0.5,0.5))
        self.ratings[home] = self.get(home) + self.K*(sa-ea)
        self.ratings[away] = self.get(away) + self.K*(sb-(1-ea))

    def draw_prob(self, ra, rb):
        diff = abs(ra - rb)
        return max(0.15, min(0.35, 0.26 * math.exp(-diff/650)))


# ─── Feature Builder ──────────────────────────────────────────────────────────
class FeatureBuilder:
    WINDOW = 8

    def build(self, matches):
        matches = sorted(matches, key=lambda x: x["date"])
        elo = EloTracker()
        hist = {}
        h2h = {}
        rows = []

        for m in matches:
            home, away = m["home"], m["away"]
            hg, ag = m["home_goals"], m["away_goals"]

            # Elo
            he = elo.get(home)
            ae = elo.get(away)
            ed = (he + elo.HOME_ADV) - ae
            dp = elo.draw_prob(he + elo.HOME_ADV, ae)

            # Formă
            hh = hist.get(home, [])[-self.WINDOW:]
            ah = hist.get(away, [])[-self.WINDOW:]

            def form_score(h):
                if not h: return 0.5
                pts = [3 if r["res"]=="W" else 1 if r["res"]=="D" else 0 for r in h]
                ws  = [0.85**i for i in range(len(pts))]
                return sum(p*w for p,w in zip(pts,ws))/(3*sum(ws)) if ws else 0.5

            def avg(h, k, d=1.4):
                if not h: return d
                vs = [r[k] for r in h]
                ws = [0.85**i for i in range(len(vs))]
                return sum(v*w for v,w in zip(vs,ws))/sum(ws)

            def rate(h, cond):
                if not h: return 0.33
                return sum(1 for r in h if cond(r))/len(h)

            # H2H
            key = tuple(sorted([home,away]))
            hx = h2h.get(key,[])[-6:]
            h2h_hw = sum(1 for x in hx if x==home)
            h2h_d  = sum(1 for x in hx if x=="D")
            h2h_aw = sum(1 for x in hx if x==away)

            label = {"H":0,"D":1,"A":2}[m["result"]]
            rows.append({
                "home_elo": he, "away_elo": ae,
                "elo_diff": ed, "elo_draw_prob": dp,
                "home_xg_for": (avg(hh,"gf",1.4)+avg(ah,"gc",1.3))/2,
                "away_xg_for": (avg(ah,"gf",1.2)+avg(hh,"gc",1.4))/2,
                "home_xg_against": avg(hh,"gc",1.3),
                "away_xg_against": avg(ah,"gc",1.4),
                "home_form": form_score(hh),
                "away_form": form_score(ah),
                "home_win_rate":  rate(hh, lambda r: r["res"]=="W"),
                "away_win_rate":  rate(ah, lambda r: r["res"]=="W"),
                "home_draw_rate": rate(hh, lambda r: r["res"]=="D"),
                "away_draw_rate": rate(ah, lambda r: r["res"]=="D"),
                "home_goals_avg": avg(hh,"gf",1.4),
                "away_goals_avg": avg(ah,"gf",1.2),
                "home_conceded_avg": avg(hh,"gc",1.3),
                "away_conceded_avg": avg(ah,"gc",1.4),
                "home_gd_avg": avg(hh,"gf",1.4)-avg(hh,"gc",1.3),
                "away_gd_avg": avg(ah,"gf",1.2)-avg(ah,"gc",1.4),
                "home_clean_sheets": rate(hh, lambda r: r["gc"]==0),
                "away_clean_sheets": rate(ah, lambda r: r["gc"]==0),
                "home_btts_rate": rate(hh, lambda r: r["gf"]>0 and r["gc"]>0),
                "away_btts_rate": rate(ah, lambda r: r["gf"]>0 and r["gc"]>0),
                "home_over25_rate": rate(hh, lambda r: r["gf"]+r["gc"]>2),
                "away_over25_rate": rate(ah, lambda r: r["gf"]+r["gc"]>2),
                "h2h_home_wins": h2h_hw,
                "h2h_draws": h2h_d,
                "h2h_away_wins": h2h_aw,
                "label": label,
            })

            # Update
            elo.update(home, away, m["result"])
            res_h = "W" if hg>ag else "D" if hg==ag else "L"
            res_a = "W" if ag>hg else "D" if hg==ag else "L"
            hist.setdefault(home,[]).append({"res":res_h,"gf":hg,"gc":ag})
            hist.setdefault(away,[]).append({"res":res_a,"gf":ag,"gc":hg})
            hw = home if hg>ag else "D" if hg==ag else away
            h2h.setdefault(key,[]).append(hw)

        return pd.DataFrame(rows)


# ─── Data Collector ───────────────────────────────────────────────────────────
async def fetch_season(session, code, season, key):
    url = f"{FD_BASE}/competitions/{code}/matches"
    headers = {"X-Auth-Token": key}
    params = {"season": season, "status": "FINISHED"}
    try:
        # Retry la 429 cu backoff
        for attempt in range(3):
            async with session.get(url, headers=headers, params=params, timeout=20) as r:
                if r.status == 429:
                    wait = 12 + attempt * 8
                    print(f"  ⏳ Rate limit {code}/{season} — aștept {wait}s...")
                    await asyncio.sleep(wait)
                    continue
                if r.status != 200:
                    print(f"  ⚠ {code}/{season}: HTTP {r.status}")
                    return []
                data = await r.json()
                break
        else:
            print(f"  ⚠ {code}/{season}: 3 retry-uri eșuate")
            return []
        matches = []
        for m in data.get("matches", []):
            s  = m.get("score",{}).get("fullTime",{})
            hg = s.get("home") or 0
            ag = s.get("away") or 0
            if hg is None or ag is None: continue
            result = "H" if hg>ag else "D" if hg==ag else "A"
            matches.append({
                "date":       m["utcDate"][:10],
                "home":       m["homeTeam"]["name"],
                "away":       m["awayTeam"]["name"],
                "home_goals": int(hg),
                "away_goals": int(ag),
                "result":     result,
                "comp":       code,
                "season":     season,
            })
        await asyncio.sleep(2.0)  # respectăm rate limit football-data.org
        return matches
    except Exception as e:
        print(f"  ⚠ {code}/{season}: {e}")
        return []


async def collect_all_data():
    if not FOOTBALL_DATA_KEY:
        print("⚠ Lipsă FOOTBALL_DATA_KEY")
        return []
    all_m = []
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for code, info in COMPETITIONS.items():
            for season in info["seasons"]:
                print(f"  📥 {info['name']} {season}...", flush=True)
                m = await fetch_season(session, code, season, FOOTBALL_DATA_KEY)
                print(f"     → {len(m)} meciuri")
                all_m.extend(m)
    return all_m


# ─── Train ────────────────────────────────────────────────────────────────────
def train_xgb(df):
    if not XGB_OK or len(df) < 200:
        return None, {}
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["label"].values
    Xtr,Xte,ytr,yte = train_test_split(X,y,test_size=0.15,random_state=42,stratify=y)

    model = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.04,
        subsample=0.8, colsample_bytree=0.75,
        min_child_weight=4, gamma=0.15,
        reg_alpha=0.1, reg_lambda=1.0,
        use_label_encoder=False, eval_metric="mlogloss",
        random_state=42, n_jobs=-1,
    )
    model.fit(Xtr, ytr, eval_set=[(Xte,yte)], verbose=False)

    acc = accuracy_score(yte, model.predict(Xte))
    ll  = log_loss(yte, model.predict_proba(Xte))
    print(f"\n📊 Acuratețe: {acc*100:.1f}%  |  Log-Loss: {ll:.4f}")
    print(f"   Meciuri antrenare: {len(Xtr)} | Test: {len(Xte)}")
    return model, {"accuracy": round(acc,4), "log_loss": round(ll,4),
                   "n_train": len(Xtr), "n_test": len(Xte),
                   "trained_at": datetime.now().isoformat()}


async def run_training():
    print("\n🚀 Pornire antrenament FootPredict v2")
    print("="*50)

    # Verifică dacă modelul e recent (mai puțin de 7 zile)
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH) as f:
                meta = json.load(f)
            trained = datetime.fromisoformat(meta.get("trained_at","2000-01-01"))
            age_days = (datetime.now()-trained).days
            n_train = meta.get("n_train", 0)
            # Reantrenăm dacă modelul e vechi SAU dacă are prea puține date
            if age_days < 7 and n_train > 6000 and os.path.exists(MODEL_PATH):
                print(f"✅ Model recent ({age_days} zile, {n_train} meciuri) — skip reantrenare")
                return meta
            elif age_days < 7 and n_train <= 6000:
                print(f"⚠ Model recent dar insuficient ({n_train} meciuri) — reantrenare cu mai multe date")
        except:
            pass

    print("\n📥 Colectare date reale din football-data.org...")
    matches = await collect_all_data()
    print(f"\n✅ Total meciuri reale: {len(matches)}")

    if len(matches) < 500:
        print("⚠ Date insuficiente — adăug date sintetice")
        matches += _synthetic(8000)

    print(f"\n⚙ Construire features...")
    df = FeatureBuilder().build(matches)
    print(f"   Dataset: {len(df)} rânduri × {len(FEATURE_COLS)} features")
    dist = df.label.value_counts().to_dict()
    print(f"   Distribuție: Victorie gazdă={dist.get(0,0)} | Egal={dist.get(1,0)} | Victorie oaspete={dist.get(2,0)}")

    print(f"\n🤖 Antrenament XGBoost...")
    model, metrics = train_xgb(df)

    if model is not None:
        model.save_model(MODEL_PATH)
        with open(META_PATH,"w") as f:
            json.dump(metrics, f, indent=2)
        print(f"✅ Model salvat: {MODEL_PATH}")
        return metrics

    return {}


def _synthetic(n):
    np.random.seed(42)
    matches, teams = [], [f"T{i}" for i in range(50)]
    for _ in range(n):
        h = np.random.choice(teams)
        a = np.random.choice([t for t in teams if t!=h])
        r = np.random.choice(["H","D","A"], p=[0.46,0.26,0.28])
        hg = int(np.random.poisson({"H":1.7,"D":1.1,"A":0.8}[r]))
        ag = int(np.random.poisson({"H":0.9,"D":1.1,"A":1.7}[r]))
        matches.append({"date":"2023-01-01","home":h,"away":a,
                        "home_goals":hg,"away_goals":ag,"result":r,"comp":"SYN","season":2023})
    return matches


if __name__ == "__main__":
    asyncio.run(run_training())
