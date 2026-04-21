"""
Descarca CSV-urile curente (sezon 2025-26) de pe football-data.co.uk
si le salveaza in data/csv/club/ (suprascrie fisierele numerotate cel mai mare).
"""
import os
import glob
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "csv", "club")

LEAGUES = ["E0", "E1", "SP1", "D1", "I1", "F1", "F2", "P1", "B1"]
SEASON  = "2526"

def get_max_number(league):
    pattern = os.path.join(DATA_DIR, f"{league} (*).csv")
    files = glob.glob(pattern)
    if not files:
        return 0
    nums = []
    for f in files:
        try:
            n = int(os.path.basename(f).split("(")[1].split(")")[0])
            nums.append(n)
        except:
            pass
    return max(nums) if nums else 0

def download_league(league):
    url = f"https://www.football-data.co.uk/mmz4281/{SEASON}/{league}.csv"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            print(f"  [{league}] HTTP {r.status_code} - skip")
            return False
        content = r.text
        if len(content) < 100 or "Div" not in content:
            print(f"  [{league}] Continut invalid - skip")
            return False
        # Suprascrie fisierul cu numarul cel mai mare (sezonul curent)
        max_n = get_max_number(league)
        if max_n > 0:
            out_path = os.path.join(DATA_DIR, f"{league} ({max_n}).csv")
        else:
            out_path = os.path.join(DATA_DIR, f"{league}.csv")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        lines = content.strip().split("\n")
        print(f"  [{league}] OK → {os.path.basename(out_path)} ({len(lines)-1} meciuri)")
        return True
    except Exception as e:
        print(f"  [{league}] Eroare: {e}")
        return False

if __name__ == "__main__":
    print(f"Download date sezon {SEASON}...")
    ok = 0
    for league in LEAGUES:
        if download_league(league):
            ok += 1
    print(f"\nComplet: {ok}/{len(LEAGUES)} ligi actualizate.")
