'use client'

import { useState, useEffect } from 'react'
import { getUser, logout, isVip, type AuthUser } from '@/lib/auth'
import PickSkeleton from '@/components/PickSkeleton'
import { getBetBuilder, saveBetBuilder } from '@/lib/betBuilder'
import { useLang } from '@/lib/LangContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function today() {
  return new Date().toISOString().split('T')[0]
}
function addDays(iso: string, n: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

interface Pick {
  home: string
  away: string
  league: string
  flag: string
  time: string
  home_win: number
  draw: number
  away_win: number
  prediction: 'H' | 'D' | 'A'
  prediction_label: string
  confidence: number
  confidence_level: 'high' | 'medium' | 'low'
  high_confidence: boolean
  home_elo: number
  away_elo: number
  home_form: number
  away_form: number
  competition_code?: string
  has_odds?: boolean
  // BI signals
  edge?: number
  value_bet?: boolean
  market_signal?: string
  upset_risk?: boolean
}

interface DailyResponse {
  date: string
  total_fixtures: number
  total_picks: number
  high_conf: number
  med_conf: number
  picks: Pick[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeKelly(confidence: number, edge: number | undefined, hasOdds: boolean): number {
  const p = confidence / 100
  let odds: number
  if (hasOdds && edge !== undefined && edge > 0) {
    // Edge real disponibil: derivam cotele din edge
    const pMarket = Math.max(0.05, p - edge / 100)
    odds = 1 / pMarket
  } else {
    // Fara edge: presupunem marja de 8% a bookmakerului
    odds = (1 / p) * 0.92
  }
  const b = odds - 1
  const kelly = (b * p - (1 - p)) / b
  return Math.max(0, Math.min(0.10, kelly))  // cap 0-10%
}

function confColor(level: string, lang: 'ro' | 'en' = 'ro') {
  if (level === 'high')   return { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#22c55e', label: lang === 'en' ? 'HIGH' : 'RIDICATĂ' }
  if (level === 'medium') return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b', label: lang === 'en' ? 'MEDIUM' : 'MEDIE' }
  return                         { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.30)', text: '#818cf8', label: lang === 'en' ? 'LOW' : 'SCĂZUTĂ' }
}

function predLabel(p: Pick, lang: 'ro' | 'en' = 'ro') {
  if (p.prediction === 'H') return { emoji: '◀', short: '1',  full: p.home,  prob: p.home_win }
  if (p.prediction === 'A') return { emoji: '▶', short: '2',  full: p.away,  prob: p.away_win }
  return                           { emoji: '▬', short: 'X',  full: lang === 'en' ? 'Draw' : 'Egal',  prob: p.draw }
}

// ── Format share profesional WhatsApp/Telegram ───────────────────────────────
function buildShareCard(p: Pick, dateStr: string): string {
  const pred  = predLabel(p)
  const margin = 1.08
  const odd   = (100 / Math.max(pred.prob, 1) * margin).toFixed(2)
  const bar   = (pct: number) => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
  const conf  = p.confidence >= 65 ? '🟢 HIGH' : p.confidence >= 55 ? '🟡 MEDIUM' : '🔵 LOW'

  return [
    `╔══════════════════════════╗`,
    `   ⚽ OXIANO · PREDICȚIE AI`,
    `╚══════════════════════════╝`,
    ``,
    `${p.flag} ${p.league}`,
    `📅 ${dateStr}  ·  ${p.time || '—'}`,
    ``,
    `  🏠  ${p.home}`,
    `  ✈️  ${p.away}`,
    ``,
    `──────────────────────────`,
    `📊 PROBABILITĂȚI`,
    ``,
    `  1  ${bar(p.home_win)}  ${p.home_win}%`,
    `  X  ${bar(p.draw)}  ${p.draw}%`,
    `  2  ${bar(p.away_win)}  ${p.away_win}%`,
    ``,
    `──────────────────────────`,
    `🎯 PREDICȚIE: ${pred.emoji} ${pred.short} — ${pred.full}`,
    `📈 Confidence: ${p.confidence}% · ${conf}`,
    `⚡ Elo: ${p.home_elo} vs ${p.away_elo}`,
    ``,
    `🤖 XGBoost + Elo + Poisson`,
    `──────────────────────────`,
    `⚠️  Analiză statistică.`,
    `    Nu constituie sfat de pariere.`,
    ``,
    `🌐 oxiano.com`,
  ].join('\n')
}

function buildAccumulatorCard(picks: Pick[], dateStr: string): string {
  const margin = 1.08
  const lines = picks.slice(0, 3).map((p, i) => {
    const pred = predLabel(p)
    const odd  = (100 / Math.max(pred.prob, 1) * margin).toFixed(2)
    const medals = ['🥇', '🥈', '🥉']
    return `${medals[i]} ${p.flag} ${p.home} vs ${p.away}\n   ➤ ${pred.short} — ${pred.full}  |  ~${odd}  |  ${p.confidence}% conf`
  })
  const combo = picks.slice(0, 3).reduce((acc, p) => {
    const pred = predLabel(p)
    return acc * (100 / Math.max(pred.prob, 1) * margin)
  }, 1)

  return [
    `╔══════════════════════════╗`,
    `  🎁 OXIANO · 3 PONTURI`,
    `╚══════════════════════════╝`,
    ``,
    `📅 ${dateStr}`,
    ``,
    ...lines,
    ``,
    `──────────────────────────`,
    `📦 ACUMULATOR: x${combo.toFixed(2)}`,
    `──────────────────────────`,
    `⚠️  Analiză statistică.`,
    `    Nu constituie sfat de pariere.`,
    ``,
    `🌐 oxiano.com`,
  ].join('\n')
}

// ── Tracker personal (localStorage) ─────────────────────────────────────────
interface TrackedBet { id: string; match: string; pick: string; odd: number; result: 'win'|'loss'|'pending'; date: string }

function PersonalTracker({ picks }: { picks: Pick[] }) {
  const { lang } = useLang()
  const [bets, setBets]       = useState<TrackedBet[]>([])
  const [open, setOpen]       = useState(false)
  const [stake, setStake]     = useState('10')

  useEffect(() => {
    try { setBets(JSON.parse(localStorage.getItem('flopi_bets') || '[]')) } catch {}
  }, [])

  const save = (updated: TrackedBet[]) => {
    setBets(updated)
    localStorage.setItem('flopi_bets', JSON.stringify(updated))
  }

  const addBet = (p: Pick) => {
    const pred   = predLabel(p)
    const margin = 1.08
    const odd    = parseFloat((100 / Math.max(pred.prob, 1) * margin).toFixed(2))
    const id     = `${p.home}-${p.away}-${Date.now()}`
    const bet: TrackedBet = {
      id, odd,
      match: `${p.home} vs ${p.away}`,
      pick:  `${pred.short} — ${pred.full}`,
      result: 'pending',
      date: new Date().toLocaleDateString('ro-RO'),
    }
    save([...bets, bet])
  }

  const markResult = (id: string, result: 'win'|'loss') =>
    save(bets.map(b => b.id === id ? { ...b, result } : b))

  const removeBet = (id: string) => save(bets.filter(b => b.id !== id))

  const wins   = bets.filter(b => b.result === 'win').length
  const losses = bets.filter(b => b.result === 'loss').length
  const total  = wins + losses
  const stakeN = parseFloat(stake) || 10
  const roi    = total > 0
    ? bets.filter(b => b.result !== 'pending').reduce((acc, b) =>
        acc + (b.result === 'win' ? b.odd * stakeN - stakeN : -stakeN), 0)
    : 0
  const roiPct = total > 0 ? Math.round((roi / (total * stakeN)) * 100) : 0

  return (
    <div className="mt-6">
      <button onClick={() => setOpen(o => !o)} className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
        📓 {lang === 'en' ? 'Personal Tracker' : 'Tracker Personal'} {bets.length > 0 && `· ${bets.length} ${lang === 'en' ? 'bets' : 'pariuri'}`} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 card p-4 fade-in">
          {/* Stats */}
          {total > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: lang === 'en' ? 'Won' : 'Câștigate', val: wins, color: '#22c55e' },
                { label: lang === 'en' ? 'Lost' : 'Pierdute', val: losses, color: '#ef4444' },
                { label: 'ROI', val: `${roiPct > 0 ? '+' : ''}${roiPct}%`, color: roiPct >= 0 ? '#22c55e' : '#ef4444' },
                { label: `P/L (${stake} RON)`, val: `${roi > 0 ? '+' : ''}${roi.toFixed(0)}`, color: roi >= 0 ? '#22c55e' : '#ef4444' },
              ].map(s => (
                <div key={s.label} className="bg-gray-800/40 rounded-xl p-2 text-center">
                  <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Stake input */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] text-gray-500 font-mono shrink-0">{lang === 'en' ? 'Stake per bet:' : 'Miză per pariu:'}</span>
            <input type="number" value={stake} onChange={e => setStake(e.target.value)} min="1"
              className="w-20 bg-gray-800/60 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
            <span className="text-[10px] text-gray-600 font-mono">RON</span>
          </div>

          {/* Add from today's picks */}
          <div className="mb-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">{lang === 'en' ? "Add from today's picks:" : 'Adaugă din pick-urile de azi:'}</div>
            <div className="space-y-1">
              {picks.slice(0, 5).map((p, i) => {
                const pred = predLabel(p)
                const already = bets.some(b => b.match === `${p.home} vs ${p.away}`)
                return (
                  <button key={i} onClick={() => !already && addBet(p)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: already ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.08)',
                      border: `1px solid ${already ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.2)'}`,
                      opacity: already ? 0.5 : 1,
                    }}>
                    <span className="text-[11px] text-white font-mono truncate">{p.flag} {p.home} vs {p.away} · <span className="text-indigo-400">{pred.short}</span></span>
                    <span className="text-[10px] text-gray-500 shrink-0 ml-2">{already ? (lang === 'en' ? '✓ added' : '✓ adăugat') : (lang === 'en' ? '+ add' : '+ adaugă')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bet history */}
          {bets.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">{lang === 'en' ? 'Your history:' : 'Istoricul tău:'}</div>
              {[...bets].reverse().slice(0, 10).map(b => (
                <div key={b.id} className="flex items-center gap-2 bg-gray-800/30 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white font-mono truncate">{b.match}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{b.pick} · ~{b.odd} · {b.date}</div>
                  </div>
                  {b.result === 'pending' ? (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => markResult(b.id, 'win')}
                        className="text-[10px] px-2 py-1 rounded-lg font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>W</button>
                      <button onClick={() => markResult(b.id, 'loss')}
                        className="text-[10px] px-2 py-1 rounded-lg font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>L</button>
                      <button onClick={() => removeBet(b.id)}
                        className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm">{b.result === 'win' ? '✅' : '❌'}</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: b.result === 'win' ? '#22c55e' : '#ef4444' }}>
                        {b.result === 'win' ? `+${((b.odd - 1) * stakeN).toFixed(0)}` : `-${stakeN}`} RON
                      </span>
                      <button onClick={() => removeBet(b.id)} className="text-gray-700 text-[10px] ml-1">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Streak Badges ────────────────────────────────────────────────────────────
function StreakBadges({ pick }: { pick: Pick }) {
  const { lang } = useLang()
  const badges: { text: string; color: string }[] = []

  if (pick.home_form >= 65)
    badges.push({ text: `🔥 ${pick.home.split(' ')[0]} ${lang === 'en' ? 'in form' : 'în formă'}`, color: '#f97316' })
  if (pick.away_form >= 65)
    badges.push({ text: `🔥 ${pick.away.split(' ')[0]} ${lang === 'en' ? 'in form' : 'în formă'}`, color: '#f97316' })

  if (pick.home_form <= 30)
    badges.push({ text: `📉 ${pick.home.split(' ')[0]} ${lang === 'en' ? 'poor form' : 'în criză'}`, color: '#ef4444' })
  if (pick.away_form <= 30)
    badges.push({ text: `📉 ${pick.away.split(' ')[0]} ${lang === 'en' ? 'poor form' : 'în criză'}`, color: '#ef4444' })

  const eloDiff = Math.abs(pick.home_elo - pick.away_elo)
  if (eloDiff >= 150) {
    const fav = pick.home_elo > pick.away_elo ? pick.home : pick.away
    badges.push({ text: `⚡ ${fav.split(' ')[0]} ${lang === 'en' ? `clear favourite (+${eloDiff} Elo)` : `favorit clar (+${eloDiff} Elo)`}`, color: '#a78bfa' })
  }

  if (eloDiff < 30 && Math.abs(pick.home_form - pick.away_form) < 10)
    badges.push({ text: lang === 'en' ? '⚖️ Even match' : '⚖️ Meci echilibrat', color: '#6b7280' })

  if (badges.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {badges.slice(0, 3).map((b, i) => (
        <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${b.color}18`, color: b.color, border: `1px solid ${b.color}30` }}>
          {b.text}
        </span>
      ))}
    </div>
  )
}

function FormBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 font-mono w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Bet Builder ───────────────────────────────────────────────────────────────

function AddToBetBuilder({ pick }: { pick: Pick }) {
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const bb = getBetBuilder()
    setAdded(bb.some(p => p.home === pick.home && p.away === pick.away))
  }, [pick.home, pick.away])

  function toggle() {
    const bb = getBetBuilder()
    if (added) {
      saveBetBuilder(bb.filter(p => !(p.home === pick.home && p.away === pick.away)))
      setAdded(false)
    } else {
      saveBetBuilder([...bb, pick])
      setAdded(true)
    }
  }

  return (
    <button onClick={toggle}
      className="text-[9px] font-bold px-2.5 py-1 rounded-lg font-mono"
      style={{
        background: added ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
        color: added ? '#4ade80' : '#6b7280',
        border: `1px solid ${added ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
        transition: 'all 0.15s',
      }}>
      {added ? '✓ În bilet' : '+ Bilet'}
    </button>
  )
}

// ── PickCard ─────────────────────────────────────────────────────────────────

function PickCard({ pick, rank, userTier }: { pick: Pick; rank: number; userTier?: string }) {
  const { lang } = useLang()
  const c    = confColor(pick.confidence_level, lang)
  const pred = predLabel(pick, lang)
  const isLocked = (pick as any).vip_only && userTier !== 'vip' && userTier !== 'pro'

  if (isLocked) {
    return (
      <div className="card p-4 mb-3" style={{ borderColor: 'rgba(234,179,8,0.4)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Liga Confidentiala</span>
            <span className="text-[10px] font-mono text-gray-700">#{rank}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-bold text-white">Echipa Acasa</div>
            <div className="text-gray-600 font-bold text-sm mx-3">VS</div>
            <div className="text-base font-bold text-white text-right">Echipa Deplasare</div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {['1', 'X', '2'].map((l) => (
              <div key={l} className="rounded-lg py-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="text-[10px] font-mono text-gray-500">{l}</div>
                <div className="text-lg font-bold font-mono text-gray-600">??%</div>
              </div>
            ))}
          </div>
        </div>
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(2px)',
        }}>
          <div style={{ fontSize: 28 }}>👑</div>
          <div style={{ fontWeight: 700, color: '#eab308', fontSize: 14 }}>{lang === 'en' ? 'Exclusive VIP Pick' : 'Pick VIP Exclusiv'}</div>
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', maxWidth: 200, lineHeight: 1.4 }}>
            {lang === 'en' ? 'Available for Pro subscribers' : 'Disponibil pentru abonamentii Pro'}
          </div>
          <a href="/upgrade" style={{
            marginTop: 4, padding: '8px 20px', background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>
            Upgrade Pro
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 mb-3" style={{ borderColor: c.border }}>

      {/* Header: Liga + ora + rank */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{pick.flag}</span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{pick.league}</span>
          {pick.time && <span className="text-[10px] font-mono text-gray-600 ml-1">· {pick.time}</span>}
        </div>
        <div className="flex items-center gap-2">
          {pick.high_confidence && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
              style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              ⚡ HIGH CONF
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-700">#{rank}</span>
        </div>
      </div>

      {/* Echipe */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-white leading-tight truncate">{pick.home}</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Elo {pick.home_elo} · Formă {pick.home_form}%
          </div>
        </div>
        <div className="text-gray-600 font-bold text-sm mx-3 shrink-0">VS</div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-base font-bold text-white leading-tight truncate">{pick.away}</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Elo {pick.away_elo} · Formă {pick.away_form}%
          </div>
        </div>
      </div>

      {/* Probabilitati */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: '1', val: pick.home_win, active: pick.prediction === 'H' },
          { label: 'X', val: pick.draw,     active: pick.prediction === 'D' },
          { label: '2', val: pick.away_win, active: pick.prediction === 'A' },
        ].map(({ label, val, active }) => (
          <div key={label} className="rounded-lg py-2 text-center"
            style={{
              background: active ? c.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.06)'}`,
            }}>
            <div className="text-[10px] font-mono text-gray-500 uppercase">{label}</div>
            <div className="text-lg font-bold font-mono" style={{ color: active ? c.text : '#6b7280' }}>
              {val}%
            </div>
          </div>
        ))}
      </div>

      {/* Predictie + Confidence */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-base">{pred.emoji}</span>
          <div>
            <div className="text-xs font-bold" style={{ color: c.text }}>
              {pred.short} — {pred.full}
            </div>
            <div className="text-[10px] font-mono text-gray-500">{lang === 'en' ? 'AI Prediction' : 'Predicție AI'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono" style={{ color: c.text }}>
            {pick.confidence}%
          </div>
          <div className="text-[9px] font-mono" style={{ color: c.text }}>
            {c.label}
          </div>
        </div>
      </div>

      {/* BI Market Signals */}
      {pick.has_odds && (pick.value_bet || pick.upset_risk) && (
        <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
          {pick.value_bet && (
            <span style={{
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
              color: '#f59e0b', fontSize: 10, fontWeight: 700, padding: '3px 8px',
              borderRadius: 6, fontFamily: 'monospace', letterSpacing: '0.05em',
            }}>
              ⚡ VALUE +{pick.edge}%
            </span>
          )}
          {pick.market_signal === 'VALUE_HOME' || pick.market_signal === 'VALUE_AWAY' ? (
            <span style={{
              background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)',
              color: '#10b981', fontSize: 10, fontWeight: 700, padding: '3px 8px',
              borderRadius: 6, fontFamily: 'monospace',
            }}>
              📊 {lang === 'en' ? 'MARKET UNDERVALUED' : 'PIAȚA SUBEVALUATĂ'}
            </span>
          ) : null}
          {pick.upset_risk && (
            <span style={{
              background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)',
              color: '#f87171', fontSize: 10, fontWeight: 700, padding: '3px 8px',
              borderRadius: 6, fontFamily: 'monospace',
            }}>
              ⚠️ {lang === 'en' ? 'UPSET RISK' : 'RISC SURPRIZĂ'}
            </span>
          )}
        </div>
      )}

      {/* Kelly Criterion */}
      {(() => {
        const kelly = computeKelly(pick.confidence, pick.edge, pick.has_odds ?? false)
        if (kelly === 0) return null
        const pct = Math.round(kelly * 100)
        return (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest shrink-0">Kelly</span>
            <span className="text-[11px] font-bold font-mono text-indigo-400">{pct}% bankroll</span>
            <span className="text-[9px] text-gray-600 font-mono">· {lang === 'en' ? 'suggested stake' : 'miza sugerată'}</span>
          </div>
        )
      })()}

      {/* Streak indicators + Share + Bet Builder */}
      <StreakBadges pick={pick} />
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          onClick={() => {
            const dateStr = pick.time
              ? `${new Date().toLocaleDateString('ro-RO')} · ${pick.time}`
              : new Date().toLocaleDateString('ro-RO')
            const text = buildShareCard(pick, dateStr)
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }}
          className="text-[9px] font-bold px-2.5 py-1 rounded-lg font-mono"
          style={{ background: 'rgba(37,211,102,0.1)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)' }}>
          💬 WA
        </button>
        <button
          onClick={() => {
            const dateStr = pick.time
              ? `${new Date().toLocaleDateString('ro-RO')} · ${pick.time}`
              : new Date().toLocaleDateString('ro-RO')
            const text = buildShareCard(pick, dateStr)
            navigator.clipboard?.writeText(text).then(() => alert('Copiat pentru Telegram!'))
          }}
          className="text-[9px] font-bold px-2.5 py-1 rounded-lg font-mono"
          style={{ background: 'rgba(38,120,188,0.1)', color: '#2678bc', border: '1px solid rgba(38,120,188,0.2)' }}>
          ✈️ TG
        </button>
        <AddToBetBuilder pick={pick} />
      </div>
    </div>
  )
}

// ── 3 Ponturi Gratuite ───────────────────────────────────────────────────────

function FreePicks({ picks }: { picks: Pick[] }) {
  const { lang } = useLang()
  if (picks.length === 0) return null

  // Top 3 cele mai bune picks din 3 meciuri diferite
  const seen = new Set<string>()
  const top3: Pick[] = []
  for (const p of picks) {
    const key = `${p.home}-${p.away}`
    if (!seen.has(key)) { seen.add(key); top3.push(p) }
    if (top3.length === 3) break
  }
  if (top3.length < 1) return null

  // Cota combinata (acumulator)
  const margin = 1.08
  const oddSingle = (prob: number) => parseFloat((100 / Math.max(prob, 1) * margin).toFixed(2))
  const comboOdd  = top3.reduce((acc, p) => {
    const prob = p.prediction === 'H' ? p.home_win : p.prediction === 'A' ? p.away_win : p.draw
    return acc * oddSingle(prob)
  }, 1)

  return (
    <div className="mb-6 fade-in">
      {/* Header card */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">🎁 {lang === 'en' ? 'Free Picks' : 'Ponturi Gratuite'}</div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{lang === 'en' ? 'Top 3 selections · Most probable outcomes' : 'Top 3 selecții · Cele mai probabile rezultate'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{lang === 'en' ? 'Estimated accumulator' : 'Acumulator estimat'}</div>
            <div className="text-2xl font-bold font-mono text-amber-400">x{comboOdd.toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-2">
          {top3.map((p, i) => {
            const pred   = predLabel(p)
            const prob   = pred.prob
            const odd    = oddSingle(prob)
            const c      = confColor(p.confidence_level)
            const medals = ['🥇', '🥈', '🥉']
            return (
              <div key={i} className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{medals[i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {p.flag} {p.home} <span className="text-gray-500">vs</span> {p.away}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: `${c.text}20`, color: c.text }}>
                      {pred.short} — {pred.full}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">{p.league}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-amber-400">~{odd.toFixed(2)}</div>
                  <div className="text-[10px] font-mono" style={{ color: c.text }}>{prob}%</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-amber-900/30 flex items-center justify-between gap-2">
          <div className="text-[10px] text-gray-600 font-mono">{lang === 'en' ? '* Estimated odds with 8% margin' : '* Cote estimate cu marjă 8%'}</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const dateStr = formatDate(new Date().toISOString().split('T')[0])
                const text = buildAccumulatorCard(top3, dateStr)
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}>
              💬 WhatsApp
            </button>
            <button
              onClick={() => {
                const dateStr = formatDate(new Date().toISOString().split('T')[0])
                const text = buildAccumulatorCard(top3, dateStr)
                navigator.clipboard?.writeText(text).then(() => alert('Copiat! Lipește în Telegram.'))
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(38,120,188,0.15)', color: '#2678bc', border: '1px solid rgba(38,120,188,0.3)' }}>
              ✈️ Telegram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Banker of the Week ───────────────────────────────────────────────────────
function BankerCard({ picks }: { picks: Pick[] }) {
  const { lang } = useLang()
  const banker = picks.find(p => p.confidence >= 65) ?? picks[0]
  if (!banker) return null
  const pred   = predLabel(banker, lang)
  const margin = 1.08
  const odd    = (100 / Math.max(pred.prob, 1) * margin).toFixed(2)

  return (
    <div className="mb-4 fade-in">
      <div className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.08))', border: '1px solid rgba(139,92,246,0.35)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏦</span>
          <div>
            <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">Banker of the Day</div>
            <div className="text-[10px] text-gray-500 font-mono">{lang === 'en' ? 'Safest bet · Recommended for accumulators' : 'Cel mai sigur pariu · Recomandat la acumulatori'}</div>
          </div>
          <div className="ml-auto">
            <span className="text-[9px] font-bold px-2 py-1 rounded-full font-mono"
              style={{ backgroundColor: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }}>
              {banker.confidence}% conf
            </span>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">{banker.flag} {banker.home} <span className="text-gray-500">vs</span> {banker.away}</div>
            <div className="text-xs font-mono mt-1">
              <span className="text-purple-300 font-bold">{pred.short} — {pred.full}</span>
              <span className="text-gray-600 ml-2">{banker.league}</span>
            </div>
          </div>
          <div className="text-right ml-4 shrink-0">
            <div className="text-2xl font-bold font-mono text-purple-400">~{odd}</div>
            <div className="text-[9px] text-gray-600 font-mono">{lang === 'en' ? 'estimated odds' : 'cotă estimată'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────

function LoadingState() {
  const { lang } = useLang()
  const [step, setStep] = useState(0)
  const steps = lang === 'en' ? [
    "Loading today's matches...",
    'AI analysing each match...',
    'Computing Elo + form + probabilities...',
    'Filtering by confidence...',
  ] : [
    'Se încarcă meciurile zilei...',
    'AI analizează fiecare meci...',
    'Calculez Elo + formă + probabilități...',
    'Filtrare după confidence...',
  ]
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="card p-10 text-center">
      <div className="spinner mx-auto mb-6" />
      <div className="text-green-400 text-sm font-mono mb-1">{steps[step]}</div>
      <div className="text-gray-600 text-[11px] font-mono">Model XGBoost · 225K meciuri antrenament</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyPage() {
  const [data, setData]           = useState<DailyResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'high'>('all')
  const [error, setError]         = useState('')
  const [notifPerm, setNotifPerm] = useState<string>('default')
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [selectedDate, setSelectedDate] = useState(today())
  const { lang }                  = useLang()

  const t0 = today()
  const dateTabs = [
    { date: t0,           label: lang === 'en' ? 'Today' : 'Azi' },
    { date: addDays(t0, 1), label: lang === 'en' ? 'Tomorrow' : 'Mâine' },
    { date: addDays(t0, 2), label: lang === 'en' ? 'Day after' : 'Poimâine' },
  ]

  useEffect(() => { setUser(getUser()) }, [])

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`${API_BASE}/api/daily?min_confidence=0.45&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false) })
    if ('Notification' in window) setNotifPerm(Notification.permission)
  }, [selectedDate])

  const enableNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') {
      new Notification('🎯 Oxiano activat!', {
        body: 'Vei fi notificat când apar pick-uri noi cu confidence ridicat.',
        icon: '/logo.png',
      })
    }
  }

  const picks = data?.picks ?? []
  const shown = filter === 'high' ? picks.filter(p => p.high_confidence) : picks

  function shareText() {
    const top = shown.slice(0, 5)
    const lines = top.map((p, i) => {
      const pred = predLabel(p)
      return `${i + 1}. ${p.flag} ${p.home} vs ${p.away}\n   ${pred.short} — ${pred.full} · ${p.confidence}% conf`
    }).join('\n\n')
    return `🎯 OXIANO — Pick-urile zilei ${formatDate(today())}\n\n${lines}\n\n🤖 Model AI · oxiano.com`
  }

  return (
    <div className="app-bg grid-bg" style={{ minHeight: '100vh', overflowX: 'hidden' }}>


      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Hero */}
        <div className="text-center mb-6 fade-in">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            {lang === 'en' ? 'DAILY PICKS' : 'SELECȚIILE ZILEI'}
          </h1>
          <div className="text-green-400 text-sm font-mono uppercase tracking-widest mb-1">
            {data ? formatDate(data.date) : formatDate(today())}
            {data && data.date !== today() && (
              <span className="text-yellow-500 text-[10px] ml-2">(next matchday)</span>
            )}
          </div>
          <p className="text-gray-500 text-xs font-mono">
            XGBoost + Elo · 225K meciuri antrenament · Sorted by confidence
          </p>
          {notifPerm !== 'granted' && notifPerm !== 'denied' && (
            <button onClick={enableNotifications}
              className="mt-3 px-4 py-2 rounded-full text-xs font-bold font-mono transition-all"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
              🔔 {lang === 'en' ? 'Enable alerts for new picks' : 'Activează alertele pentru pick-uri noi'}
            </button>
          )}
          {notifPerm === 'granted' && (
            <div className="mt-3 text-[10px] font-mono text-green-600">🔔 {lang === 'en' ? 'Alerts active' : 'Alerte active'}</div>
          )}
        </div>

        {/* Date tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {dateTabs.map(tab => {
            const active = tab.date === selectedDate
            return (
              <button key={tab.date} onClick={() => setSelectedDate(tab.date)} style={{
                flex: 1, maxWidth: 140, padding: '10px 0', borderRadius: 10,
                fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: 'monospace',
                cursor: 'pointer', transition: 'all 0.15s',
                background: active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#4ade80' : '#6b7280',
              }}>
                <div>{tab.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{formatDate(tab.date)}</div>
              </button>
            )
          })}
        </div>

        {loading && (
          <div>
            {[0,1,2,3].map(i => <PickSkeleton key={i} />)}
          </div>
        )}
        {!loading && (!data || data.picks?.length === 0) && (
          <div className="card p-8 text-center" style={{ border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {lang === 'en' ? 'Picks being calculated...' : 'Picks în curs de calcul...'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>
              {lang === 'en'
                ? 'Auto-updated at 07:00 and 13:00 EET (Eastern European Time).'
                : 'Actualizare automată la 07:00 și 13:00 ora României (EET).'}
            </div>
          </div>
        )}

        {!loading && data && data.picks?.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: lang === 'en' ? 'Matches analysed' : 'Meciuri analizate', val: data.total_fixtures, color: '#818cf8' },
                { label: lang === 'en' ? 'Active picks' : 'Pick-uri active',        val: data.total_picks,    color: '#f59e0b' },
                { label: 'High confidence',                                          val: data.high_conf,      color: '#22c55e' },
              ].map(({ label, val, color }) => (
                <div key={label} className="card p-3 text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color }}>{val}</div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* 3 Ponturi Gratuite */}
            <FreePicks picks={picks} />

            {/* Banker of the Week */}
            <BankerCard picks={picks} />

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5">
              {[
                { key: 'all',  label: `${lang === 'en' ? 'All' : 'Toate'} (${data.total_picks})` },
                { key: 'high', label: `⚡ High Conf (${data.high_conf})` },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => setFilter(key as any)}
                  className="flex-1 py-2 rounded-xl text-sm font-mono font-bold transition-all"
                  style={{
                    background: filter === key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${filter === key ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: filter === key ? '#22c55e' : '#6b7280',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Accuracy info */}
            {filter === 'high' && data.high_conf > 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl text-xs font-mono"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span className="text-green-400 font-bold">⚡ High Confidence</span>
                <span className="text-gray-400 ml-2">= confidence ≥ 60% · {lang === 'en' ? 'real accuracy ~70%+ on 33K match backtest' : 'acuratețe reală ~70%+ pe backtesting 33K meciuri'}</span>
              </div>
            )}

            {/* Picks */}
            {shown.length === 0 ? (
              <div className="card p-10 text-center fade-in">
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>
                  {filter === 'high' ? '⚡' : '📅'}
                </div>
                <div className="font-display text-xl text-gray-500 tracking-widest mb-2">
                  {filter === 'high'
                    ? (lang === 'en' ? 'No HIGH confidence picks' : 'Niciun pick HIGH confidence')
                    : (lang === 'en' ? 'No matches available today' : 'Niciun meci disponibil azi')}
                </div>
                <div className="text-gray-600 text-sm font-mono mb-4">
                  {filter === 'high'
                    ? (lang === 'en' ? 'Model found no matches with confidence ≥65% today.' : 'Modelul nu a găsit meciuri cu confidence ≥65% azi.')
                    : (lang === 'en' ? 'Supported leagues have no scheduled matches. Come back tomorrow.' : 'Ligile suportate nu au meciuri programate. Revino mâine.')}
                </div>
                {filter === 'high' && (
                  <button
                    onClick={() => {}}
                    className="text-xs font-mono px-4 py-2 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                    {lang === 'en' ? 'See all picks →' : 'Vezi toate pick-urile →'}
                  </button>
                )}
              </div>
            ) : (
              shown.map((pick, i) => <PickCard key={i} pick={pick} rank={i + 1} userTier={user?.tier} />)
            )}

            {/* Share */}
            {shown.length > 0 && (
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
                  📤 WhatsApp
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=oxiano.com&text=${encodeURIComponent(shareText())}`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
                  ✈️ Telegram
                </button>
              </div>
            )}

            {/* Tracker personal */}
            <PersonalTracker picks={shown} />

            {/* Model info */}
            <div className="card p-5 mt-6">
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-3 text-center">
                ℹ️ Cum funcționează
              </div>
              <div className="space-y-2 text-xs text-gray-500 font-mono">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">🤖</span>
                  <span>Model XGBoost antrenat pe 225,000 meciuri din 20+ ligi europene</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">📊</span>
                  <span>84 features: cote bookmakers, Elo per ligă, formă recentă, H2H, xG</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">⚡</span>
                  <span>High Confidence (&gt;=60%): ~70% acuratețe pe backtesting 33,572 meciuri</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 shrink-0">⚠️</span>
                  <span>Scop educațional. Nu reprezintă sfaturi financiare sau de pariuri.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-green-900/30 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            Oxiano — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
          <a href="/privacy" className="text-xs font-mono text-green-600 hover:text-green-400 mt-1 block">
            Politică de confidențialitate
          </a>
        </div>
      </footer>
    </div>
  )
}
