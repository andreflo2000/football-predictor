'use client'

import { useState, useEffect } from 'react'
import { detectLang, t } from './i18n'
import axios from 'axios'

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

// ── Share pe WhatsApp ─────────────────────────────────────────────────────────
function shareOnWhatsApp(prediction: Prediction, fixture: Fixture) {
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw = pred.draw ?? 0
  const away_w = pred.away_win ?? 0
  const bestOdds = (100 / Math.max(home_w, 1)).toFixed(2)
  const text = `⚽ *FLOPI SAN — Predicție*\n\n` +
    `🏟️ *${prediction.home_team}* vs *${prediction.away_team}*\n` +
    `📅 ${getDayLabel(fixture.date)} · ${formatDateRO(fixture.date)}${fixture.time ? ` · 🕐 ${fixture.time}` : ''}\n\n` +
    `📊 *Probabilități:*\n` +
    `1️⃣ ${prediction.home_team}: *${home_w}%* (cotă ~${(100/Math.max(home_w,1)).toFixed(2)})\n` +
    `🤝 Egal: *${draw}%* (cotă ~${(100/Math.max(draw,1)).toFixed(2)})\n` +
    `2️⃣ ${prediction.away_team}: *${away_w}%* (cotă ~${(100/Math.max(away_w,1)).toFixed(2)})\n\n` +
    `🔮 _Generat de Flopi San Forecast Academy_\n` +
    `🌐 fotbal-predictor-ro.vercel.app`
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
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
        <div
          className="w-12 rounded-t-lg transition-all duration-700"
          style={{ height: `${Math.max(value, 5)}%`, backgroundColor: color, opacity: 0.9 }}
        />
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
      {market.odds && <span className="text-[10px] text-gray-600 w-8 text-right font-mono">{market.odds}</span>}
    </div>
  )
}

function MarketSection({ market }: { market: any }) {
  const items = market.items || market.markets || []
  if (!items.length) return null
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-blue-900/40" />
        <span>{market.icon || '📊'} {market.category || market.label}</span>
        <div className="h-px flex-1 bg-blue-900/40" />
      </div>
      {items.map((m: any, i: number) => <MarketRow key={i} market={m} />)}
    </div>
  )
}

