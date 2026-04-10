'use client'

import { useState, useEffect } from 'react'
import { detectLang, t } from './i18n'
import axios from 'axios'
import { getUser, logout, type AuthUser } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getNextDays(n: number): string[] {
  const days = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatDateRO(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

function getDayLabel(isoDate: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const after = new Date(Date.now() + 172800000).toISOString().split('T')[0]
  if (isoDate === today) return 'Azi'
  if (isoDate === tomorrow) return 'Mâine'
  if (isoDate === after) return 'Poimâine'
  return formatDateRO(isoDate)
}

interface League { id: number; name: string; country: string; flag: string; confederation: string; rating: number }
interface Fixture { id: number; home: string; away: string; home_id: number; away_id: number; date: string; time?: string }
interface StandingRow {
  position: number; team: string; team_id: number; played: number
  won: number; draw: number; lost: number
  goals_for: number; goals_against: number; goal_diff: number; points: number; form: string
}
interface Prediction {
  home_team: string; away_team: string
  prediction: { home_win: number; draw: number; away_win: number; method: string }
  top_scores: Array<{ score: string; probability: number }>
  expected_goals: { home: number; away: number }
  home_stats: any; away_stats: any
  markets?: any
  model_breakdown?: any
}

function getProbColor(p: number) {
  if (p >= 60) return '#10b981'
  if (p >= 40) return '#f59e0b'
  return '#ef4444'
}

// ── Calcul scor de încredere ──────────────────────────────────────────────────
function calcConfidence(home_w: number, draw: number, away_w: number): { score: number; label: string; color: string } {
  const max = Math.max(home_w, draw, away_w)
  const second = [home_w, draw, away_w].sort((a, b) => b - a)[1]
  const gap = max - second
  let score = Math.round(40 + gap * 1.2 + (max - 33) * 0.5)
  score = Math.min(98, Math.max(42, score))
  const label = score >= 80 ? 'Foarte ridicată' : score >= 65 ? 'Ridicată' : score >= 50 ? 'Medie' : 'Scăzută'
  const color = score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444'
  return { score, label, color }
}

// ── Poisson helper ────────────────────────────────────────────────────────────
function poissonCDF(lambda: number, k: number): number {
  // P(X <= k) pentru distributia Poisson cu medie lambda
  let prob = 0, term = Math.exp(-lambda)
  for (let i = 0; i <= k; i++) {
    prob += term
    term *= lambda / (i + 1)
  }
  return Math.min(prob, 1)
}
function pOver(lambda: number, k: number) { // P(X > k)
  return Math.round((1 - poissonCDF(lambda, k)) * 100)
}

// ── Calcul toate piețele disponibile ─────────────────────────────────────────
function calcAllMarkets(prediction: Prediction) {
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw   = pred.draw ?? 0
  const away_w = pred.away_win ?? 0
  const xgHome  = prediction.expected_goals?.home ?? 1.4
  const xgAway  = prediction.expected_goals?.away ?? 1.2
  const totalXg = xgHome + xgAway

  // Full-time Over/Under (Poisson)
  const over05 = pOver(totalXg, 0)
  const over15 = pOver(totalXg, 1)
  const over25 = pOver(totalXg, 2)
  const over35 = pOver(totalXg, 3)
  const over45 = pOver(totalXg, 4)

  // BTTS (independent Poisson pentru fiecare echipă)
  const pHomeSc = Math.round((1 - poissonCDF(xgHome, 0)) * 100)
  const pAwaySc = Math.round((1 - poissonCDF(xgAway, 0)) * 100)
  const btts    = Math.round(pHomeSc * pAwaySc / 100)
  const bttsNo  = 100 - btts

  // Șansă dublă
  const dc1x = Math.min(97, Math.round((home_w + draw) * 0.97))
  const dcx2 = Math.min(97, Math.round((draw + away_w) * 0.97))
  const dc12 = Math.min(97, Math.round((home_w + away_w) * 0.97))

  // Pauză — xG la pauză ≈ 42% din total
  const htH = xgHome * 0.42
  const htA = xgAway * 0.42
  const htTotal = htH + htA

  const htOver05 = pOver(htTotal, 0)
  const htOver15 = pOver(htTotal, 1)
  const htOver25 = pOver(htTotal, 2)

  // Rezultat pauză (Poisson bivariate simplificat)
  const pHtHomeSc = 1 - poissonCDF(htH, 0)  // P(gazdă înscrie >= 1 la pauză)
  const pHtAwaySc = 1 - poissonCDF(htA, 0)
  const pHtBoth   = pHtHomeSc * pHtAwaySc
  const pHtNone   = poissonCDF(htH, 0) * poissonCDF(htA, 0)
  // P(HT 1-0 sau 2-0...) ≈ P(home >= 1) * P(away = 0)
  const htHome = Math.round(pHtHomeSc * poissonCDF(htA, 0) * 100)
  const htDraw = Math.round((pHtNone + pHtBoth) * 100)  // 0-0 sau ambii înscriu egal
  const htAway = Math.round(100 - htHome - htDraw)

  const margin = 1.08
  const odd = (p: number) => (100 / Math.max(p, 1) * margin).toFixed(2)

  return [
    {
      category: '⚽ Rezultat meci (1X2)', items: [
        { name: `1 — Victorie ${prediction.home_team}`, probability: home_w, odds: odd(home_w) },
        { name: 'X — Egal', probability: draw, odds: odd(draw) },
        { name: `2 — Victorie ${prediction.away_team}`, probability: away_w, odds: odd(away_w) },
      ]
    },
    {
      category: '🎯 Șansă dublă', items: [
        { name: `1X — ${prediction.home_team} sau Egal`, probability: dc1x, odds: odd(dc1x) },
        { name: `X2 — Egal sau ${prediction.away_team}`, probability: dcx2, odds: odd(dcx2) },
        { name: `12 — Fără egal`, probability: dc12, odds: odd(dc12) },
      ]
    },
    {
      category: '📊 Total goluri (meci întreg)', items: [
        { name: 'Over 0.5 goluri', probability: over05, odds: odd(over05) },
        { name: 'Under 0.5 goluri', probability: 100 - over05, odds: odd(100 - over05) },
        { name: 'Over 1.5 goluri', probability: over15, odds: odd(over15) },
        { name: 'Under 1.5 goluri', probability: 100 - over15, odds: odd(100 - over15) },
        { name: 'Over 2.5 goluri', probability: over25, odds: odd(over25) },
        { name: 'Under 2.5 goluri', probability: 100 - over25, odds: odd(100 - over25) },
        { name: 'Over 3.5 goluri', probability: over35, odds: odd(over35) },
        { name: 'Under 3.5 goluri', probability: 100 - over35, odds: odd(100 - over35) },
        { name: 'Over 4.5 goluri', probability: over45, odds: odd(over45) },
        { name: 'Under 4.5 goluri', probability: 100 - over45, odds: odd(100 - over45) },
      ]
    },
    {
      category: '🔄 Ambele înscriu (BTTS)', items: [
        { name: 'BTTS — Da', probability: btts, odds: odd(btts) },
        { name: 'BTTS — Nu', probability: bttsNo, odds: odd(bttsNo) },
      ]
    },
    {
      category: '⏸️ Pauză — Total goluri', items: [
        { name: 'HT Over 0.5', probability: htOver05, odds: odd(htOver05) },
        { name: 'HT Under 0.5', probability: 100 - htOver05, odds: odd(100 - htOver05) },
        { name: 'HT Over 1.5', probability: htOver15, odds: odd(htOver15) },
        { name: 'HT Under 1.5', probability: 100 - htOver15, odds: odd(100 - htOver15) },
        { name: 'HT Over 2.5', probability: htOver25, odds: odd(htOver25) },
        { name: 'HT Under 2.5', probability: 100 - htOver25, odds: odd(100 - htOver25) },
      ]
    },
    {
      category: '🕐 Rezultat la pauză', items: [
        { name: `HT 1 — ${prediction.home_team} conduce`, probability: htHome, odds: odd(htHome) },
        { name: 'HT X — Egal la pauză', probability: htDraw, odds: odd(htDraw) },
        { name: `HT 2 — ${prediction.away_team} conduce`, probability: Math.max(htAway, 1), odds: odd(Math.max(htAway, 1)) },
      ]
    },
  ]
}

// ── Bet Value — identifică pariuri cu valoare față de piață ──────────────────
function calcBetValue(prediction: Prediction) {
  const markets = calcAllMarkets(prediction)
  const margin  = 1.08
  const results: Array<{
    name: string; probability: number; our_odds: string
    market_odds: number; ev: number; value_pct: number; rating: string; color: string
  }> = []

  for (const group of markets) {
    for (const item of group.items) {
      const p         = item.probability / 100
      const our_odds  = parseFloat(item.odds)
      // Cota "corectă" fără marjă de risc: 1/p
      // Piața tipică adaugă 8-12% marjă → implied_prob = p / 1.10
      // Dacă modelul nostru are p > implied_prob_piata → value pozitiv
      const mkt_margin   = 1.10                    // marja medie bookmaker
      const implied_mkt  = p / mkt_margin          // prob implicita la bookmaker
      const fair_mkt_odd = 1 / implied_mkt         // cota justa de la bookmaker
      // EV = p * fair_mkt_odd - 1 (cat castigi in medie per 1 unitate pariu)
      const ev         = Math.round((p * fair_mkt_odd - 1) * 100) / 100
      // Value% = cat de mult depaseste modelul marja pietei
      const value_pct  = Math.round((p - implied_mkt) * 100)

      if (value_pct > 0 && p >= 0.45) {
        const rating = value_pct >= 8 ? '🔥 Value înalt' : value_pct >= 4 ? '✅ Value bun' : '⚡ Value mic'
        const color  = value_pct >= 8 ? '#10b981' : value_pct >= 4 ? '#f59e0b' : '#6b7280'
        results.push({
          name: item.name,
          probability: item.probability,
          our_odds: item.odds,
          market_odds: parseFloat(fair_mkt_odd.toFixed(2)),
          ev,
          value_pct,
          rating,
          color,
        })
      }
    }
  }

  return results.sort((a, b) => b.value_pct - a.value_pct).slice(0, 8)
}

// ── Top 3 cele mai sigure pariuri ─────────────────────────────────────────────
function getTop3Bets(prediction: Prediction) {
  const markets = calcAllMarkets(prediction)
  const all: Array<{ name: string; probability: number; odds: string }> = []
  for (const group of markets) {
    for (const item of group.items) {
      all.push(item)
    }
  }
  return all
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map(b => ({
      ...b,
      confidence: b.probability >= 70 ? '🟢 Sigur' : b.probability >= 55 ? '🟡 Moderat' : '🔴 Risc',
    }))
}

// ── Share WhatsApp ────────────────────────────────────────────────────────────
function shareOnWhatsApp(prediction: Prediction, fixture: Fixture) {
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw = pred.draw ?? 0
  const away_w = pred.away_win ?? 0
  const conf = calcConfidence(home_w, draw, away_w)
  const top3 = getTop3Bets(prediction)
  const text = `⚽ *OXIANO — Predicție AI*\n\n` +
    `🏟️ *${prediction.home_team}* vs *${prediction.away_team}*\n` +
    `📅 ${getDayLabel(fixture.date)} · ${formatDateRO(fixture.date)}${fixture.time ? ` · 🕐 ${fixture.time}` : ''}\n` +
    `🎯 Încredere AI: *${conf.score}%* (${conf.label})\n\n` +
    `📊 *Probabilități:*\n` +
    `1️⃣ ${prediction.home_team}: *${home_w}%* (cotă ~${(100/Math.max(home_w,1)*1.08).toFixed(2)})\n` +
    `🤝 Egal: *${draw}%* (cotă ~${(100/Math.max(draw,1)*1.08).toFixed(2)})\n` +
    `2️⃣ ${prediction.away_team}: *${away_w}%* (cotă ~${(100/Math.max(away_w,1)*1.08).toFixed(2)})\n\n` +
    `🏆 *Top 3 pariuri recomandate:*\n` +
    top3.map((b, i) => `${i+1}. ${b.name} — ${b.probability}% ${b.confidence}`).join('\n') + '\n\n' +
    `🔮 _Generat de Oxiano_\n🌐 oxiano.com`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

function shareOnTelegram(prediction: Prediction, fixture: Fixture) {
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw = pred.draw ?? 0
  const away_w = pred.away_win ?? 0
  const conf = calcConfidence(home_w, draw, away_w)
  const top3 = getTop3Bets(prediction)
  const text = `⚽ OXIANO — Predicție AI\n\n` +
    `🏟️ ${prediction.home_team} vs ${prediction.away_team}\n` +
    `📅 ${getDayLabel(fixture.date)} · ${formatDateRO(fixture.date)}${fixture.time ? ` · ${fixture.time}` : ''}\n` +
    `🎯 Încredere AI: ${conf.score}% (${conf.label})\n\n` +
    `📊 Probabilități:\n` +
    `1. ${prediction.home_team}: ${home_w}%\n` +
    `X. Egal: ${draw}%\n` +
    `2. ${prediction.away_team}: ${away_w}%\n\n` +
    `🏆 Top 3 pariuri:\n` +
    top3.map((b, i) => `${i+1}. ${b.name} — ${b.probability}%`).join('\n') + '\n\n' +
    `🔮 Oxiano\n🌐 oxiano.com`
  window.open(`https://t.me/share/url?url=oxiano.com&text=${encodeURIComponent(text)}`, '_blank')
}

function FormBadge({ result }: { result: string }) {
  const cfg: Record<string, string> = {
    W: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    D: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    L: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold font-mono ${cfg[result] || cfg.D}`}>
      {result}
    </span>
  )
}

function StatBar({ label, homeVal, awayVal, format = (v: number) => v.toFixed(2) }: {
  label: string; homeVal: number; awayVal: number; format?: (v: number) => string
}) {
  const total = homeVal + awayVal || 1
  const homeW = Math.round((homeVal / total) * 100)
  const awayW = 100 - homeW
  const homeBetter = homeVal >= awayVal
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className={homeBetter ? 'text-blue-300 font-bold' : 'text-gray-400'}>{format(homeVal)}</span>
        <span className="text-gray-500 uppercase tracking-widest text-[10px]">{label}</span>
        <span className={!homeBetter ? 'text-blue-300 font-bold' : 'text-gray-400'}>{format(awayVal)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
        <div className="h-full rounded-l-full transition-all" style={{ width: `${homeW}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
        <div className="h-full rounded-r-full transition-all" style={{ width: `${awayW}%`, background: 'linear-gradient(90deg, #f97316, #fb923c)' }} />
      </div>
    </div>
  )
}

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center" style={{ maxWidth: '30%' }}>
      <div className="relative h-24 flex items-end justify-center mb-2">
        <div className="w-12 rounded-t-lg transition-all duration-700"
          style={{ height: `${Math.max(value, 5)}%`, backgroundColor: color, opacity: 0.9 }} />
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}%</div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1" style={{ fontSize: '9px', wordBreak: 'break-word' }}>{label}</div>
    </div>
  )
}

