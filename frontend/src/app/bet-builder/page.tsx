'use client'
import { useState, useEffect } from 'react'

import { getBetBuilder as getBB, saveBetBuilder as saveBB, type BetPick as Pick } from '@/lib/betBuilder'

function predShort(p: Pick) {
  if (p.prediction === 'H') return { short: '1', full: p.home, prob: p.home_win }
  if (p.prediction === 'D') return { short: 'X', full: 'Egal',  prob: p.draw }
  return { short: '2', full: p.away, prob: p.away_win }
}

function impliedOdds(confidence: number, edge?: number, hasOdds?: boolean): number {
  const p = confidence / 100
  if (hasOdds && edge && edge > 0) {
    const pMarket = Math.max(0.05, p - edge / 100)
    return Math.round((1 / pMarket) * 100) / 100
  }
  return Math.round((1 / p) * 0.92 * 100) / 100
}

export default function BetBuilderPage() {
  const [picks, setPicks]   = useState<Pick[]>([])
  const [bankroll, setBankroll] = useState(100)

  useEffect(() => { setPicks(getBB()) }, [])

  function remove(i: number) {
    const updated = picks.filter((_, idx) => idx !== i)
    setPicks(updated); saveBB(updated)
  }

  function clear() {
    setPicks([]); saveBB([])
  }

  // Calcule combinate
  const combinedOdds     = picks.reduce((acc, p) => acc * impliedOdds(p.confidence, p.edge, p.has_odds), 1)
  const combinedProb     = picks.reduce((acc, p) => acc * (p.confidence / 100), 1) * 100
  const combinedOddsRnd  = Math.round(combinedOdds * 100) / 100
  const combinedProbRnd  = Math.round(combinedProb * 10) / 10

  // Kelly pentru bilet combinat
  const p = combinedProb / 100
  const b = combinedOddsRnd - 1
  const kelly = b > 0 ? Math.max(0, Math.min(0.10, (b * p - (1 - p)) / b)) : 0
  const kellyPct   = Math.round(kelly * 100 * 10) / 10
  const kellyStake = Math.round(bankroll * kelly * 100) / 100

  const hasValueBets = picks.some(p => p.value_bet)

  return (
    <div className="app-bg grid-bg" style={{ minHeight: '100vh' }}>
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
            Oxiano · Bet Builder
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>
            Biletul tău
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            Adaugă picks din <a href="/daily" style={{ color: '#22d3ee' }}>Selecțiile zilei</a> și calculăm automat cota combinată + Kelly.
          </p>
        </div>

        {picks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ color: '#4b5563', fontSize: 15, marginBottom: 20 }}>Niciun pick adăugat încă</div>
            <a href="/daily" style={{ background: '#22d3ee', color: '#000', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Mergi la Selecțiile zilei →
            </a>
          </div>
        ) : (
          <>
            {/* Picks list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {picks.map((pick, i) => {
                const pred = predShort(pick)
                const odds = impliedOdds(pick.confidence, pick.edge, pick.has_odds)
                return (
                  <div key={i} style={{ background: 'rgba(10,40,18,0.95)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace', marginBottom: 3 }}>
                        {pick.flag} {pick.league}{pick.time ? ` · ${pick.time}` : ''}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pick.home} vs {pick.away}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>
                          {pred.short} — {pred.full}
                        </span>
                        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                          {pick.confidence}% conf
                        </span>
                        <span style={{ fontSize: 11, color: '#22d3ee', fontFamily: 'monospace' }}>
                          @{odds}
                        </span>
                        {pick.value_bet && (
                          <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'monospace' }}>💎 VALUE</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => remove(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                      ×
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Summary card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(15,55,25,0.95), rgba(7,26,12,0.98))', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#4ade80', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>
                Sumar bilet · {picks.length} {picks.length === 1 ? 'selecție' : 'selecții'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#22d3ee', fontFamily: 'monospace' }}>{combinedOddsRnd}x</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Cotă combinată</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>{combinedProbRnd}%</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Prob. combinată</div>
                </div>
              </div>

              {/* Bankroll input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                  Bankroll (RON/EUR)
                </label>
                <input
                  type="number" value={bankroll} min={1}
                  onChange={e => setBankroll(Math.max(1, Number(e.target.value)))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.2)', color: '#fff', fontSize: 16, fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              {/* Kelly */}
              {kelly > 0 ? (
                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, fontFamily: 'monospace' }}>Kelly Criterion</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Miza optimă pentru bilet</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8', fontFamily: 'monospace' }}>{kellyStake} <span style={{ fontSize: 13 }}>RON</span></div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{kellyPct}% din bankroll</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace' }}>⚠️ Kelly = 0 — biletul nu are valoare matematică pozitivă</div>
                </div>
              )}

              {hasValueBets && (
                <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'monospace', textAlign: 'center' }}>
                  💎 Biletul conține selecții VALUE BET
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, textAlign: 'center', marginBottom: 16 }}>
              Cotele sunt estimate din probabilitățile modelului, nu sunt cote reale de la bookmaker.
              Verifică cotele actuale înainte de a plasa pariul. Analiză statistică — nu sfat de pariere.
            </div>

            <button onClick={clear} style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Golește biletul
            </button>
          </>
        )}
      </main>
    </div>
  )
}
