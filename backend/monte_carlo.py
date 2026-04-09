"""
OXIANO — Monte Carlo Simulation
════════════════════════════════════════════════════════════════════════════════
Simuleaza 100,000 de sezoane pentru a evalua riscul si randamentul modelului.

Metrici calculate:
  - Expected Value (EV%) per pariu
  - Maximum Drawdown (MDD): median, percentila 95, worst case
  - Sharpe Ratio & Sortino Ratio (randament ajustat la risc)
  - Profit Trajectory cu Fractional Kelly Criterion (10% / 25%)

Scenarii de cote: 1.25 / 1.30 / 1.70
Tier-uri model:   >=65% conf (74.7% acc) / >=70% conf (77.8% acc)

Output: tabele in consola + 3 grafice PNG in data/charts/
════════════════════════════════════════════════════════════════════════════════
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.ticker import FuncFormatter, PercentFormatter
import os, warnings
warnings.filterwarnings("ignore")

np.random.seed(42)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATIE
# ─────────────────────────────────────────────────────────────────────────────
N_SIM         = 100_000
N_BETS        = 500         # meciuri per sezon (~1.5 sezoane de picks zilnici)
STARTING_BANK = 1_000.0     # RON (scalabil la orice suma)

TIERS = {
    ">=65% conf  (vol 12.8%)": {"accuracy": 0.747, "volume": 0.128, "color": "#f59e0b"},
    ">=70% conf  ( vol 8.7%)": {"accuracy": 0.778, "volume": 0.087, "color": "#10b981"},
}

ODDS_SCENARIOS = {
    "Cote 1.25": 1.25,
    "Cote 1.30": 1.30,
    "Cote 1.70": 1.70,
}

KELLY_FRACTIONS = {"10% Kelly": 0.10, "25% Kelly": 0.25}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "charts")
os.makedirs(OUT_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# FUNCTII CORE
# ─────────────────────────────────────────────────────────────────────────────

def expected_value(p: float, odds: float) -> float:
    """EV per unitate pariata."""
    return p * odds - 1.0


def full_kelly(p: float, odds: float) -> float:
    """Kelly Criterion complet. 0 daca EV negativ."""
    b = odds - 1.0
    k = (p * b - (1.0 - p)) / b
    return max(0.0, k)


def max_drawdown_batch(equity_matrix: np.ndarray) -> np.ndarray:
    """
    MDD pentru fiecare simulare (vectorizat).
    equity_matrix: shape (N_SIM, N_BETS)
    Returneaza array de N_SIM valori negative (% din peak).
    """
    peaks = np.maximum.accumulate(equity_matrix, axis=1)
    drawdowns = (equity_matrix - peaks) / np.where(peaks == 0, 1.0, peaks)
    return drawdowns.min(axis=1)


def sharpe_ratio(per_bet_returns: np.ndarray) -> float:
    """Sharpe anualizat (normalizat la N_BETS pariuri)."""
    mu, sigma = per_bet_returns.mean(), per_bet_returns.std()
    return float(mu / sigma * np.sqrt(N_BETS)) if sigma > 0 else 0.0


def sortino_ratio(per_bet_returns: np.ndarray) -> float:
    """Sortino: penalizeaza doar volatilitatea negativa."""
    mu = per_bet_returns.mean()
    downside = per_bet_returns[per_bet_returns < 0]
    if len(downside) == 0:
        return 99.0
    downside_std = np.sqrt((downside ** 2).mean())
    return float(mu / downside_std * np.sqrt(N_BETS)) if downside_std > 0 else 99.0


def simulate_scenario(p: float, odds: float, kelly_frac: float):
    """
    Ruleaza N_SIM simulari de N_BETS pariuri fiecare.
    Returneaza (equity_matrix, stats_dict).
    equity_matrix = None daca EV negativ (nu se pariaza).
    """
    ev  = expected_value(p, odds)
    fk  = full_kelly(p, odds)
    bet = fk * kelly_frac

    base_stats = {
        "ev_pct":     round(ev * 100, 2),
        "full_kelly": round(fk * 100, 2),
        "bet_pct":    round(bet * 100, 2),
        "viable":     ev > 0 and bet > 0,
    }

    if not base_stats["viable"]:
        return None, base_stats

    b = odds - 1.0

    # Genereaza toate rezultatele dintr-o data (vectorizat — rapid)
    wins     = np.random.binomial(1, p, (N_SIM, N_BETS))
    returns  = np.where(wins == 1, b * bet, -bet)
    equity   = STARTING_BANK * np.cumprod(1.0 + returns, axis=1)

    final    = equity[:, -1]
    mdd      = max_drawdown_batch(equity)

    # Randament geometric per pariu (pentru Sharpe/Sortino)
    geo_ret  = (final / STARTING_BANK) ** (1.0 / N_BETS) - 1.0

    stats = {
        **base_stats,
        # Bankroll final
        "median_final":  round(float(np.median(final)), 1),
        "p5_final":      round(float(np.percentile(final, 5)), 1),
        "p25_final":     round(float(np.percentile(final, 25)), 1),
        "p75_final":     round(float(np.percentile(final, 75)), 1),
        "p95_final":     round(float(np.percentile(final, 95)), 1),
        "mean_final":    round(float(final.mean()), 1),
        "prob_profit":   round(float((final > STARTING_BANK).mean() * 100), 1),
        "prob_2x":       round(float((final > STARTING_BANK * 2).mean() * 100), 1),
        "prob_5x":       round(float((final > STARTING_BANK * 5).mean() * 100), 1),
        "prob_ruin":     round(float((final < STARTING_BANK * 0.20).mean() * 100), 2),
        # Drawdown
        "mdd_median":    round(float(np.median(mdd) * 100), 1),
        "mdd_p75":       round(float(np.percentile(mdd, 75) * 100), 1),
        "mdd_p95":       round(float(np.percentile(mdd, 95) * 100), 1),
        "mdd_worst":     round(float(mdd.min() * 100), 1),
        # Risk-adjusted
        "sharpe":        round(sharpe_ratio(geo_ret), 3),
        "sortino":       round(sortino_ratio(geo_ret), 3),
    }

    return equity, stats


# ─────────────────────────────────────────────────────────────────────────────
# RAPORTARE CONSOLA
# ─────────────────────────────────────────────────────────────────────────────

def print_full_report(all_results: dict):
    W = 108
    print("\n" + "═" * W)
    print(f"{'OXIANO — MONTE CARLO SIMULATION':^{W}}")
    print(f"{'100,000 iteratii × 500 pariuri | Banca initiala: 1,000 RON':^{W}}")
    print("═" * W)

    for tier_name, tier_data in all_results.items():
        p = TIERS[tier_name]["accuracy"]
        print(f"\n  ▶  TIER: {tier_name}  |  Acuratete: {p * 100:.1f}%")
        print("  " + "─" * (W - 2))

        hdr = (f"  {'Scenariu':<34} {'EV%':>6} {'Kelly':>7} {'Bet%':>6}"
               f"  {'P(Profit)':>9} {'P(2x)':>6} {'P(Ruina)':>8}"
               f"  {'MDD med':>8} {'MDD p95':>8}"
               f"  {'Sharpe':>7} {'Sortino':>8}")
        print(hdr)
        print("  " + "─" * (W - 2))

        for scenario, s in tier_data.items():
            if not s["viable"]:
                ev_str = f"{s['ev_pct']:>+6.2f}%"
                print(f"  {scenario:<34} {ev_str}  "
                      f"{'— EV NEGATIV — nu se pariaza la aceste cote —':>68}")
            else:
                print(
                    f"  {scenario:<34}"
                    f"  {s['ev_pct']:>+5.2f}%"
                    f"  {s['full_kelly']:>5.1f}%"
                    f"  {s['bet_pct']:>5.2f}%"
                    f"  {s['prob_profit']:>8.1f}%"
                    f"  {s['prob_2x']:>5.1f}%"
                    f"  {s['prob_ruin']:>7.2f}%"
                    f"  {s['mdd_median']:>+7.1f}%"
                    f"  {s['mdd_p95']:>+7.1f}%"
                    f"  {s['sharpe']:>7.3f}"
                    f"  {s['sortino']:>7.3f}"
                )

    print("\n" + "═" * W)
    print("  LEGENDA COLOANE:")
    print("  EV%      = Expected Value per pariu (pozitiv = avantaj matematic)")
    print("  Kelly    = Kelly Criterion complet recomandat (% din banca)")
    print("  Bet%     = Fractional Kelly efectiv utilizat in simulare")
    print("  P(Profit)= % simulari profitabile dupa 500 pariuri")
    print("  P(2x)    = % simulari care dubleaza banca")
    print("  P(Ruina) = % simulari care pierd >80% din banca")
    print("  MDD med  = Maximum Drawdown median (cea mai lunga serie negativa)")
    print("  MDD p95  = Maximum Drawdown la percentila 95 (worst case realist)")
    print("  Sharpe   = Randament / volatilitate totala  (>1=bun, >2=excelent)")
    print("  Sortino  = Randament / volatilitate NEGATIVA (>1=bun, >3=excelent)")
    print("═" * W)


# ─────────────────────────────────────────────────────────────────────────────
# VIZUALIZARI
# ─────────────────────────────────────────────────────────────────────────────

DARK_BG   = "#0f172a"
CARD_BG   = "#1e293b"
TEXT      = "#e2e8f0"
GRID_COL  = "#334155"
GOLD      = "#f59e0b"
GREEN     = "#10b981"
RED       = "#ef4444"
BLUE      = "#60a5fa"


def _style():
    plt.rcParams.update({
        "figure.facecolor":  DARK_BG,
        "axes.facecolor":    CARD_BG,
        "axes.edgecolor":    GRID_COL,
        "axes.labelcolor":   TEXT,
        "axes.titlecolor":   TEXT,
        "xtick.color":       TEXT,
        "ytick.color":       TEXT,
        "text.color":        TEXT,
        "grid.color":        GRID_COL,
        "grid.linestyle":    "--",
        "grid.alpha":        0.4,
        "font.family":       "monospace",
        "axes.spines.top":   False,
        "axes.spines.right": False,
    })


def chart_trajectory(equities_dict: dict, filename: str):
    """
    Grafic 1: Profit Trajectory cu benzi percentile (5/25/50/75/95).
    Un subplot per scenariu viabil.
    """
    _style()
    viable = {k: v for k, v in equities_dict.items() if v[0] is not None}
    n      = len(viable)
    if n == 0:
        return

    fig, axes = plt.subplots(1, n, figsize=(6 * n, 5), facecolor=DARK_BG)
    if n == 1:
        axes = [axes]

    bets_axis = np.arange(1, N_BETS + 1)

    for ax, (label, (equity, stats)) in zip(axes, viable.items()):
        p5  = np.percentile(equity, 5,  axis=0)
        p25 = np.percentile(equity, 25, axis=0)
        p50 = np.percentile(equity, 50, axis=0)
        p75 = np.percentile(equity, 75, axis=0)
        p95 = np.percentile(equity, 95, axis=0)

        color = GOLD if "1.70" in label else BLUE

        ax.fill_between(bets_axis, p5,  p95, alpha=0.12, color=color)
        ax.fill_between(bets_axis, p25, p75, alpha=0.25, color=color)
        ax.plot(bets_axis, p50, color=color, linewidth=2.5, label=f"Median: {stats['median_final']:.0f} RON")
        ax.plot(bets_axis, p95, color=color, linewidth=1.0, alpha=0.5, linestyle="--", label=f"P95: {stats['p95_final']:.0f} RON")
        ax.plot(bets_axis, p5,  color=RED,   linewidth=1.0, alpha=0.5, linestyle="--", label=f"P5:  {stats['p5_final']:.0f} RON")
        ax.axhline(STARTING_BANK, color=TEXT, linewidth=0.8, alpha=0.4, linestyle=":")

        ax.set_title(f"{label}", fontsize=11, pad=10)
        ax.set_xlabel("Pariuri", fontsize=9)
        ax.set_ylabel("Banca (RON)", fontsize=9)
        ax.yaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{x:,.0f}"))
        ax.legend(fontsize=8, framealpha=0.2)
        ax.grid(True, axis="y")

        # Annotatie EV si Sharpe
        ax.text(0.98, 0.04,
                f"EV: {stats['ev_pct']:+.2f}% | Sharpe: {stats['sharpe']:.2f} | Sortino: {stats['sortino']:.2f}",
                transform=ax.transAxes, ha="right", va="bottom",
                fontsize=8, color=TEXT, alpha=0.7)

    fig.suptitle("Profit Trajectory — Monte Carlo 100,000 simulari",
                 fontsize=13, color=TEXT, y=1.02)
    plt.tight_layout()
    path = os.path.join(OUT_DIR, filename)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"    Salvat: {path}")


def chart_drawdown(equities_dict: dict, filename: str):
    """
    Grafic 2: Distributia Maximum Drawdown per scenariu viabil.
    """
    _style()
    viable = {k: v for k, v in equities_dict.items() if v[0] is not None}
    n      = len(viable)
    if n == 0:
        return

    fig, axes = plt.subplots(1, n, figsize=(5 * n, 4), facecolor=DARK_BG)
    if n == 1:
        axes = [axes]

    for ax, (label, (equity, stats)) in zip(axes, viable.items()):
        mdd_vals = max_drawdown_batch(equity) * 100  # in procente
        color = GOLD if "1.70" in label else BLUE

        ax.hist(mdd_vals, bins=80, color=color, alpha=0.7, edgecolor="none")
        ax.axvline(stats["mdd_median"], color=GREEN,  linewidth=1.8, linestyle="--",
                   label=f"Median: {stats['mdd_median']:.1f}%")
        ax.axvline(stats["mdd_p95"],   color=RED,    linewidth=1.8, linestyle="--",
                   label=f"P95:    {stats['mdd_p95']:.1f}%")

        ax.set_title(f"MDD Distribution — {label}", fontsize=10)
        ax.set_xlabel("Maximum Drawdown (%)", fontsize=9)
        ax.set_ylabel("Frecventa", fontsize=9)
        ax.legend(fontsize=8, framealpha=0.2)
        ax.grid(True, axis="y")

    fig.suptitle("Maximum Drawdown — Distributie pe 100,000 simulari",
                 fontsize=13, color=TEXT, y=1.02)
    plt.tight_layout()
    path = os.path.join(OUT_DIR, filename)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"    Salvat: {path}")


def chart_final_distribution(equities_dict: dict, filename: str):
    """
    Grafic 3: Distributia bancii finale vs banca initiala (1000 RON).
    """
    _style()
    viable = {k: v for k, v in equities_dict.items() if v[0] is not None}
    n      = len(viable)
    if n == 0:
        return

    fig, axes = plt.subplots(1, n, figsize=(5 * n, 4), facecolor=DARK_BG)
    if n == 1:
        axes = [axes]

    for ax, (label, (equity, stats)) in zip(axes, viable.items()):
        final = equity[:, -1]
        color = GOLD if "1.70" in label else BLUE

        # Clip la percentila 99 pentru vizibilitate
        cap = np.percentile(final, 99)
        ax.hist(final[final <= cap], bins=100, color=color, alpha=0.7, edgecolor="none")
        ax.axvline(STARTING_BANK,          color=TEXT,  linewidth=1.2, alpha=0.5,
                   linestyle=":", label="Start: 1,000")
        ax.axvline(stats["median_final"],  color=GREEN, linewidth=1.8, linestyle="--",
                   label=f"Median: {stats['median_final']:,.0f}")
        ax.axvline(stats["p5_final"],      color=RED,   linewidth=1.5, linestyle="--",
                   label=f"P5 (risc): {stats['p5_final']:,.0f}")

        ax.set_title(f"Final Bankroll — {label}", fontsize=10)
        ax.set_xlabel("Banca finala (RON)", fontsize=9)
        ax.set_ylabel("Frecventa", fontsize=9)
        ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{x:,.0f}"))
        ax.legend(fontsize=8, framealpha=0.2)
        ax.grid(True, axis="y")

        # Annotatie
        ax.text(0.98, 0.97,
                f"P(Profit): {stats['prob_profit']:.1f}%\nP(Ruina):  {stats['prob_ruin']:.2f}%",
                transform=ax.transAxes, ha="right", va="top",
                fontsize=8.5, color=TEXT,
                bbox=dict(boxstyle="round,pad=0.3", facecolor=DARK_BG, alpha=0.6))

    fig.suptitle("Distributia Bancii Finale — Monte Carlo 100,000 simulari",
                 fontsize=13, color=TEXT, y=1.02)
    plt.tight_layout()
    path = os.path.join(OUT_DIR, filename)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=DARK_BG)
    plt.close()
    print(f"    Salvat: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("\n>>> Oxiano — Monte Carlo Simulation")
    print(f"    Iteratii: {N_SIM:,} | Pariuri/sezon: {N_BETS} | Banca: {STARTING_BANK:,.0f} RON")
    print(f"    Scenarii cote: {list(ODDS_SCENARIOS.keys())}")
    print(f"    Kelly fractions: {list(KELLY_FRACTIONS.keys())}\n")

    all_results   = {}   # pentru raport consola
    all_equities  = {}   # pentru grafice

    for tier_name, tier_info in TIERS.items():
        p     = tier_info["accuracy"]
        print(f">>> Simulez: {tier_name} (p={p})")
        all_results[tier_name]  = {}
        all_equities[tier_name] = {}

        for odds_label, odds_val in ODDS_SCENARIOS.items():
            for kf_label, kf_val in KELLY_FRACTIONS.items():
                key = f"{odds_label} | {kf_label}"
                print(f"    {key}...", end=" ", flush=True)

                equity, stats = simulate_scenario(p, odds_val, kf_val)
                all_results[tier_name][key]  = stats
                all_equities[tier_name][key] = (equity, stats)

                if stats["viable"]:
                    print(f"EV={stats['ev_pct']:+.2f}%  "
                          f"P(profit)={stats['prob_profit']:.1f}%  "
                          f"Sharpe={stats['sharpe']:.3f}")
                else:
                    print(f"EV={stats['ev_pct']:+.2f}% — NO EDGE")

    # ── Raport consola ────────────────────────────────────────────────────────
    print_full_report(all_results)

    # ── Grafice per tier ──────────────────────────────────────────────────────
    print("\n>>> Generez grafice...")
    for tier_name, equities in all_equities.items():
        safe  = tier_name.replace(" ", "_").replace("/", "").replace("%", "pct").replace(">=", "gte")
        chart_trajectory(equities,         f"trajectory_{safe}.png")
        chart_drawdown(equities,           f"drawdown_{safe}.png")
        chart_final_distribution(equities, f"distribution_{safe}.png")

    # ── Insight-uri cheie ─────────────────────────────────────────────────────
    print("\n" + "═" * 80)
    print("  INSIGHT-URI CHEIE")
    print("═" * 80)

    for tier_name, tier_data in all_results.items():
        p = TIERS[tier_name]["accuracy"]
        print(f"\n  {tier_name}  (acuratete {p*100:.1f}%):")

        for scenario, s in tier_data.items():
            if "1.70" not in scenario:
                continue
            if s["viable"]:
                print(f"    {scenario}:")
                print(f"      → Banca medianta dupa 500 pariuri: {s['median_final']:,.0f} RON "
                      f"(+{(s['median_final']/STARTING_BANK - 1)*100:.0f}% din {STARTING_BANK:.0f} RON)")
                print(f"      → P(profit): {s['prob_profit']:.1f}% | P(dubla banca): {s['prob_2x']:.1f}%")
                print(f"      → MDD realist (p95): {s['mdd_p95']:.1f}% | Worst case: {s['mdd_worst']:.1f}%")
                print(f"      → Sharpe: {s['sharpe']:.3f} | Sortino: {s['sortino']:.3f}")
                print(f"      → Bet recomandat: {s['bet_pct']:.2f}% din banca per pariu")

    for tier_name, tier_data in all_results.items():
        p = TIERS[tier_name]["accuracy"]
        non_viable = [k for k, v in tier_data.items() if not v["viable"]]
        if non_viable:
            print(f"\n  ⚠  {tier_name}: cotele 1.25 si 1.30 au EV NEGATIV la {p*100:.1f}% acuratete.")
            print(f"     La odds 1.25 ai nevoie de acuratete >{(1/1.25)*100:.1f}% pentru EV pozitiv.")
            print(f"     La odds 1.30 ai nevoie de acuratete >{(1/1.30)*100:.1f}% pentru EV pozitiv.")

    print("\n" + "═" * 80)
    print(f"  Grafice salvate in: {OUT_DIR}")
    print("═" * 80 + "\n")


if __name__ == "__main__":
    main()
