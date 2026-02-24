'use client'

import { useState, useEffect } from 'react'

interface SavedMatch {
  id: string
  home: string
  away: string
  league: string
  flag: string
  date: string
  time: string
  prediction: string
  result: 'correct' | 'wrong' | null
  addedAt: string
}

function getMatches(): SavedMatch[] {
  try { return JSON.parse(localStorage.getItem('fp_saved_matches') || '[]') } catch { return [] }
}
function saveMatches(matches: SavedMatch[]) {
  localStorage.setItem('fp_saved_matches', JSON.stringify(matches))
}
function getResults(): Record<string, 'correct' | 'wrong'> {
  try { return JSON.parse(localStorage.getItem('fp_results') || '{}') } catch { return {} }
}
function saveResult(id: string, val: 'correct' | 'wrong' | null) {
  const r = getResults()
  if (val === null) delete r[id]
  else r[id] = val
  localStorage.setItem('fp_results', JSON.stringify(r))
}

const DEMO_SAVED: SavedMatch[] = [
  { id: 'd1', home: 'Tottenham', away: 'Arsenal', league: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', date: '22.02.2026', time: '18:30', prediction: 'Arsenal 58%', result: null, addedAt: '2026-02-22' },
  { id: 'd2', home: 'PSG', away: 'Lens', league: 'Ligue 1', flag: '🇫🇷', date: '22.02.2026', time: '21:05', prediction: 'PSG 72%', result: null, addedAt: '2026-02-22' },
  { id: 'd3', home: 'FCSB', away: 'CFR Cluj', league: 'Superliga', flag: '🇷🇴', date: '22.02.2026', time: '20:30', prediction: 'FCSB 48%', result: null, addedAt: '2026-02-22' },
  { id: 'd4', home: 'Atletico Madrid', away: 'Club Brugge', league: 'Champions League', flag: '🏆', date: '24.02.2026', time: '19:45', prediction: 'Atletico 61%', result: null, addedAt: '2026-02-22' },
  { id: 'd5', home: 'Real Madrid', away: 'Benfica', league: 'Champions League', flag: '🏆', date: '25.02.2026', time: '22:00', prediction: 'Real Madrid 68%', result: null, addedAt: '2026-02-22' },
]

function StatsBar({ matches, results }: { matches: SavedMatch[]; results: Record<string, 'correct' | 'wrong'> }) {
  const total = matches.length
  const correct = matches.filter(m => results[m.id] === 'correct').length
  const wrong = matches.filter(m => results[m.id] === 'wrong').length
  const pending = total - correct - wrong
  const rate = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : null
  if (total === 0) return null
  return (
    <div className="card p-5 mb-6 fade-in">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Statistici predicții</span>
        {rate !== null && (
          <span className={`badge ${rate >= 60 ? 'badge-green' : rate >= 40 ? 'badge-amber' : 'badge-red'}`}>
            {rate}% rată succes
          </span>
        )}
      </div>
      <div className="flex gap-6">
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Corecte ✓', value: correct, color: 'text-green-400' },
          { label: 'Greșite ✗', value: wrong, color: 'text-red-400' },
          { label: 'Așteptare', value: pending, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className={`font-display text-3xl ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-mono text-gray-600 uppercase mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      {(correct + wrong) > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mt-4">
          <div className="bg-green-500 transition-all rounded-l-full" style={{ flex: correct }} />
          <div className="bg-red-500 transition-all rounded-r-full" style={{ flex: wrong }} />
          <div className="bg-gray-700 transition-all" style={{ flex: pending }} />
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, result, onResult, onDelete }: {
  match: SavedMatch; result: 'correct' | 'wrong' | null
  onResult: (id: string, val: 'correct' | 'wrong' | null) => void
  onDelete: (id: string) => void
}) {
  const borderColor = result === 'correct' ? 'border-green-500/50' : result === 'wrong' ? 'border-red-500/50' : 'border-green-900/30'
  const shadow = result === 'correct' ? '0 0 16px rgba(16,185,129,0.10)' : result === 'wrong' ? '0 0 16px rgba(239,68,68,0.10)' : ''
  return (
    <div className={`card p-4 border ${borderColor} fade-in`} style={{ boxShadow: shadow }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-500">{match.flag} {match.league}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-600">📅 {match.date} · 🕐 {match.time}</span>
          <button onClick={() => onDelete(match.id)} className="text-gray-700 hover:text-red-400 transition-colors text-xs ml-1">✕</button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="font-display text-xl text-white tracking-wide">{match.home} <span className="text-gray-600 text-sm font-sans">vs</span> {match.away}</p>
        </div>
        <div className="text-xs font-mono text-green-400 bg-green-950/50 border border-green-900/40 rounded-lg px-3 py-1.5 shrink-0 ml-3">
          🔮 {match.prediction}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-green-900/20">
        <span className="text-[11px] font-mono text-gray-600 uppercase tracking-wider">Predicție corectă?</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => onResult(match.id, result === 'correct' ? null : 'correct')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${result === 'correct' ? 'bg-green-500 text-white shadow-lg shadow-green-500/25' : 'bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500/20'}`}
          >✓ Da</button>
          <button
            onClick={() => onResult(match.id, result === 'wrong' ? null : 'wrong')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${result === 'wrong' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20'}`}
          >✗ Nu</button>
        </div>
      </div>
    </div>
  )
}

function AddMatchModal({ onAdd, onClose }: { onAdd: (m: SavedMatch) => void; onClose: () => void }) {
  const [form, setForm] = useState({ home: '', away: '', league: '', flag: '⚽', date: '', time: '', prediction: '' })
  const handleSubmit = () => {
    if (!form.home || !form.away) return
    onAdd({ ...form, id: `m-${Date.now()}`, result: null, addedAt: new Date().toISOString().split('T')[0] })
    onClose()
  }
  const fields = [
    { key: 'home', label: 'Echipă gazdă', placeholder: 'ex: Manchester City' },
    { key: 'away', label: 'Echipă oaspete', placeholder: 'ex: Arsenal' },
    { key: 'league', label: 'Ligă / Competiție', placeholder: 'ex: Premier League' },
    { key: 'date', label: 'Data (ZZ.LL.AAAA)', placeholder: 'ex: 22.02.2026' },
    { key: 'time', label: 'Ora (România)', placeholder: 'ex: 22:00' },
    { key: 'prediction', label: 'Predicția ta', placeholder: 'ex: Manchester City 65%' },
  ]
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-white tracking-wide">➕ Adaugă Meci</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-lg">✕</button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input type="text" placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full select-styled text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Anulează</button>
          <button onClick={handleSubmit} disabled={!form.home || !form.away} className="btn-accent flex-1">Salvează</button>
        </div>
      </div>
    </div>
  )
}

const FILTERS = [
  { key: 'all', label: 'Toate' },
  { key: 'pending', label: '⏳ Așteptare' },
  { key: 'correct', label: '✓ Corecte' },
  { key: 'wrong', label: '✗ Greșite' },
]

export default function ResultatePage() {
  const [matches, setMatches] = useState<SavedMatch[]>([])
  const [results, setResults] = useState<Record<string, 'correct' | 'wrong'>>({})
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const saved = getMatches()
    if (saved.length === 0) { saveMatches(DEMO_SAVED); setMatches(DEMO_SAVED) }
    else setMatches(saved)
    setResults(getResults())
    setInitialized(true)
  }, [])

  const handleResult = (id: string, val: 'correct' | 'wrong' | null) => {
    saveResult(id, val); setResults(getResults())
  }
  const handleAdd = (m: SavedMatch) => {
    const updated = [m, ...matches]; saveMatches(updated); setMatches(updated)
  }
  const handleDelete = (id: string) => {
    const updated = matches.filter(m => m.id !== id); saveMatches(updated); setMatches(updated)
    const r = getResults(); delete r[id]; localStorage.setItem('fp_results', JSON.stringify(r)); setResults(r)
  }
  const handleClearAll = () => {
    if (!confirm('Ștergi toate meciurile înregistrate?')) return
    saveMatches([]); setMatches([]); localStorage.removeItem('fp_results'); setResults({})
  }

  const filtered = matches.filter(m => {
    if (filter === 'pending') return !results[m.id]
    if (filter === 'correct') return results[m.id] === 'correct'
    if (filter === 'wrong') return results[m.id] === 'wrong'
    return true
  })

  if (!initialized) return (
    <div className="app-bg grid-bg min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="app-bg grid-bg min-h-screen">
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-sm">⚽</div>
            <span className="font-display text-xl text-white tracking-widest">FOOTPREDICT</span>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link">Predicții</a>
            <a href="/weekly" className="nav-link active">Rezultate</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 fade-in">
          <div>
            <h1 className="font-display text-4xl text-white tracking-widest mb-1">REZULTATE ÎNREGISTRATE</h1>
            <p className="text-xs font-mono text-green-400 uppercase tracking-widest">
              Urmărește-ți predicțiile și rata de succes
            </p>
          </div>
          <div className="flex gap-2 shrink-0 ml-4">
            <button onClick={() => setShowAdd(true)} className="btn-accent text-sm">➕ Adaugă</button>
            {matches.length > 0 && (
              <button onClick={handleClearAll} className="btn-secondary text-sm">🗑</button>
            )}
          </div>
        </div>

        <StatsBar matches={matches} results={results} />

        {matches.length > 0 && (
          <div className="tab-bar mb-5 fade-in">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? matches.length
                : f.key === 'pending' ? matches.filter(m => !results[m.id]).length
                : matches.filter(m => results[m.id] === f.key).length
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} className={`tab ${filter === f.key ? 'active' : ''}`}>
                  {f.label} <span className="ml-1 text-[10px] opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-24 fade-in">
            <div className="text-6xl opacity-10 mb-4">📋</div>
            <p className="font-display text-2xl text-gray-600 tracking-widest mb-2">
              {matches.length === 0 ? 'NICIUN MECI ÎNREGISTRAT' : 'NICIUN MECI ÎN ACEASTĂ CATEGORIE'}
            </p>
            <p className="text-gray-700 text-sm font-mono mb-6">
              {matches.length === 0 ? 'Apasă ➕ Adaugă pentru prima predicție' : 'Schimbă filtrul'}
            </p>
            {matches.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="btn-accent">➕ Adaugă primul meci</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <MatchCard key={m.id} match={m} result={results[m.id] || null} onResult={handleResult} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {showAdd && <AddMatchModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      <footer className="border-t border-green-900/30 mt-12 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-[11px] font-mono text-gray-700">FootPredict — Scop educațional. Nu reprezintă sfaturi de pariuri.</p>
        </div>
      </footer>
    </div>
  )
}
