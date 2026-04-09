import os
import glob
import pickle
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

warnings.filterwarnings("ignore")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(BASE_DIR, "data", "csv", "club")
MODEL_PATH  = os.path.join(BASE_DIR, "model.pkl")
XG_PATH     = os.path.join(BASE_DIR, "data", "csv", "fbref_xg.csv")
MIN_MATCHES = 6
WINDOWS     = [3, 5, 10]
ELO_K       = 32
ELO_HOME    = 85


# ─────────────────────────────────────────────────────────
# 1. INCARCARE DATE
# ─────────────────────────────────────────────────────────
def load_data():
    print(">>> Incarc CSV-uri...")
    files = glob.glob(os.path.join(DATA_DIR, "**", "*.csv"), recursive=True)
    print(f"    Gasit {len(files)} fisiere.")
    dfs = []
    for f in files:
        for sep in ["\t", ",", ";"]:
            try:
                df = pd.read_csv(f, sep=sep, encoding="utf-8-sig",
                                 on_bad_lines="skip", low_memory=False)
                if len(df.columns) >= 6:
                    dfs.append(df)
                    break
            except Exception:
                continue
    data = pd.concat(dfs, ignore_index=True)
    print(f"    Total randuri brute: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 1b. INCARCARE xG REAL (Understat)
# ─────────────────────────────────────────────────────────
def load_xg_data():
    """
    Incarca xG real din fbref_xg.csv (scrapat din Understat).
    Returneaza un dict: (Div, date_str, home_lower, away_lower) -> (xg_h, xg_a)
    Aplica mapare de nume Understat -> CSV pentru a creste rata de match.
    """
    if not os.path.exists(XG_PATH):
        print("    xG file lipsa — se foloseste proxy din goluri")
        return {}

    # Mapare Understat -> format CSV (football-data.co.uk)
    NAME_MAP = {
        # Premier League
        "manchester city":         "man city",
        "manchester united":       "man united",
        "newcastle united":        "newcastle",
        "queens park rangers":     "qpr",
        "west bromwich albion":    "west brom",
        "wolverhampton wanderers": "wolves",
        "sheffield united":        "sheffield utd",
        "nottingham forest":       "nott'm forest",
        "tottenham":               "tottenham",
        # La Liga
        "atletico madrid":         "ath madrid",
        "athletic club":           "ath bilbao",
        "real betis":              "betis",
        "real sociedad":           "sociedad",
        "deportivo alavés":        "alaves",
        "deportivo la coruna":     "deportivo",
        "rcd espanyol":            "espanol",
        "rcd mallorca":            "mallorca",
        "celta vigo":              "celta",
        "leganés":                 "leganes",
        "getafe":                  "getafe",
        "sd huesca":               "huesca",
        "elche":                   "elche",
        "granada":                 "granada",
        "cadiz":                   "cadiz",
        "girona":                  "girona",
        "almeria":                 "almeria",
        "las palmas":              "las palmas",
        # Serie A
        "inter":                   "inter",
        "ac milan":                "milan",
        "hellas verona":           "verona",
        "spal":                    "spal",
        "chievo":                  "chievo",
        "us sassuolo":             "sassuolo",
        "frosinone":               "frosinone",
        "lecce":                   "lecce",
        "us lecce":                "lecce",
        "brescia":                 "brescia",
        "crotone":                 "crotone",
        "benevento":               "benevento",
        "venezia":                 "venezia",
        "salernitana":             "salernitana",
        "us cremonese":            "cremonese",
        "frosinone calcio":        "frosinone",
        # Bundesliga
        "fc augsburg":             "augsburg",
        "bayer leverkusen":        "leverkusen",
        "borussia dortmund":       "dortmund",
        "borussia mönchengladbach":"m'gladbach",
        "eintracht frankfurt":     "ein frankfurt",
        "fc köln":                 "fc koln",
        "hamburger sv":            "hamburger sv",
        "hannover 96":             "hannover",
        "hertha bsc":              "hertha",
        "hoffenheim":              "hoffenheim",
        "mainz 05":                "mainz",
        "rb leipzig":              "rb leipzig",
        "sc freiburg":             "freiburg",
        "schalke 04":              "schalke 04",
        "vfb stuttgart":           "stuttgart",
        "vfl wolfsburg":           "wolfsburg",
        "werder bremen":           "werder bremen",
        "1. fsv mainz 05":         "mainz",
        "tsg 1899 hoffenheim":     "hoffenheim",
        "fortuna düsseldorf":      "dusseldorf",
        "paderborn 07":            "paderborn",
        "arminia bielefeld":       "bielefeld",
        "greuther fürth":          "greuther furth",
        "vfl bochum":              "bochum",
        "darmstadt 98":            "darmstadt",
        "holstein kiel":           "holstein kiel",
        "sv darmstadt 98":         "darmstadt",
        # Ligue 1
        "paris saint-germain":     "paris sg",
        "olympique marseille":     "marseille",
        "olympique lyonnais":      "lyon",
        "as saint-etienne":        "st etienne",
        "stade rennais fc":        "rennes",
        "girondins de bordeaux":   "bordeaux",
        "montpellier hsc":         "montpellier",
        "toulouse fc":             "toulouse",
        "rc strasbourg alsace":    "strasbourg",
        "dijon fco":               "dijon",
        "stade de reims":          "reims",
        "fc nantes":               "nantes",
        "ogc nice":                "nice",
        "rc lens":                 "lens",
        "clermont foot":           "clermont",
        "angers sco":              "angers",
        "es troyes ac":            "troyes",
        "losc lille":              "lille",
        "stade brestois 29":       "brest",
        "aj auxerre":              "auxerre",
        "havre ac":                "le havre",
    }

    xg_df = pd.read_csv(XG_PATH)
    xg_df["Date"] = pd.to_datetime(xg_df["Date"], errors="coerce").dt.date
    xg_df = xg_df.dropna(subset=["Date", "HomeTeam", "AwayTeam", "xg_h", "xg_a"])

    def normalize(name):
        n = str(name).strip().lower()
        return NAME_MAP.get(n, n)

    xg_df["_h"] = xg_df["HomeTeam"].apply(normalize)
    xg_df["_a"] = xg_df["AwayTeam"].apply(normalize)

    lookup = {}
    for _, row in xg_df.iterrows():
        key = (str(row["Div"]), str(row["Date"]), row["_h"], row["_a"])
        lookup[key] = (float(row["xg_h"]), float(row["xg_a"]))

    print(f"    xG real incarcat: {len(lookup):,} meciuri ({xg_df['Div'].nunique()} ligi)")
    return lookup


# ─────────────────────────────────────────────────────────
# 2. CURATARE DATE
# ─────────────────────────────────────────────────────────
def preprocess(data):
    cols = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
    missing = [c for c in cols if c not in data.columns]
    if missing:
        raise RuntimeError(f"Coloane lipsa: {missing}")

    # Pastram si coloanele de cote daca exista
    odds_cols = ["PSH","PSD","PSA","B365H","B365D","B365A","AvgH","AvgD","AvgA",
                 "MaxH","MaxD","MaxA","PSCH","PSCD","PSCA",
                 "BbAvH","BbAvD","BbAvA","BbMxH","BbMxD","BbMxA"]   # variante vechi football-data
    extra = ["Div"] + [c for c in odds_cols if c in data.columns]
    keep = cols + extra
    keep = list(dict.fromkeys(keep))  # deduplicare
    data = data[keep].copy()
    data["FTHG"] = pd.to_numeric(data["FTHG"], errors="coerce")
    data["FTAG"] = pd.to_numeric(data["FTAG"], errors="coerce")
    data["FTR"]  = data["FTR"].astype(str).str.strip()
    data = data.dropna(subset=["FTHG", "FTAG", "FTR", "HomeTeam", "AwayTeam"])
    data = data[data["FTR"].isin(["H", "D", "A"])]
    data["Date"] = pd.to_datetime(data["Date"], dayfirst=True, errors="coerce")
    data = data.dropna(subset=["Date"])

    # Liga — folosim Div ca identificator de liga
    if "Div" in data.columns:
        data["Div"] = data["Div"].astype(str).str.strip()
    else:
        data["Div"] = "UNK"

    data = data.sort_values("Date").reset_index(drop=True)
    print(f"    Meciuri valide: {len(data)}")
    return data


# ─────────────────────────────────────────────────────────
# 3. MARKET DATA — cote → probabilitati implicite
# ─────────────────────────────────────────────────────────
def build_market_features(data):
    """
    Market Intelligence features — COV, CLV, steam/drift, sharp-soft divergence.

    Surse de date necesare (football-data.co.uk):
      PSH/PSD/PSA   = Pinnacle opening (pre-match)
      PSCH/PSCD/PSCA = Pinnacle closing (la startul meciului) ← cel mai sharp bookmaker
      MaxH/MaxD/MaxA = Maximum la close (toate casele)
      AvgH/AvgD/AvgA = Media la close
      B365H/B365D/B365A = Bet365 (soft book, reflecta opinia publicului)
    """
    print(">>> Calculez Market Intelligence features (COV/CLV/Steam/Sharp)...")
    result = pd.DataFrame(index=data.index)

    has_ps_open  = all(c in data.columns for c in ["PSH",  "PSD",  "PSA"])
    has_ps_close = all(c in data.columns for c in ["PSCH", "PSCD", "PSCA"])
    has_avg      = all(c in data.columns for c in ["AvgH", "AvgD", "AvgA"])
    has_max      = all(c in data.columns for c in ["MaxH", "MaxD", "MaxA"])
    has_b365     = all(c in data.columns for c in ["B365H","B365D","B365A"])

    def safe_num(col):
        return pd.to_numeric(data[col], errors="coerce").where(lambda x: x > 1.01) if col in data.columns else pd.Series(np.nan, index=data.index)

    # ── 1. Pinnacle line movement: opening → closing ───────────────────────
    if has_ps_open and has_ps_close:
        psh, psd, psa   = safe_num("PSH"),  safe_num("PSD"),  safe_num("PSA")
        psch, pscd, psca = safe_num("PSCH"), safe_num("PSCD"), safe_num("PSCA")

        # Miscarea relativa: >0 = cota crescut (drift), <0 = cota scazut (steam = bani intrați)
        result["ps_move_h"] = ((psch / psh) - 1).clip(-0.40, 0.40)
        result["ps_move_a"] = ((psca / psa) - 1).clip(-0.40, 0.40)
        result["ps_move_d"] = ((pscd / psd) - 1).clip(-0.40, 0.40)

        # Directie binara
        result["home_steamed"] = (psch < psh * 0.98).astype(float)   # bani pe gazda
        result["away_steamed"] = (psca < psa * 0.98).astype(float)   # bani pe oaspete
        result["home_drifted"] = (psch > psh * 1.03).astype(float)   # piata fuge de gazda
        result["away_drifted"] = (psca > psa * 1.03).astype(float)

        # Closing Line Value (CLV): prob implicita la close vs open
        vig_o = (1/psh + 1/psd + 1/psa).clip(lower=0.9)
        vig_c = (1/psch + 1/pscd + 1/psca).clip(lower=0.9)
        result["clv_h"] = ((1/psch)/vig_c - (1/psh)/vig_o).clip(-0.15, 0.15)
        result["clv_a"] = ((1/psca)/vig_c - (1/psa)/vig_o).clip(-0.15, 0.15)

        # Reverse line movement: cota a scazut DAR linia implicitly se misca invers
        # → public pariaza pe favorit, dar sharp money e pe cealalta parte
        result["reverse_line_h"] = ((result["home_steamed"] == 1) & (result["clv_h"] < -0.02)).astype(float)
        result["reverse_line_a"] = ((result["away_steamed"] == 1) & (result["clv_a"] < -0.02)).astype(float)

        print(f"    Pinnacle movement data: {(psch.notna()).sum():,} meciuri cu PS closing")
    else:
        for col in ["ps_move_h","ps_move_a","ps_move_d",
                    "home_steamed","away_steamed","home_drifted","away_drifted",
                    "clv_h","clv_a","reverse_line_h","reverse_line_a"]:
            result[col] = 0.0
        print("    ATENTIE: PSH/PSCH lipsa — features de miscare setate la 0")

    # ── 2. Sharp vs Soft divergence ────────────────────────────────────────
    # Pinnacle (sharp) vs Bet365 (soft/public sentiment)
    ps_close_h = safe_num("PSCH") if has_ps_close else safe_num("PSH")
    ps_close_a = safe_num("PSCA") if has_ps_close else safe_num("PSA")

    if has_b365:
        b365h, b365a = safe_num("B365H"), safe_num("B365A")
        result["sharp_soft_div_h"] = (ps_close_h - b365h).clip(-1.0, 1.0)
        result["sharp_soft_div_a"] = (ps_close_a - b365a).clip(-1.0, 1.0)
        # >0 = Pinnacle mai mare = piata sharp nu favorizeaza echipa → public o supraevalueaza
        result["public_fav_h"] = (result["sharp_soft_div_h"] > 0.08).astype(float)
        result["public_fav_a"] = (result["sharp_soft_div_a"] > 0.08).astype(float)
    elif has_avg:
        avgh, avga = safe_num("AvgH"), safe_num("AvgA")
        result["sharp_soft_div_h"] = (ps_close_h - avgh).clip(-1.0, 1.0)
        result["sharp_soft_div_a"] = (ps_close_a - avga).clip(-1.0, 1.0)
        result["public_fav_h"] = (result["sharp_soft_div_h"] > 0.08).astype(float)
        result["public_fav_a"] = (result["sharp_soft_div_a"] > 0.08).astype(float)
    else:
        for col in ["sharp_soft_div_h","sharp_soft_div_a","public_fav_h","public_fav_a"]:
            result[col] = 0.0

    # ── 3. Closing Odds Variance (dezacord între bookmakers la close) ───────
    close_cols_h = [c for c in ["PSCH","MaxH","AvgH","B365H"] if c in data.columns]
    close_cols_a = [c for c in ["PSCA","MaxA","AvgA","B365A"] if c in data.columns]

    if len(close_cols_h) >= 2:
        close_mat_h = pd.concat([safe_num(c) for c in close_cols_h], axis=1)
        close_mat_a = pd.concat([safe_num(c) for c in close_cols_a], axis=1)
        result["close_var_h"] = close_mat_h.std(axis=1).fillna(0).clip(0, 1.0)
        result["close_var_a"] = close_mat_a.std(axis=1).fillna(0).clip(0, 1.0)
        # COV ridicat = piata nesigura = informatie valoroasa
        result["high_cov_h"] = (result["close_var_h"] > 0.10).astype(float)
        result["high_cov_a"] = (result["close_var_a"] > 0.10).astype(float)
    else:
        for col in ["close_var_h","close_var_a","high_cov_h","high_cov_a"]:
            result[col] = 0.0

    # ── 4. Market efficiency (vig) ─────────────────────────────────────────
    if has_max:
        maxh, maxd, maxa = safe_num("MaxH"), safe_num("MaxD"), safe_num("MaxA")
        result["market_vig"] = (1/maxh + 1/maxd + 1/maxa - 1).clip(0, 0.25)
        result["low_vig"]    = (result["market_vig"] < 0.04).astype(float)
    else:
        result["market_vig"] = 0.05
        result["low_vig"]    = 0.0

    # ── 5. Value zone 1.60–2.10 + interactiuni ────────────────────────────
    ref_h = safe_num("PSCH") if has_ps_close else (safe_num("MaxH") if has_max else safe_num("PSH"))
    ref_a = safe_num("PSCA") if has_ps_close else (safe_num("MaxA") if has_max else safe_num("PSA"))

    result["value_zone_h"] = ((ref_h >= 1.60) & (ref_h <= 2.10)).astype(float)
    result["value_zone_a"] = ((ref_a >= 1.60) & (ref_a <= 2.10)).astype(float)

    # Interactiuni: drift/steam IN zona de valoare → semnalul cel mai puternic pentru surprize
    result["drift_in_value_h"] = result.get("home_drifted", pd.Series(0.0, index=data.index)) \
                                  * result["value_zone_h"]
    result["steam_in_value_a"] = result.get("away_steamed", pd.Series(0.0, index=data.index)) \
                                  * result["value_zone_a"]
    result["trap_game_h"] = (
        (result["value_zone_h"] == 1) &
        (result.get("home_drifted", pd.Series(0.0, index=data.index)) == 1) &
        (result.get("sharp_soft_div_h", pd.Series(0.0, index=data.index)) > 0.05)
    ).astype(float)

    result = result.fillna(0.0)

    n_cols    = len(result.columns)
    n_nonzero = (result != 0).any(axis=1).sum()
    print(f"    Market Intelligence: {n_cols} features, {n_nonzero:,}/{len(data):,} meciuri cu date ({n_nonzero/len(data)*100:.1f}%)")
    return result


def build_odds_features(data):
    """
    Converteste cotele bookmakerilor in probabilitati normalizate.
    Pinnacle (PS) este cel mai sharp bookmaker — cel mai valoros feature.
    Meciurile fara cote primesc valori medii (has_odds=0).
    """
    print(">>> Procesez cote bookmakers...")
    result = pd.DataFrame(index=data.index)

    sources = [
        ("ps",   "PSH",   "PSD",   "PSA"),    # Pinnacle — cel mai sharp
        ("avg",  "AvgH",  "AvgD",  "AvgA"),   # Media pietei
        ("b365", "B365H", "B365D", "B365A"),  # Bet365
        ("max",  "MaxH",  "MaxD",  "MaxA"),   # Maximul pietei
    ]

    any_odds = pd.Series(False, index=data.index)

    for name, ch, cd, ca in sources:
        if not all(c in data.columns for c in [ch, cd, ca]):
            continue
        h = pd.to_numeric(data[ch], errors="coerce").where(lambda x: x > 1.01)
        d = pd.to_numeric(data[cd], errors="coerce").where(lambda x: x > 1.01)
        a = pd.to_numeric(data[ca], errors="coerce").where(lambda x: x > 1.01)

        raw_h = 1.0 / h
        raw_d = 1.0 / d
        raw_a = 1.0 / a
        margin = raw_h + raw_d + raw_a  # overround (1.05-1.08 tipic)

        # Probabilitati normalizate (suma = 1.0)
        result[f"mkt_ph_{name}"] = raw_h / margin
        result[f"mkt_pd_{name}"] = raw_d / margin
        result[f"mkt_pa_{name}"] = raw_a / margin
        result[f"mkt_margin_{name}"] = margin

        valid = (raw_h.notna() & raw_d.notna() & raw_a.notna())
        any_odds = any_odds | valid

    result["has_odds"] = any_odds.astype(float)

    # Inlocuieste NaN cu media datelor (meciuri fara cote = "meci mediu")
    for col in result.columns:
        if col != "has_odds":
            mean_val = result.loc[any_odds, col].mean()
            if pd.notna(mean_val):
                result[col] = result[col].fillna(mean_val)

    n_with = any_odds.sum()
    print(f"    Meciuri cu cote: {n_with:,} / {len(data):,} ({n_with/len(data)*100:.1f}%)")
    return result


# ─────────────────────────────────────────────────────────
# 4. ELO PER LIGA (fix principal — nu global!)
# ─────────────────────────────────────────────────────────
def build_elo_features(data):
    """
    Elo calculat SEPARAT per liga.
    Echipele din ligi diferite nu se influenteaza reciproc.
    Elo porneste de la 1500 la prima aparitie in fiecare liga.
    """
    print(">>> Calculez Elo per liga...")
    ratings = {}  # (liga, echipa) -> elo

    def get(league, team):
        return ratings.get((league, team), 1500.0)

    def expected(ra, rb):
        return 1.0 / (1 + 10 ** ((rb - ra) / 400))

    h_elo, a_elo, elo_diff, elo_prob_h, elo_prob_d = [], [], [], [], []

    for _, row in data.iterrows():
        league = row["Div"]
        home, away, ftr = row["HomeTeam"], row["AwayTeam"], row["FTR"]

        rh = get(league, home)
        ra = get(league, away)
        rh_adj = rh + ELO_HOME

        ea = expected(rh_adj, ra)  # prob victorie gazda

        h_elo.append(rh)
        a_elo.append(ra)
        elo_diff.append(rh_adj - ra)

        # Prob estimate H/D/A din Elo
        diff_abs = abs(rh_adj - ra)
        dp = max(0.15, min(0.35, 0.27 * np.exp(-diff_abs / 500)))
        elo_prob_h.append(ea * (1 - dp))
        elo_prob_d.append(dp)

        # Update dupa meci
        sa, sb = {"H": (1, 0), "D": (0.5, 0.5), "A": (0, 1)}[ftr]
        ratings[(league, home)] = rh + ELO_K * (sa - ea)
        ratings[(league, away)] = ra + ELO_K * (sb - (1 - ea))

    elo_ratings_flat = {f"{lg}|{tm}": v for (lg, tm), v in ratings.items()}

    return pd.DataFrame({
        "h_elo":      h_elo,
        "a_elo":      a_elo,
        "elo_diff":   elo_diff,
        "elo_prob_h": elo_prob_h,
        "elo_prob_d": elo_prob_d,
    }, index=data.index), elo_ratings_flat


# ─────────────────────────────────────────────────────────
# 4. FEATURES ATAC / APARARE + FORMA
# ─────────────────────────────────────────────────────────
def build_team_features(data, xg_lookup=None):
    """
    Pentru fiecare meci, calculam (fara leakage):
    - rata de goluri / xG marcate/primite acasa si in deplasare
    - forma recenta (win rate ultimele 5)
    - streak
    xg_lookup: dict (Div, date_str, home_lower, away_lower) -> (xg_h, xg_a)
    """
    print(">>> Calculez features atac/aparare per echipa...")
    if xg_lookup:
        print(f"    xG real disponibil pentru {len(xg_lookup):,} meciuri")

    # Structuri de istoric per echipa
    hist = {}  # team -> list de {gf, ga, xgf, xga, is_home, pts}

    rows = []
    xg_real_used = 0

    for idx, row in data.iterrows():
        home, away = row["HomeTeam"], row["AwayTeam"]
        hg, ag = row["FTHG"], row["FTAG"]
        ftr = row["FTR"]
        div = str(row.get("Div", ""))
        date_obj = row["Date"].date() if hasattr(row["Date"], "date") else None

        # Cauta xG real pentru acest meci
        real_xg_h = real_xg_a = None
        if xg_lookup and date_obj:
            key = (div, str(date_obj), home.strip().lower(), away.strip().lower())
            real_xg = xg_lookup.get(key)
            if real_xg:
                real_xg_h, real_xg_a = real_xg
                xg_real_used += 1

        def get_stats(team, as_home):
            records = hist.get(team, [])
            all_r   = records
            home_r  = [r for r in records if r["is_home"]]
            away_r  = [r for r in records if not r["is_home"]]

            def avg_gf(lst, n, default=1.3):
                if not lst: return default
                vals = [r["gf"] for r in lst[-n:]]
                return sum(vals) / len(vals)

            def avg_ga(lst, n, default=1.3):
                if not lst: return default
                vals = [r["ga"] for r in lst[-n:]]
                return sum(vals) / len(vals)

            def avg_xgf(lst, n, default=None):
                sub = [r for r in lst[-n:] if r.get("xgf") is not None]
                if not sub: return default
                return sum(r["xgf"] for r in sub) / len(sub)

            def avg_xga(lst, n, default=None):
                sub = [r for r in lst[-n:] if r.get("xga") is not None]
                if not sub: return default
                return sum(r["xga"] for r in sub) / len(sub)

            def win_rate(lst, n):
                if not lst: return 0.40
                sub = lst[-n:]
                return sum(1 for r in sub if r["pts"] == 3) / len(sub)

            def draw_rate(lst, n):
                if not lst: return 0.26
                sub = lst[-n:]
                return sum(1 for r in sub if r["pts"] == 1) / len(sub)

            def pts_rate(lst, n):
                if not lst: return 1.2
                sub = lst[-n:]
                return sum(r["pts"] for r in sub) / (3 * len(sub))

            def streak(lst):
                if not lst: return 0
                last = lst[-1]["pts"]
                s = 0
                for r in reversed(lst):
                    if r["pts"] == last:
                        s += 1
                    else:
                        break
                return s if last == 3 else (-s if last == 0 else 0)

            venue_r = home_r if as_home else away_r
            gf_venue5 = avg_gf(venue_r, 5, 1.4 if as_home else 1.1)
            ga_venue5 = avg_ga(venue_r, 5, 1.1 if as_home else 1.3)

            # xG rolling: folosim real daca avem, altfel proxy din goluri
            xgf5 = avg_xgf(all_r, 5)
            xga5 = avg_xga(all_r, 5)
            xgf_v5 = avg_xgf(venue_r, 5)
            xga_v5 = avg_xga(venue_r, 5)

            return {
                "atk_all5":    avg_gf(all_r, 5),
                "def_all5":    avg_ga(all_r, 5),
                "atk_all10":   avg_gf(all_r, 10),
                "def_all10":   avg_ga(all_r, 10),
                "atk_venue5":  gf_venue5,
                "def_venue5":  ga_venue5,
                "win5":        win_rate(all_r, 5),
                "win10":       win_rate(all_r, 10),
                "draw5":       draw_rate(all_r, 5),
                "pts5":        pts_rate(all_r, 5),
                "pts10":       pts_rate(all_r, 10),
                "win_venue5":  win_rate(venue_r, 5),
                "pts_venue5":  pts_rate(venue_r, 5),
                "btts5":       sum(1 for r in all_r[-5:] if r["gf"] > 0 and r["ga"] > 0) / max(len(all_r[-5:]), 1),
                "over25_5":    sum(1 for r in all_r[-5:] if r["gf"] + r["ga"] > 2) / max(len(all_r[-5:]), 1),
                "clean5":      sum(1 for r in all_r[-5:] if r["ga"] == 0) / max(len(all_r[-5:]), 1),
                "streak":      streak(all_r),
                "n_matches":   len(all_r),
                # xG rolling real (None daca nu avem date)
                "_xgf5":       xgf5,
                "_xga5":       xga5,
                "_xgf_v5":     xgf_v5,
                "_xga_v5":     xga_v5,
                "_gf_v5":      gf_venue5,
                "_ga_v5":      ga_venue5,
            }

        h_stats = get_stats(home, as_home=True)
        a_stats = get_stats(away, as_home=False)

        # xG pentru feature-uri predictive (INAINTE de meci — rolling history)
        # Folosim xG real rolling daca avem, altfel proxy din goluri
        def pick_xg(xgf5, xga5, xgf_v5, xga_v5, gf_v5, ga_v5):
            if xgf_v5 is not None and xga_v5 is not None:
                return xgf_v5, xga_v5  # xG real venue-specific
            elif xgf5 is not None and xga5 is not None:
                return xgf5, xga5  # xG real general
            else:
                return gf_v5, ga_v5  # proxy din goluri

        h_xgf, h_xga = pick_xg(h_stats["_xgf5"], h_stats["_xga5"],
                                h_stats["_xgf_v5"], h_stats["_xga_v5"],
                                h_stats["_gf_v5"], h_stats["_ga_v5"])
        a_xgf, a_xga = pick_xg(a_stats["_xgf5"], a_stats["_xga5"],
                                a_stats["_xgf_v5"], a_stats["_xga_v5"],
                                a_stats["_gf_v5"], a_stats["_ga_v5"])

        xg_h = (h_xgf + a_xga) / 2
        xg_a = (a_xgf + h_xga) / 2

        # Curata cheile interne
        for k in ["_xgf5", "_xga5", "_xgf_v5", "_xga_v5", "_gf_v5", "_ga_v5"]:
            h_stats.pop(k, None)
            a_stats.pop(k, None)

        row_feat = {"match_idx": idx}
        for k, v in h_stats.items():
            row_feat[f"h_{k}"] = v
        for k, v in a_stats.items():
            row_feat[f"a_{k}"] = v
        row_feat["xg_h"] = xg_h
        row_feat["xg_a"] = xg_a
        row_feat["xg_diff"] = xg_h - xg_a

        rows.append(row_feat)

        # Update istoric (cu xG real daca avem)
        h_pts = {"H": 3, "D": 1, "A": 0}[ftr]
        a_pts = {"H": 0, "D": 1, "A": 3}[ftr]
        hist.setdefault(home, []).append({
            "gf": hg, "ga": ag, "is_home": True, "pts": h_pts,
            "xgf": real_xg_h, "xga": real_xg_a,
        })
        hist.setdefault(away, []).append({
            "gf": ag, "ga": hg, "is_home": False, "pts": a_pts,
            "xgf": real_xg_a, "xga": real_xg_h,
        })

    print(f"    xG real folosit: {xg_real_used:,} meciuri ({xg_real_used/max(len(rows),1)*100:.1f}%)")
    return pd.DataFrame(rows).set_index("match_idx"), hist


# ─────────────────────────────────────────────────────────
# 5. H2H FEATURES
# ─────────────────────────────────────────────────────────
def build_h2h_features(data):
    print(">>> Calculez H2H...")
    rows = []
    history = {}

    for idx, row in data.iterrows():
        home, away = row["HomeTeam"], row["AwayTeam"]
        ftr = row["FTR"]
        hg, ag = row["FTHG"], row["FTAG"]
        key = tuple(sorted([home, away]))
        recent = history.get(key, [])[-6:]

        if not recent:
            rows.append({"match_idx": idx,
                         "h2h_hw": 0.45, "h2h_dr": 0.25,
                         "h2h_gd": 0.0,  "h2h_n": 0})
        else:
            hw = dr = 0
            gd_sum = 0.0
            for r in recent:
                if r["home"] == home:
                    hw += int(r["ftr"] == "H")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["hg"] - r["ag"]
                else:
                    hw += int(r["ftr"] == "A")
                    dr += int(r["ftr"] == "D")
                    gd_sum += r["ag"] - r["hg"]
            n = len(recent)
            rows.append({"match_idx": idx,
                         "h2h_hw": hw / n, "h2h_dr": dr / n,
                         "h2h_gd": gd_sum / n, "h2h_n": n})

        history.setdefault(key, []).append(
            {"home": home, "away": away, "ftr": ftr, "hg": hg, "ag": ag})

    return pd.DataFrame(rows).set_index("match_idx"), history


# ─────────────────────────────────────────────────────────
# 6. ASAMBLARE
# ─────────────────────────────────────────────────────────
def assemble(data, team_df, h2h_df, elo_df, odds_df, market_df):
    print(">>> Asamblam feature matrix...")

    le_div = LabelEncoder()
    league_id = le_div.fit_transform(data["Div"])

    X = pd.concat([team_df, h2h_df, elo_df, odds_df, market_df], axis=1)

    # Diferentiale
    for col in ["atk_all5", "def_all5", "atk_all10", "def_all10",
                "atk_venue5", "def_venue5", "win5", "win10",
                "pts5", "pts10", "win_venue5", "pts_venue5"]:
        if f"h_{col}" in X.columns and f"a_{col}" in X.columns:
            X[f"diff_{col}"] = X[f"h_{col}"] - X[f"a_{col}"]

    X["league_id"]       = league_id
    X["month"]           = data["Date"].dt.month.values
    X["season_progress"] = ((data["Date"].dt.month - 8) % 12) / 11.0

    # Features specifice pentru egaluri
    # Egal mai probabil cand: echipe egale, joc defensiv, elo_diff mic
    X["balanced"]    = np.exp(-np.abs(X["elo_diff"]) / 150)   # 1.0 cand elo_diff=0
    X["low_scoring"] = 1.0 / (X["xg_h"] + X["xg_a"] + 0.5)  # creste cand xg mic
    X["xg_sim"]      = np.exp(-np.abs(X["xg_diff"]) * 2)     # 1.0 cand xg_h≈xg_a
    # Poisson draw proxy: P(draw) ≈ exp(-(lam+mu)) * I0(2*sqrt(lam*mu))
    lam = X["xg_h"].clip(0.1, 6)
    mu  = X["xg_a"].clip(0.1, 6)
    X["poisson_draw"] = np.exp(-(lam + mu)) * np.exp(2 * np.sqrt(lam * mu) - lam - mu + (lam + mu))

    # Filtru cold-start
    valid = (X["h_n_matches"] >= MIN_MATCHES) & (X["a_n_matches"] >= MIN_MATCHES)
    X = X[valid].fillna(0)
    y = data.loc[valid, "FTR"]
    print(f"    Meciuri cu istoric: {len(X)}")
    return X, y


# ─────────────────────────────────────────────────────────
# 7. ANTRENARE
# ─────────────────────────────────────────────────────────
def train_model(X, y):
    print(">>> Antrenez XGBoost...")
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # Antrenam EXCLUSIV pe meciuri cu cote — fara zgomot din imputation
    has_odds_mask = X["has_odds"] == 1
    X_odds = X[has_odds_mask]
    y_odds = y_enc[has_odds_mask.values]
    print(f"    Meciuri cu cote: {len(X_odds):,} / {len(X):,} ({has_odds_mask.mean()*100:.1f}%)")

    # Random split stratificat pe setul cu cote
    X_train, X_test, y_train, y_test = train_test_split(
        X_odds, y_odds, test_size=0.20, random_state=42, stratify=y_odds
    )

    dist = {le.classes_[i]: int((y_train == i).sum()) for i in range(3)}
    print(f"    Train: {len(X_train)} | Test: {len(X_test)}")
    print(f"    Distributie: {dist}")

    model = XGBClassifier(
        n_estimators=1000,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.80,
        colsample_bytree=0.75,
        colsample_bylevel=0.75,
        min_child_weight=6,
        gamma=0.05,
        reg_alpha=0.1,
        reg_lambda=1.5,
        eval_metric="mlogloss",
        early_stopping_rounds=80,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=100,
    )

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n>>> Acuratete: {acc * 100:.2f}%")
    print(classification_report(y_test, preds, target_names=le.classes_))

    # Confidence threshold analysis
    proba = model.predict_proba(X_test)
    max_conf = proba.max(axis=1)
    print("\n>>> Acuratete per prag de incredere:")
    for thr in [0.45, 0.50, 0.55, 0.60, 0.65, 0.70]:
        mask = max_conf >= thr
        if mask.sum() > 0:
            acc_thr = accuracy_score(y_test[mask], preds[mask])
            print(f"    >= {thr:.0%}  ->  {acc_thr*100:.2f}%  ({mask.sum():,} meciuri, {mask.mean()*100:.1f}%)")

    # Salvam mediile pentru completarea features lipsă în predictor live
    feature_means = X_odds.mean().to_dict()

    return model, le, feature_means


# ─────────────────────────────────────────────────────────
# 8. TEAM STATS PENTRU PREDICTOR
# ─────────────────────────────────────────────────────────
def build_team_stats(hist, elo_ratings):
    team_stats = {}
    for team, records in hist.items():
        if not records:
            continue
        last10 = records[-10:]
        last5  = records[-5:]
        home_r = [r for r in records if r["is_home"]]
        away_r = [r for r in records if not r["is_home"]]
        home5  = home_r[-5:]
        away5  = away_r[-5:]

        def avg(lst, key, default=1.3):
            return sum(r[key] for r in lst) / len(lst) if lst else default

        def win_rate(lst):
            return sum(1 for r in lst if r["pts"] == 3) / len(lst) if lst else 0.40

        def pts_rate(lst):
            return sum(r["pts"] for r in lst) / (3 * len(lst)) if lst else 0.40

        def streak(lst):
            if not lst: return 0
            last = lst[-1]["pts"]
            s = 0
            for r in reversed(lst):
                if r["pts"] == last: s += 1
                else: break
            return s if last == 3 else (-s if last == 0 else 0)

        # Elo: cauta key "liga|echipa" — ia cea mai mare valoare (cel mai bun Elo al echipei)
        team_elo = max(
            (v for k, v in elo_ratings.items() if k.split("|", 1)[-1] == team),
            default=1500.0
        )

        team_stats[team] = {
            # All games
            "atk_all5":    avg(last5, "gf"),
            "def_all5":    avg(last5, "ga"),
            "atk_all10":   avg(last10, "gf"),
            "def_all10":   avg(last10, "ga"),
            # Home venue stats
            "atk_home5":   avg(home5, "gf", 1.4),
            "def_home5":   avg(home5, "ga", 1.1),
            "win_home5":   win_rate(home5),
            "pts_home5":   pts_rate(home5),
            # Away venue stats
            "atk_away5":   avg(away5, "gf", 1.1),
            "def_away5":   avg(away5, "ga", 1.3),
            "win_away5":   win_rate(away5),
            "pts_away5":   pts_rate(away5),
            # Form
            "win5":        win_rate(last5),
            "win10":       win_rate(last10),
            "draw5":       sum(1 for r in last5 if r["pts"] == 1) / max(len(last5), 1),
            "pts5":        pts_rate(last5),
            "pts10":       pts_rate(last10),
            "btts5":       sum(1 for r in last5 if r["gf"] > 0 and r["ga"] > 0) / max(len(last5), 1),
            "over25_5":    sum(1 for r in last5 if r["gf"] + r["ga"] > 2) / max(len(last5), 1),
            "clean5":      sum(1 for r in last5 if r["ga"] == 0) / max(len(last5), 1),
            "streak":      streak(records),
            "n_matches":   len(records),
            "elo":         team_elo,
        }
    return team_stats


# ─────────────────────────────────────────────────────────
# 9. MAIN
# ─────────────────────────────────────────────────────────
def main():
    data                    = load_data()
    data                    = preprocess(data)
    xg_lookup               = load_xg_data()
    odds_df                 = build_odds_features(data)
    market_df               = build_market_features(data)
    elo_df, elo_ratings     = build_elo_features(data)
    team_df, hist           = build_team_features(data, xg_lookup=xg_lookup)
    h2h_df, h2h_history      = build_h2h_features(data)
    X, y                    = assemble(data, team_df, h2h_df, elo_df, odds_df, market_df)
    model, le, feature_means = train_model(X, y)
    team_stats               = build_team_stats(hist, elo_ratings)

    # Trim h2h_history la ultimele 6 per pereche — suficient pentru inference, economiseste memorie
    h2h_history_trimmed = {k: v[-6:] for k, v in h2h_history.items()}

    print(">>> Salvez modelul...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "model":          model,
            "features":       list(X.columns),
            "team_stats":     team_stats,
            "label_encoder":  le,
            "elo_ratings":    elo_ratings,
            "feature_means":  feature_means,
            "h2h_history":    h2h_history_trimmed,
        }, f)
    print(">>> Model salvat!")


if __name__ == "__main__":
    main()