function MarketRow({ market }: { market: any }) {
  const color = getProbColor(market.probability)
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
      <span className="text-xs text-gray-400 flex-1 truncate">{market.name}</span>
      <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(market.probability, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold font-mono w-10 text-right" style={{ color }}>{market.probability}%</span>
      {market.odds && <span className="text-[10px] text-gray-600 w-10 text-right font-mono">~{market.odds}</span>}
    </div>
  )
}

function StandingsTable({ standings, highlightTeams }: { standings: StandingRow[]; highlightTeams: string[] }) {
  if (!standings.length) return (
    <div className="text-center py-8 text-gray-600 text-sm">Clasamentul nu e disponibil pentru această ligă</div>
  )
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', tableLayout: 'fixed' }} className="text-xs font-mono">
        <thead>
          <tr className="text-gray-600 uppercase tracking-widest border-b border-gray-800">
            <th className="text-left pb-2 w-6">#</th>
            <th className="text-left pb-2">Echipă</th>
            <th className="text-center pb-2 w-8">J</th>
            <th className="text-center pb-2 w-8">V</th>
            <th className="text-center pb-2 w-8">E</th>
            <th className="text-center pb-2 w-8">Î</th>
            <th className="text-center pb-2 w-12">GD</th>
            <th className="text-center pb-2 w-8 font-bold text-blue-500">Pct</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const isHighlighted = highlightTeams.some(t =>
              row.team.toLowerCase().includes(t.toLowerCase().slice(0, 5)) ||
              t.toLowerCase().includes(row.team.toLowerCase().slice(0, 5))
            )
            return (
              <tr key={row.position}
                className={`border-b border-gray-800/30 transition-colors ${isHighlighted ? 'bg-blue-900/20 text-white' : 'text-gray-400 hover:bg-gray-800/20'}`}>
                <td className="py-1.5 text-gray-600">{row.position}</td>
                <td className="py-1.5 font-semibold truncate max-w-[100px]">
                  {isHighlighted && <span className="text-blue-400 mr-1">›</span>}
                  {row.team}
                </td>
                <td className="py-1.5 text-center">{row.played}</td>
                <td className="py-1.5 text-center text-emerald-500">{row.won}</td>
                <td className="py-1.5 text-center text-gray-500">{row.draw}</td>
                <td className="py-1.5 text-center text-red-500">{row.lost}</td>
                <td className={`py-1.5 text-center ${row.goal_diff > 0 ? 'text-emerald-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                </td>
                <td className="py-1.5 text-center font-bold text-white">{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TeamStatsCard({ stats, teamName, color }: { stats: any; teamName: string; color: string }) {
  if (!stats) return null
  const form = stats.form || []
  const xgFor = stats.xg_for_history || stats.xg_for || []
  const xgAg = stats.xg_against_history || stats.xg_against || []
  const avgXgFor = Array.isArray(xgFor) ? xgFor.reduce((a: number, b: number) => a + b, 0) / (xgFor.length || 1) : xgFor
  const avgXgAg = Array.isArray(xgAg) ? xgAg.reduce((a: number, b: number) => a + b, 0) / (xgAg.length || 1) : xgAg
  const wins = form.filter((r: string) => r === 'W').length
  const draws = form.filter((r: string) => r === 'D').length
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-display text-base text-white tracking-wide truncate">{teamName}</h3>
      </div>
      {form.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Ultimele meciuri</div>
          <div className="flex gap-1">{form.map((r: string, i: number) => <FormBadge key={i} result={r} />)}</div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {wins}V · {draws}E · {form.length - wins - draws}Î
            <span className="ml-2 text-blue-400">{Math.round((wins / (form.length || 1)) * 100)}% win rate</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'xG For', value: avgXgFor.toFixed(2), icon: '⚽' },
          { label: 'xG Against', value: avgXgAg.toFixed(2), icon: '🛡️' },
          { label: 'Goluri/meci', value: stats.goals_avg?.toFixed(2) || avgXgFor.toFixed(2), icon: '📊' },
          { label: 'Elo Rating', value: stats.elo_rating || '—', icon: '📈' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest">{s.icon} {s.label}</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
      {Array.isArray(xgFor) && xgFor.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">xG ultimele meciuri</div>
          <div className="flex items-end gap-1 h-10">
            {xgFor.slice(-5).map((v: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t-sm" style={{ height: `${Math.min(v * 25, 40)}px`, backgroundColor: color, opacity: 0.7 }} />
              </div>
            ))}
          </div>
          <div className="text-[9px] text-gray-700 text-center mt-1 font-mono">meciuri recente →</div>
        </div>
      )}
    </div>
  )
}

// ── Comparator cotă reală introdusă de user ───────────────────────────────────
function OddsComparator({ prediction }: { prediction: Prediction }) {
  const [inputOdd, setInputOdd] = useState('')
  const [market, setMarket]     = useState('1')
  const pred = prediction.prediction || {}
  const probMap: Record<string, number> = {
    '1': pred.home_win ?? 0,
    'X': pred.draw ?? 0,
    '2': pred.away_win ?? 0,
  }
  const prob     = (probMap[market] ?? 0) / 100
  const odd      = parseFloat(inputOdd)
  const hasValue = !isNaN(odd) && odd > 0 && prob > 0
  const impliedP = hasValue ? 1 / odd : 0
  const edge     = hasValue ? Math.round((prob - impliedP) * 100) : 0
  const ev       = hasValue ? Math.round((prob * odd - 1) * 100) / 100 : 0
  const isValue  = edge > 0

  return (
    <div className="mt-5 pt-5 border-t border-gray-800/50">
      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3 text-center">🔍 Verifică cota ta — Value sau nu?</div>
      <div className="flex gap-2 mb-3">
        {['1','X','2'].map(m => (
          <button key={m} onClick={() => setMarket(m)}
            className="flex-1 py-2 rounded-xl text-sm font-bold font-mono transition-all"
            style={{
              background: market === m ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${market === m ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: market === m ? '#60a5fa' : '#6b7280',
            }}>
            {m === '1' ? `1 ${prediction.home_team.split(' ')[0]}` : m === '2' ? `2 ${prediction.away_team.split(' ')[0]}` : 'X Egal'}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="number" step="0.01" min="1.01" placeholder="Cota la bookmaker (ex: 2.15)"
          value={inputOdd}
          onChange={e => setInputOdd(e.target.value)}
          className="flex-1 bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
        />
      </div>
      {hasValue && (
        <div className="mt-3 p-4 rounded-xl" style={{
          background: isValue ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isValue ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <div className="text-center mb-3">
            <div className="text-2xl font-bold font-mono" style={{ color: isValue ? '#10b981' : '#ef4444' }}>
              {isValue ? '✅ VALUE BET' : '❌ Fără value'}
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-1">
              Probabilitate model: {Math.round(prob*100)}% · Prob. implicită cotă: {Math.round(impliedP*100)}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest">Edge față de cotă</div>
              <div className="text-base font-bold font-mono" style={{ color: isValue ? '#10b981' : '#ef4444' }}>
                {edge > 0 ? '+' : ''}{edge}%
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest">EV / 10 RON</div>
              <div className="text-base font-bold font-mono" style={{ color: ev > 0 ? '#10b981' : '#ef4444' }}>
                {ev > 0 ? '+' : ''}{(ev * 10).toFixed(2)} RON
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PredictionDisplay({ prediction, fixture, standings }: { prediction: Prediction; fixture: Fixture; standings: StandingRow[] }) {
  const [activeTab, setActiveTab] = useState('markets')
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw   = pred.draw ?? 0
  const away_w = pred.away_win ?? 0
  const breakdown = prediction.model_breakdown || {}
  const conf = calcConfidence(home_w, draw, away_w)
  const allMarkets = calcAllMarkets(prediction)
  const top3 = getTop3Bets(prediction)

  const valueBets = calcBetValue(prediction)

  const tabs = [
    { key: 'markets',   label: '🎯 Pariuri' },
    { key: 'value',     label: `💎 Value${valueBets.length > 0 ? ` (${valueBets.length})` : ''}` },
    { key: 'scores',    label: '⚽ Scoruri' },
    { key: 'stats',     label: '📊 Stats' },
    { key: 'standings', label: '🏆 Clas.' },
    { key: 'models',    label: '🤖 Modele' },
  ]

  return (
    <div className="fade-in" style={{ width: '100%', overflow: 'hidden' }}>
      {/* Card principal meci */}
      <div className="card p-4 mb-4" style={{ overflow: 'hidden' }}>
        <div className="text-center mb-4">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            {getDayLabel(fixture.date)} · {formatDateRO(fixture.date)}{fixture.time ? ` · 🕐 ${fixture.time}` : ''}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-right" style={{ flex: 1, minWidth: 0 }}>
              <div className="font-display text-base text-white tracking-wide truncate">{prediction.home_team}</div>
              <div className="text-xs text-gray-600 font-mono mt-1">GAZDĂ</div>
            </div>
            <div className="shrink-0 px-2 py-1 rounded-lg bg-gray-800/60 border border-gray-700">
              <span className="font-mono text-gray-500 text-sm">VS</span>
            </div>
            <div className="text-left" style={{ flex: 1, minWidth: 0 }}>
              <div className="font-display text-base text-white tracking-wide truncate">{prediction.away_team}</div>
              <div className="text-xs text-gray-600 font-mono mt-1">OASPETE</div>
            </div>
          </div>
        </div>

        <div className="flex justify-around items-end mt-4">
          <ProbBar label={prediction.home_team.split(' ')[0]} value={home_w} color="#3b82f6" />
          <ProbBar label="Egal" value={draw} color="#6b7280" />
          <ProbBar label={prediction.away_team.split(' ')[0]} value={away_w} color="#f97316" />
        </div>

        <div className="mt-3 text-center text-xs font-mono text-gray-700">{pred.method || 'XGBoost + Poisson + Elo'}</div>

        {/* Scor de încredere AI */}
        <div className="flex justify-center mt-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{ borderColor: `${conf.color}40`, backgroundColor: `${conf.color}15` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: conf.color }} />
            <span className="text-xs font-bold font-mono" style={{ color: conf.color }}>
              Încredere AI: {conf.score}%
            </span>
            <span className="text-[10px] text-gray-500">({conf.label})</span>
          </div>
        </div>

        {/* Cote bookmakers */}
        <div className="mt-4 pt-4 border-t border-gray-800/60">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 text-center">💰 Cote estimate bookmakers</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '1 Gazdă', odd: (100/Math.max(home_w,1)*1.08).toFixed(2), color: '#3b82f6' },
              { label: 'X Egal', odd: (100/Math.max(draw,1)*1.08).toFixed(2), color: '#6b7280' },
              { label: '2 Oaspete', odd: (100/Math.max(away_w,1)*1.08).toFixed(2), color: '#f97316' },
            ].map(o => (
              <div key={o.label} className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/30">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{o.label}</div>
                <div className="text-xl font-bold font-mono" style={{ color: o.color }}>{o.odd}</div>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-gray-700 text-center mt-2 font-mono">* Cote estimate cu marjă 8% · Verifică la Betano/bet365</div>
        </div>

        {/* Top 3 pariuri */}
        <div className="mt-4 pt-4 border-t border-gray-800/60">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 text-center">🏆 Top 3 pariuri recomandate</div>
          <div className="space-y-2">
            {top3.map((bet, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#b45309', color: '#000' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-semibold truncate">{bet.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{bet.confidence} · cotă ~{bet.odds}</div>
                </div>
                <div className="text-sm font-bold font-mono shrink-0" style={{ color: getProbColor(bet.probability) }}>
                  {bet.probability}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Butoane share */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => shareOnWhatsApp(prediction, fixture)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
            📤 WhatsApp
          </button>
          <button onClick={() => shareOnTelegram(prediction, fixture)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
            ✈️ Telegram
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4" style={{ overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.key}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-700/50'}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Pariuri — TOATE piețele */}
      {activeTab === 'markets' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          {(prediction.markets && prediction.markets.length > 0) ? (
            prediction.markets.map((m: any, i: number) => (
              <div key={i} className="mb-5">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-blue-900/40" />
                  <span>{m.icon || '📊'} {m.category || m.label}</span>
                  <div className="h-px flex-1 bg-blue-900/40" />
                </div>
                {(m.items || m.markets || []).map((item: any, j: number) => <MarketRow key={j} market={item} />)}
              </div>
            ))
          ) : (
            allMarkets.map((group, gi) => (
              <div key={gi} className="mb-5">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-blue-900/40" />
                  <span>{group.category}</span>
                  <div className="h-px flex-1 bg-blue-900/40" />
                </div>
                {group.items.map((item, ii) => <MarketRow key={ii} market={item} />)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bet Value */}
      {activeTab === 'value' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 text-center">💎 Bet Value — Pariuri cu Valoare Pozitivă</div>
          <div className="text-[10px] text-gray-600 text-center mb-4 font-mono">Modelul AI detectează unde probabilitatea depășește marja bookmaker-ului</div>
          {valueBets.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">Nu există pariuri cu value clar pentru acest meci</div>
          ) : (
            <div className="space-y-3">
              {valueBets.map((bet, i) => (
                <div key={i} className="bg-gray-800/40 rounded-xl p-4 border" style={{ borderColor: `${bet.color}30` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{bet.name}</div>
                      <div className="text-[10px] font-bold mt-0.5" style={{ color: bet.color }}>{bet.rating}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-mono" style={{ color: bet.color }}>+{bet.value_pct}%</div>
                      <div className="text-[10px] text-gray-600 font-mono">edge față de piață</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest">Prob. model</div>
                      <div className="text-sm font-bold font-mono text-white">{bet.probability}%</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest">Cotă estimată</div>
                      <div className="text-sm font-bold font-mono" style={{ color: bet.color }}>{bet.market_odds}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest">EV / unitate</div>
                      <div className="text-sm font-bold font-mono" style={{ color: bet.ev > 0 ? '#10b981' : '#ef4444' }}>
                        {bet.ev > 0 ? '+' : ''}{bet.ev}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-gray-700 text-center mt-3 font-mono px-4">
                * Value calculat față de marja medie bookmaker 10%. EV pozitiv = profitabil pe termen lung statistic. Pariați responsabil.
              </div>
            </div>
          )}

          {/* ── Comparator cotă reală vs. model ───────────────────────── */}
          <OddsComparator prediction={prediction} />
        </div>
      )}

      {/* Tab: Scoruri + Score Matrix */}
      {activeTab === 'scores' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="flex gap-4 mb-4 text-center">
            {[
              { label: 'xG Gazdă', value: prediction.expected_goals?.home?.toFixed(2) ?? '—', color: '#3b82f6' },
              { label: 'xG Oaspete', value: prediction.expected_goals?.away?.toFixed(2) ?? '—', color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-gray-800/40 rounded-xl p-4">
                <div className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Score Matrix — Poisson bivariate */}
          {(() => {
            const lH = prediction.expected_goals?.home ?? 1.4
            const lA = prediction.expected_goals?.away ?? 1.2
            const poi = (l: number, k: number) => {
              let t = Math.exp(-l); for (let i = 0; i < k; i++) t *= l / (i + 1); return t
            }
            const rows = [0,1,2,3,4]
            const maxP = Math.max(...rows.flatMap(h => rows.map(a => poi(lH,h)*poi(lA,a))))
            return (
              <div className="mb-5">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 text-center">🎯 Score Matrix — Probabilitate per scor exact</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono">
                    <thead>
                      <tr>
                        <td className="text-gray-700 text-center pb-1 pr-1">G↓ A→</td>
                        {rows.map(a => <th key={a} className="text-orange-400 text-center pb-1 w-10">{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(h => (
                        <tr key={h}>
                          <td className="text-blue-400 font-bold text-center pr-1 py-0.5">{h}</td>
                          {rows.map(a => {
                            const p = poi(lH, h) * poi(lA, a)
                            const pct = Math.round(p * 100)
                            const intensity = p / maxP
                            const bg = h > a
                              ? `rgba(59,130,246,${intensity * 0.7})`
                              : a > h
                              ? `rgba(249,115,22,${intensity * 0.7})`
                              : `rgba(107,114,128,${intensity * 0.7})`
                            return (
                              <td key={a} className="text-center py-1 rounded" style={{ backgroundColor: bg }}>
                                <span className="text-white font-bold">{pct}%</span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 justify-center mt-2 text-[9px] font-mono text-gray-600">
                  <span><span className="text-blue-400">■</span> Victorie gazdă</span>
                  <span><span className="text-gray-400">■</span> Egal</span>
                  <span><span className="text-orange-400">■</span> Victorie oaspete</span>
                </div>
              </div>
            )
          })()}

          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">Top scoruri probabile</div>
          <div className="grid grid-cols-2 gap-2">
            {(prediction.top_scores || []).slice(0, 8).map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-gray-800/30 rounded-lg px-3 py-2">
                <span className="font-display text-lg text-white tracking-widest">{s.score}</span>
                <span className="text-xs font-mono text-blue-400">{s.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Statistici + Head-to-Head */}
      {activeTab === 'stats' && (
        <div className="fade-in space-y-4" style={{ overflow: 'hidden' }}>
          {prediction.home_stats && prediction.away_stats && (
            <div className="card p-5">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">⚔️ Head-to-Head</div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-center" style={{ flex: 1 }}>
                  <div className="text-sm font-bold text-blue-400 truncate">{prediction.home_team.split(' ').slice(-1)[0]}</div>
                  <div className="text-[10px] text-gray-600">GAZDĂ</div>
                </div>
                <div className="text-gray-600 text-xs font-mono px-3">VS</div>
                <div className="text-center" style={{ flex: 1 }}>
                  <div className="text-sm font-bold text-orange-400 truncate">{prediction.away_team.split(' ').slice(-1)[0]}</div>
                  <div className="text-[10px] text-gray-600">OASPETE</div>
                </div>
              </div>
              {prediction.home_stats.h2h_home_wins !== undefined && (
                <div className="mb-4 bg-gray-800/30 rounded-xl p-3">
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 text-center">📚 Meciuri directe recente</div>
                  <div className="flex justify-around">
                    {[
                      { label: 'Victorii gazdă', value: prediction.home_stats.h2h_home_wins, color: '#3b82f6' },
                      { label: 'Egaluri', value: prediction.home_stats.h2h_draws, color: '#6b7280' },
                      { label: 'Victorii oaspete', value: prediction.home_stats.h2h_away_wins, color: '#f97316' },
                    ].map(h => (
                      <div key={h.label} className="text-center">
                        <div className="text-2xl font-bold font-mono" style={{ color: h.color }}>{h.value}</div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">{h.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <StatBar label="xG For" homeVal={prediction.home_stats.xg_for ?? 1.5} awayVal={prediction.away_stats.xg_for ?? 1.2} />
              <StatBar label="xG Against" homeVal={prediction.home_stats.xg_against ?? 1.2} awayVal={prediction.away_stats.xg_against ?? 1.5} />
              <StatBar label="Goluri/meci" homeVal={prediction.home_stats.goals_avg ?? 1.5} awayVal={prediction.away_stats.goals_avg ?? 1.2} />
              <StatBar label="Elo Rating" homeVal={prediction.home_stats.elo_rating ?? 1500} awayVal={prediction.away_stats.elo_rating ?? 1500} format={(v) => Math.round(v).toString()} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <TeamStatsCard stats={prediction.home_stats} teamName={prediction.home_team} color="#3b82f6" />
            <TeamStatsCard stats={prediction.away_stats} teamName={prediction.away_team} color="#f97316" />
          </div>
        </div>
      )}

      {/* Tab: Clasament */}
      {activeTab === 'standings' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">Clasament · Sezon curent</div>
          <StandingsTable standings={standings} highlightTeams={[prediction.home_team, prediction.away_team]} />
          {standings.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-2">Clasamentul e disponibil pentru ligile majore</p>
          )}
        </div>
      )}

      {/* Tab: Modele */}
      {activeTab === 'models' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">Detalii modele predicție</div>
          <div className="space-y-4">
            {[
              { key: 'elo',     label: '⚡ Elo Rating', color: '#a78bfa', weight: '15-20%' },
              { key: 'poisson', label: '📐 Poisson xG',  color: '#34d399', weight: '35-40%' },
              { key: 'xgboost', label: '🤖 XGBoost',     color: '#60a5fa', weight: '40-50%' },
            ].map(({ key, label, color, weight }) => {
              const data = breakdown[key]
              if (!data) return null
              return (
                <div key={key} className="bg-gray-800/30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold" style={{ color }}>{label}</span>
                    <span className="text-[10px] text-gray-600 font-mono">Pondere: {weight}</span>
                  </div>
                  <div className="flex justify-around">
                    {[
                      { l: '1', v: data.home_win ?? data.home },
                      { l: 'X', v: data.draw },
                      { l: '2', v: data.away_win ?? data.away },
                    ].map(({ l, v }) => (
                      <div key={l} className="text-center">
                        <div className="text-lg font-bold font-mono" style={{ color }}>{v ?? '—'}%</div>
                        <div className="text-[10px] text-gray-600 uppercase">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [lang, setLang] = useState<'ro'|'en'>('ro')
  const tr = t[lang]
  useEffect(() => { setLang(detectLang()) }, [])
  const [user, setUser] = useState<AuthUser | null>(null)
  useEffect(() => { setUser(getUser()) }, [])
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFixtures, setLoadingFixtures] = useState(false)

  const nextDays = getNextDays(10)

  useEffect(() => {
    axios.get(`${API_BASE}/api/leagues`).then(r => setLeagues(r.data.leagues || []))
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    setFixtures([]); setSelectedFixture(null); setPrediction(null); setStandings([])
    setLoadingFixtures(true)
    Promise.all([
      axios.get(`${API_BASE}/api/fixtures/${selectedLeague}`).catch(() => ({ data: { fixtures: [] } })),
      axios.get(`${API_BASE}/api/standings/${selectedLeague}`).catch(() => ({ data: { standings: [] } })),
    ]).then(([fixtRes, standRes]) => {
      const all: Fixture[] = fixtRes.data.fixtures || []
      const todayStr = new Date().toISOString().split('T')[0]
      const upcoming = all.filter((f: Fixture) => f.date && f.date >= todayStr).sort((a: Fixture, b: Fixture) => (a.date || '').localeCompare(b.date || '')).slice(0, 30)
      const filtered = all.filter((f: Fixture) => nextDays.includes(f.date))
      setFixtures(filtered.length > 0 ? filtered : upcoming.length > 0 ? upcoming : all.slice(0, 30))
      setStandings(standRes.data.standings || [])
    }).finally(() => setLoadingFixtures(false))
  }, [selectedLeague])

  const predict = async () => {
    if (!selectedFixture) return
    setLoading(true); setPrediction(null)
    try {
      const r = await axios.get(`${API_BASE}/api/predict`, {
        params: {
          home_team: selectedFixture.home,
          away_team: selectedFixture.away,
          league_id: selectedLeague || 39,
          home_team_id: selectedFixture.home_id,
          away_team_id: selectedFixture.away_id,
        }
      })
      setPrediction(r.data)
    } catch { } finally { setLoading(false) }
  }

  const confGroups = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']
  const grouped = confGroups.reduce((acc, c) => {
    acc[c] = leagues.filter(l => l.confederation === c)
    return acc
  }, {} as Record<string, League[]>)

  const fixturesByDay = nextDays.reduce((acc, day) => {
    const dayFixtures = fixtures.filter(f => f.date === day)
    if (dayFixtures.length > 0) acc[day] = dayFixtures
    return acc
  }, {} as Record<string, Fixture[]>)

  const hasDatedFixtures = Object.keys(fixturesByDay).length > 0
  const fixturesWithoutDate = fixtures.filter(f => !f.date || !nextDays.includes(f.date))

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">

      <main style={{ maxWidth: '72rem', overflowX: 'hidden', padding: '0 16px' }} className="mx-auto py-8">
        <div className="text-center mb-10 fade-in">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <img src="/logo.png" alt="Oxiano"
                style={{ width: 200, height: 200, objectFit: 'contain' }} />
            </div>
          </div>
          <div className="text-blue-400 text-sm font-mono uppercase tracking-widest mb-3">Advanced Quantitative Intelligence</div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">{tr.hero_sub}</p>
        </div>

        <div className="card p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ligă / Competiție</label>
              <select className="select-styled" value={selectedLeague || ''} onChange={e => setSelectedLeague(Number(e.target.value))}>
                <option value="">Selectează liga...</option>
                {confGroups.map(conf => (
                  grouped[conf]?.length > 0 && (
                    <optgroup key={conf} label={`── ${conf} ──`}>
                      {grouped[conf].map(l => (
                        <option key={l.id} value={l.id}>{l.flag} {l.name} — {l.country}</option>
                      ))}
                    </optgroup>
                  )
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Meci {fixtures.length > 0 && <span className="text-blue-500 ml-1">({fixtures.length} disponibile)</span>}
              </label>
              {loadingFixtures ? (
                <div className="select-styled flex items-center gap-2 text-gray-500">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Se încarcă meciurile...
                </div>
              ) : (
                <select className="select-styled"
                  value={selectedFixture ? fixtures.indexOf(selectedFixture) : ''}
                  onChange={e => {
                    const val = e.target.value
                    const f = val !== '' ? fixtures[Number(val)] : null
                    setSelectedFixture(f || null)
                    setPrediction(null)
                  }}
                  disabled={fixtures.length === 0}>
                  <option value="">{fixtures.length === 0 ? tr.select_match_placeholder : tr.select_match_placeholder2}</option>
                  {hasDatedFixtures ? (
                    nextDays.map(day => (
                      fixturesByDay[day]?.length > 0 && (
                        <optgroup key={day} label={`── ${getDayLabel(day)} · ${formatDateRO(day)} ──`}>
                          {fixturesByDay[day].map(f => {
                            const idx = fixtures.indexOf(f)
                            return <option key={idx} value={idx}>{f.home} vs {f.away}{f.time ? ` · ${f.time}` : ''}</option>
                          })}
                        </optgroup>
                      )
                    ))
                  ) : (
                    fixtures.map((f, idx) => (
                      <option key={idx} value={idx}>
                        {f.home} vs {f.away}{f.date ? ` · ${formatDateRO(f.date)}` : ''}{f.time ? ` · ${f.time}` : ''}
                      </option>
                    ))
                  )}
                  {hasDatedFixtures && fixturesWithoutDate.length > 0 && (
                    <optgroup label="── Alte meciuri ──">
                      {fixturesWithoutDate.map(f => {
                        const idx = fixtures.indexOf(f)
                        return <option key={idx} value={idx}>{f.home} vs {f.away}</option>
                      })}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
            <div>
              <button className="btn-accent w-full" onClick={predict} disabled={!selectedFixture || loading}>
                {loading ? '⏳ Se calculează...' : '🔮 Predicție AI'}
              </button>
              {selectedFixture && (
                <p className="text-[11px] font-mono text-gray-500 mt-2 text-center">
                  {getDayLabel(selectedFixture.date)} · {formatDateRO(selectedFixture.date)}
                  {selectedFixture.time && ` · 🕐 ${selectedFixture.time}`}
                </p>
              )}
            </div>
          </div>

          {standings.length > 0 && !prediction && !loading && (
            <div className="mt-5 pt-5 border-t border-gray-800">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">🏆 Clasament · Selectează un meci pentru predicție</div>
              <StandingsTable standings={standings.slice(0, 6)} highlightTeams={[]} />
              {standings.length > 6 && <div className="text-center mt-2 text-xs text-gray-700">... și încă {standings.length - 6} echipe</div>}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 fade-in">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">Calculez predicțiile AI...</p>
            </div>
          </div>
        )}

        {prediction && !loading && selectedFixture && (
          <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <PredictionDisplay prediction={prediction} fixture={selectedFixture} standings={standings} />
          </div>
        )}

        {!prediction && !loading && !selectedLeague && (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl opacity-10 mb-4">⚽</div>
            <p className="font-display text-2xl text-gray-600 tracking-widest mb-2">{tr.empty_title}</p>
            <p className="text-gray-700 text-sm font-mono">{tr.empty_sub}</p>
          </div>
        )}
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">{tr.footer}</p>
<a href="/privacy" className="text-xs font-mono text-blue-600 hover:text-blue-400 mt-1 block">Politică de confidențialitate</a>
        </div>
      </footer>
    </div>
  )
}