function StandingsTable({ standings, highlightTeams }: { standings: StandingRow[]; highlightTeams: string[] }) {
  if (!standings.length) return (
    <div className="text-center py-8 text-gray-600 text-sm">
      Clasamentul nu e disponibil pentru această ligă
    </div>
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
          <div className="flex gap-1">
            {form.map((r: string, i: number) => <FormBadge key={i} result={r} />)}
          </div>
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

// ── Cote Bookmakers ───────────────────────────────────────────────────────────
function BookmakerOdds({ home_w, draw, away_w, homeTeam, awayTeam }: {
  home_w: number; draw: number; away_w: number; homeTeam: string; awayTeam: string
}) {
  const margin = 1.08
  const homeOdd = ((100 / Math.max(home_w, 1)) * margin).toFixed(2)
  const drawOdd = ((100 / Math.max(draw, 1)) * margin).toFixed(2)
  const awayOdd = ((100 / Math.max(away_w, 1)) * margin).toFixed(2)
  return (
    <div className="mt-4 pt-4 border-t border-gray-800/60">
      <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 text-center">
        💰 Cote estimate bookmakers
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '1 Gazdă', odd: homeOdd, color: '#3b82f6' },
          { label: 'X Egal', odd: drawOdd, color: '#6b7280' },
          { label: '2 Oaspete', odd: awayOdd, color: '#f97316' },
        ].map(o => (
          <div key={o.label} className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/30">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{o.label}</div>
            <div className="text-xl font-bold font-mono" style={{ color: o.color }}>{o.odd}</div>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-gray-700 text-center mt-2 font-mono">
        * Cote estimate cu marjă 8% · Verifică la Betano/bet365
      </div>
    </div>
  )
}

function PredictionDisplay({ prediction, fixture, standings }: { prediction: Prediction; fixture: Fixture; standings: StandingRow[] }) {
  const [activeTab, setActiveTab] = useState('markets')
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw   = pred.draw ?? 0
  const away_w = pred.away_win ?? 0

  const tabs = [
    { key: 'markets',   label: '🎯 Pariuri' },
    { key: 'scores',    label: '⚽ Scoruri' },
    { key: 'stats',     label: '📊 Stats' },
    { key: 'standings', label: '🏆 Clas.' },
    { key: 'models',    label: '🤖 Modele' },
  ]

  const breakdown = prediction.model_breakdown || {}

  return (
    <div className="fade-in" style={{ width: '100%', overflow: 'hidden' }}>
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
        <div className="mt-4 text-center text-xs font-mono text-gray-700">
          {pred.method || 'XGBoost + Poisson + Elo'}
        </div>

        {/* Cote bookmakers */}
        <BookmakerOdds
          home_w={home_w} draw={draw} away_w={away_w}
          homeTeam={prediction.home_team} awayTeam={prediction.away_team}
        />

        {/* Buton Share WhatsApp */}
<div className="flex gap-2 mt-4">
  <button
    onClick={() => shareOnWhatsApp(prediction, fixture)}
    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
    📤 WhatsApp
  </button>
  <button
    onClick={() => {
      const pred = prediction.prediction || {}
      const home_w = pred.home_win ?? 0
      const draw = pred.draw ?? 0
      const away_w = pred.away_win ?? 0
      const text = `⚽ *FLOPI SAN — Predicție*\n\n🏟️ *${prediction.home_team}* vs *${prediction.away_team}*\n📅 ${getDayLabel(fixture.date)} · ${formatDateRO(fixture.date)}${fixture.time ? ` · 🕐 ${fixture.time}` : ''}\n\n📊 *Probabilități:*\n1️⃣ ${prediction.home_team}: *${home_w}%* (cotă ~${(100/Math.max(home_w,1)).toFixed(2)})\n🤝 Egal: *${draw}%* (cotă ~${(100/Math.max(draw,1)).toFixed(2)})\n2️⃣ ${prediction.away_team}: *${away_w}%* (cotă ~${(100/Math.max(away_w,1)).toFixed(2)})\n\n🔮 _Generat de Flopi San Forecast Academy_\n🌐 fotbal-predictor-ro.vercel.app`
      window.open(`https://t.me/share/url?url=fotbal-predictor-ro.vercel.app&text=${encodeURIComponent(text)}`, '_blank')
    }}
    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
    style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
    ✈️ Telegram
  </button>
</div>
      </div>

      <div className="flex gap-1 mb-4" style={{ overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.key}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-700/50'
              }`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'markets' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          {(prediction.markets && prediction.markets.length > 0)
            ? prediction.markets.map((m: any, i: number) => <MarketSection key={i} market={m} />)
            : (
              <div>
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
                  📊 Rezultat meci
                </div>
                <div className="space-y-1">
                  {[
                    { name: `1 — Victorie ${prediction.home_team}`, probability: home_w, odds: (100/Math.max(home_w,1)).toFixed(2) },
                    { name: 'X — Egal', probability: draw, odds: (100/Math.max(draw,1)).toFixed(2) },
                    { name: `2 — Victorie ${prediction.away_team}`, probability: away_w, odds: (100/Math.max(away_w,1)).toFixed(2) },
                  ].map((m, i) => <MarketRow key={i} market={m} />)}
                </div>
              </div>
            )
          }
        </div>
      )}

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
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
            Cele mai probabile scoruri
          </div>
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

      {activeTab === 'stats' && (
        <div className="fade-in space-y-4" style={{ overflow: 'hidden' }}>
          {prediction.home_stats && prediction.away_stats && (
            <div className="card p-5">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
                Comparație directă
              </div>
              <div className="flex justify-between text-xs font-mono text-gray-500 mb-3">
                <span className="text-blue-400 font-bold truncate">{prediction.home_team.split(' ').slice(-1)[0]}</span>
                <span></span>
                <span className="text-orange-400 font-bold truncate">{prediction.away_team.split(' ').slice(-1)[0]}</span>
              </div>
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

      {activeTab === 'standings' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
            Clasament · Sezon curent
          </div>
          <StandingsTable standings={standings} highlightTeams={[prediction.home_team, prediction.away_team]} />
          {standings.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-2">
              Clasamentul e disponibil pentru ligile majore
            </p>
          )}
        </div>
      )}

      {activeTab === 'models' && (
        <div className="card p-5 fade-in" style={{ overflow: 'hidden' }}>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
            Detalii modele predicție
          </div>
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
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFixtures, setLoadingFixtures] = useState(false)

  const nextDays = getNextDays(3)

  useEffect(() => {
    axios.get(`${API_BASE}/api/leagues`).then(r => setLeagues(r.data.leagues || []))
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    setFixtures([]); setSelectedFixture(null); setPrediction(null); setStandings([])
    setLoadingFixtures(true)
    Promise.all([
      axios.get(`${API_BASE}/api/fixtures/${selectedLeague}`),
      axios.get(`${API_BASE}/api/standings/${selectedLeague}`).catch(() => ({ data: { standings: [] } })),
    ]).then(([fixtRes, standRes]) => {
      const all: Fixture[] = fixtRes.data.fixtures || []
      const todayStr = new Date().toISOString().split('T')[0]
      const upcoming = all
        .filter(f => f.date && f.date >= todayStr)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .slice(0, 30)
      const filtered = all.filter(f => nextDays.includes(f.date))
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
    <div style={{ width: '100vw', maxWidth: '100vw', overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <header className="header">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Flopi San" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/60" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">FLOPI SAN</div>
              <div className="text-[9px] font-mono text-blue-400 tracking-[0.2em] uppercase">Forecast Academy</div>
            </div>
            <div className="pulse-dot ml-2 hidden sm:block" />
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link active">{tr.predictions}</a>
            <a href="/weekly" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/weekly/index.html'; }}} className="nav-link">{tr.results}</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main style={{ maxWidth: '100%', overflowX: 'hidden', padding: '0 16px' }} className="mx-auto py-8">
        <div className="text-center mb-10 fade-in">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <img src="/logo.jpg" alt="Flopi San Forecast Academy"
                className="w-36 h-36 rounded-full object-cover border-4 border-blue-600/50 shadow-2xl shadow-blue-900/60" />
              <div className="absolute -bottom-1 -right-2 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-base border-2 border-gray-900">
                🔮
              </div>
            </div>
          </div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            FLOPI SAN
          </h1>
          <div className="text-blue-400 text-sm font-mono uppercase tracking-widest mb-3">
            Forecast Academy
          </div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">
            {tr.hero_sub}
          </p>
        </div>

        <div className="card p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Ligă / Competiție
              </label>
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
                <select className="select-styled" value={selectedFixture?.id || ''}
                  onChange={e => {
                    const f = fixtures.find(x => x.id === Number(e.target.value))
                    setSelectedFixture(f || null); setPrediction(null)
                  }}
                  disabled={fixtures.length === 0}>
                  <option value="">{fixtures.length === 0 ? tr.select_match_placeholder : tr.select_match_placeholder2}</option>
                  {hasDatedFixtures ? (
                    nextDays.map(day => (
                      fixturesByDay[day]?.length > 0 && (
                        <optgroup key={day} label={`── ${getDayLabel(day)} · ${formatDateRO(day)} ──`}>
                          {fixturesByDay[day].map(f => (
                            <option key={f.id} value={f.id}>{f.home} vs {f.away}{f.time ? ` · ${f.time}` : ''}</option>
                          ))}
                        </optgroup>
                      )
                    ))
                  ) : (
                    fixtures.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.home} vs {f.away}{f.date ? ` · ${formatDateRO(f.date)}` : ''}{f.time ? ` · ${f.time}` : ''}
                      </option>
                    ))
                  )}
                  {hasDatedFixtures && fixturesWithoutDate.length > 0 && (
                    <optgroup label="── Alte meciuri ──">
                      {fixturesWithoutDate.map(f => (
                        <option key={f.id} value={f.id}>{f.home} vs {f.away}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            <div>
              <button className="btn-accent w-full" onClick={predict} disabled={!selectedFixture || loading}>
                {loading ? '⏳ Se calculează...' : '🔮 Predicție'}
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
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
                🏆 Clasament · Selectează un meci pentru predicție
              </div>
              <StandingsTable standings={standings.slice(0, 6)} highlightTeams={[]} />
              {standings.length > 6 && (
                <div className="text-center mt-2 text-xs text-gray-700">... și încă {standings.length - 6} echipe</div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 fade-in">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">Calculez predicțiile...</p>
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
        </div>
      </footer>
    </div>
  )
}
