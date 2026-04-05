"""
Scraper xG real din Understat.com
Descarca Expected Goals pentru ligile majore, sezoane 2014-15 pana azi.
Output: backend/data/csv/fbref_xg.csv  (pastram numele pentru compatibilitate cu train.py)

Rulare: python backend/data/scrape_fbref.py
Durata: ~2-3 minute (rate limit politicos: 1s intre request-uri)
"""

import time
import os
import json
import pandas as pd
from datetime import datetime

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "csv", "fbref_xg.csv")

# Understat liga -> csv Div code
LEAGUES = {
    "EPL":        "E0",
    "La_Liga":    "SP1",
    "Bundesliga": "D1",
    "Serie_A":    "I1",
    "Ligue_1":    "F1",
    # Eredivisie nu e disponibila in Understat
}

CURRENT_YEAR = datetime.now().year
CURRENT_SEASON = CURRENT_YEAR - 1 if datetime.now().month < 7 else CURRENT_YEAR
START_SEASON = 2014  # Understat are date din 2014-15


def scrape_league_season(client, league: str, season: int) -> pd.DataFrame:
    """Descarca xG pentru o liga si sezon."""
    try:
        matches = client.league(league).get_match_data(season=str(season))
        rows = []
        for m in matches:
            # Doar meciuri jucate (isResult=True)
            if not m.get("isResult", False):
                continue
            xg_h = m.get("xG", {}).get("h")
            xg_a = m.get("xG", {}).get("a")
            if xg_h is None or xg_a is None:
                continue
            dt = m.get("datetime", "")
            date_str = dt[:10] if dt else None  # YYYY-MM-DD
            if not date_str:
                continue
            rows.append({
                "Date":     date_str,
                "HomeTeam": m["h"]["title"],
                "AwayTeam": m["a"]["title"],
                "xg_h":     float(xg_h),
                "xg_a":     float(xg_a),
                "season":   f"{season}-{season+1}",
            })
        return pd.DataFrame(rows)
    except Exception as e:
        print(f"    Eroare: {e}")
        return pd.DataFrame()


def main():
    try:
        from understatapi import UnderstatClient
    except ImportError:
        print("Instalez understatapi...")
        import subprocess, sys
        subprocess.run([sys.executable, "-m", "pip", "install", "understatapi"], check=True)
        from understatapi import UnderstatClient

    all_dfs = []

    with UnderstatClient() as client:
        for league, div_code in LEAGUES.items():
            if div_code is None:
                continue
            print(f"\n=== {league} ({div_code}) ===")

            for season in range(START_SEASON, CURRENT_SEASON + 1):
                season_str = f"{season}-{season+1}"
                print(f"  {season_str}...", end=" ", flush=True)

                df = scrape_league_season(client, league, season)

                if not df.empty:
                    df["Div"] = div_code
                    all_dfs.append(df)
                    print(f"{len(df)} meciuri")
                else:
                    print("0 meciuri")

                time.sleep(1.0)  # rate limit politicos

    if not all_dfs:
        print("\nNiciun date scrapat!")
        return

    result = pd.concat(all_dfs, ignore_index=True)
    result = result.sort_values(["Div", "Date"]).reset_index(drop=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    result.to_csv(OUTPUT_PATH, index=False)

    print(f"\n=== GATA ===")
    print(f"Total meciuri cu xG: {len(result):,}")
    print(f"\nAcoperire per liga:")
    for div, grp in result.groupby("Div"):
        print(f"  {div}: {len(grp):,} meciuri ({grp['Date'].min()} -> {grp['Date'].max()})")
    print(f"\nSalvat in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
