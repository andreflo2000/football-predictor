'use client'

import { useState, useEffect, useCallback } from 'react'
import { getLeagues, getFixtures, getPrediction, League, Fixture, Prediction } from '@/lib/api'
import PredictionCard from '@/components/PredictionCard'
import ProbabilityChart from '@/components/ProbabilityChart'
import ScoreGrid from '@/components/ScoreGrid'
import TeamStatsPanel from '@/components/TeamStatsPanel'
import ModelBreakdown from '@/components/ModelBreakdown'

export default function Home() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFixtures, setLoadingFixtures] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'models'>('overview')

  useEffect(() => {
    getLeagues().then(setLeagues).catch(console.error)
  }, [])

  const handleLeagueChange = async (leagueId: number) => {
    const league = leagues.find(l => l.id === leagueId) || null
    setSelectedLeague(league)
    setSelectedFixture(null)
    setPrediction(null)
    setError(null)

    if (!league) return
    setLoadingFixtures(true)
    try {
      const fx = await getFixtures(leagueId)
      setFixtures(fx)
    } catch (e) {
      setFixtures([])
    } finally {
      setLoadingFixtures(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedFixture || !selectedLeague) return
    setLoading(true)
    setError(null)
    setPrediction(null)

    try {
      const result = await getPrediction(
        selectedFixture.home,
        selectedFixture.away,
        selectedLeague.id,
        selectedFixture.home_id,
        selectedFixture.away_id
      )
      setPrediction(result)
      setActiveTab('overview')
    } catch (e) {
      setError('Eroare la obținerea predicției. Verificați că backend-ul rulează.')
    } finally {
      setLoading(false)
    }
  }

  // Demo: Man City vs Arsenal
  const handleDemoPredict = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPrediction('Manchester City', 'Arsenal', 39, 50, 42)
      setPrediction(result)
      setActiveTab('overview')
    } catch (e) {
      setError('Backend offline. Porniți FastAPI cu: uvicorn main:app --reload')
    } finally {
      setLoading(false)
    }
  }

  const grouped = leagues.reduce((acc, l) => {
    if (!acc[l.confederation]) acc[l.confederation] = []
    acc[l.confederation].push(l)
    return acc
  }, {} as Record<string, League[]>)

  return (
    <div className="min-h-screen pitch-grid scanlines">
      {/* Header */}
      <header className="border-b border-[#1a3d22] bg-[#050f08]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00ff6a] flex items-center justify-center animate-pulse-glow">
              <span className="text-black font-bold text-xs">⚽</span>
            </div>
            <div>
              <h1 className="font-display font-800 text-xl tracking-widest text-white uppercase glow-text">
                FootPredict
              </h1>
              <p className="text-[10px] text-[#00ff6a]/50 tracking-[0.2em] uppercase font-mono">
                xG · Elo · XGBoost Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#1a3d22]">
            <div className="w-2 h-2 rounded-full bg-[#00ff6a] animate-pulse" />
            <span className="text-[#00ff6a]/60">LIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Selector Panel */}
        <div className="ticket-card p-6 mb-6 animate-in">
          <h2 className="font-display text-xs font-600 tracking-[0.3em] uppercase text-[#00ff6a]/60 mb-4">
            Selectare Meci
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Liga */}
            <div>
              <label className="block text-xs font-mono text-[#4a6b50] mb-2 uppercase tracking-wider">
                Ligă ({leagues.length})
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#071309] border border-[#1a3d22] text-white rounded-lg px-4 py-3 text-sm font-display focus:border-[#00ff6a] focus:outline-none focus:ring-1 focus:ring-[#00ff6a]/20 cursor-pointer transition-colors"
                  onChange={e => handleLeagueChange(Number(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>Alege liga...</option>
                  {Object.entries(grouped).map(([conf, lgList]) => (
                    <optgroup key={conf} label={`── ${conf} ──`} className="text-[#4a6b50]">
                      {lgList.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.flag} {l.name} — {l.country}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3d22] pointer-events-none">▼</div>
              </div>
            </div>

            {/* Meci */}
            <div>
              <label className="block text-xs font-mono text-[#4a6b50] mb-2 uppercase tracking-wider">
                Meci
              </label>
              <div className="relative">
                <select
                  className="w-full bg-[#071309] border border-[#1a3d22] text-white rounded-lg px-4 py-3 text-sm font-display focus:border-[#00ff6a] focus:outline-none focus:ring-1 focus:ring-[#00ff6a]/20 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onChange={e => {
                    const f = fixtures.find(fx => fx.id === Number(e.target.value)) || null
                    setSelectedFixture(f)
                    setPrediction(null)
                  }}
                  disabled={!selectedLeague || loadingFixtures}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {loadingFixtures ? 'Se încarcă...' : 'Alege meciul...'}
                  </option>
                  {fixtures.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.home} vs {f.away} {f.date ? `(${f.date})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a3d22] pointer-events-none">▼</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-mono text-[#4a6b50] mb-0 uppercase tracking-wider">
                Predicție
              </label>
              <button
                onClick={handlePredict}
                disabled={!selectedFixture || loading}
                className="flex-1 bg-[#00ff6a] text-black font-display font-700 uppercase tracking-widest text-sm rounded-lg px-6 py-3 hover:bg-[#00c950] disabled:opacity-30 disabled:cursor-not-allowed transition-all glow-green"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analizez...
                  </span>
                ) : '⚡ Prezice'}
              </button>
              <button
                onClick={handleDemoPredict}
                className="flex-1 bg-transparent border border-[#1a3d22] text-[#4a6b50] font-display uppercase tracking-widest text-xs rounded-lg px-6 py-2 hover:border-[#00ff6a]/40 hover:text-[#00ff6a]/60 transition-all"
              >
                Demo: Man City vs Arsenal
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-950/30 border border-red-800/40 rounded-lg p-3 text-red-400 text-sm font-mono">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-4 animate-in">
            {/* Match header */}
            <div className="ticket-card p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-[#4a6b50] uppercase tracking-widest">
                  {selectedLeague?.flag} {selectedLeague?.name || 'Football'}
                </span>
                {prediction.demo && (
                  <span className="text-xs font-mono bg-yellow-900/30 text-yellow-400 border border-yellow-800/40 px-2 py-1 rounded">
                    DEMO DATA
                  </span>
                )}
                <span className="text-xs font-mono text-[#00ff6a]/40">
                  {prediction.prediction.method}
                </span>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="text-center flex-1">
                  <p className="font-display font-800 text-2xl md:text-4xl uppercase tracking-wide">
                    {prediction.home_team}
                  </p>
                  <p className="text-[#00ff6a] font-mono font-700 text-2xl mt-1">
                    {prediction.prediction.home_win}%
                  </p>
                  <p className="text-xs text-[#4a6b50] uppercase tracking-widest mt-1">Victorie</p>
                </div>

                <div className="text-center px-6">
                  <div className="border border-[#1a3d22] rounded-lg px-4 py-2">
                    <p className="font-mono text-[#4a6b50] text-xs uppercase">Egal</p>
                    <p className="font-display font-700 text-xl text-white">{prediction.prediction.draw}%</p>
                  </div>
                  <div className="flex gap-2 mt-3 justify-center text-sm font-mono text-[#1a3d22]">
                    <span>{prediction.expected_goals.home}</span>
                    <span>:</span>
                    <span>{prediction.expected_goals.away}</span>
                  </div>
                  <p className="text-[10px] text-[#1a3d22] uppercase tracking-widest">xG așteptat</p>
                </div>

                <div className="text-center flex-1">
                  <p className="font-display font-800 text-2xl md:text-4xl uppercase tracking-wide">
                    {prediction.away_team}
                  </p>
                  <p className="text-[#4a6b50] font-mono font-700 text-2xl mt-1">
                    {prediction.prediction.away_win}%
                  </p>
                  <p className="text-xs text-[#4a6b50] uppercase tracking-widest mt-1">Victorie</p>
                </div>
              </div>

              {/* Probability bar */}
              <div className="mt-6 flex rounded-full overflow-hidden h-3">
                <div
                  className="bg-[#00ff6a] transition-all duration-1000"
                  style={{ width: `${prediction.prediction.home_win}%` }}
                />
                <div
                  className="bg-[#1e3a5f] transition-all duration-1000"
                  style={{ width: `${prediction.prediction.draw}%` }}
                />
                <div
                  className="bg-[#3b1010] transition-all duration-1000"
                  style={{ width: `${prediction.prediction.away_win}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#4a6b50] mt-1 px-1">
                <span>1</span><span>X</span><span>2</span>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 bg-[#071309] rounded-xl p-1 border border-[#1a3d22]">
              {(['overview', 'scores', 'models'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-display font-600 uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-[#0d2416] text-[#00ff6a] border border-[#1a3d22]'
                      : 'text-[#4a6b50] hover:text-white'
                  }`}
                >
                  {tab === 'overview' ? '📊 Statistici' : tab === 'scores' ? '⚽ Scoruri' : '🤖 Modele'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamStatsPanel
                  team={prediction.home_team}
                  stats={prediction.team_stats.home}
                  side="home"
                />
                <TeamStatsPanel
                  team={prediction.away_team}
                  stats={prediction.team_stats.away}
                  side="away"
                />
                <div className="md:col-span-2">
                  <ProbabilityChart prediction={prediction} />
                </div>
              </div>
            )}

            {activeTab === 'scores' && (
              <ScoreGrid scores={prediction.top_scores} />
            )}

            {activeTab === 'models' && (
              <ModelBreakdown breakdown={prediction.model_breakdown} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!prediction && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">⚽</div>
            <p className="font-display text-[#1a3d22] uppercase tracking-[0.3em] text-sm">
              Selectează o ligă și un meci pentru predicție
            </p>
            <p className="text-xs font-mono text-[#1a3d22]/50 mt-2">
              sau apasă Demo pentru a vedea Man City vs Arsenal
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0d1f10] mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-[#1a3d22]/60">
            FootPredict — xG · Elo · XGBoost · Poisson Dixon-Coles
          </p>
          <p className="text-[10px] font-mono text-[#1a3d22]/30 mt-1">
            Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
