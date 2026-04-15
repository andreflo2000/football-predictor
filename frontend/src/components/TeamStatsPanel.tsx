'use client'

interface TeamStats {
  form: string[]
  form_score: number
  xg_for: number
  xg_against: number
  elo: number
}

interface Props {
  team: string
  stats: TeamStats
  side: 'home' | 'away'
}

const formColors: Record<string, string> = {
  W: 'form-w', D: 'form-d', L: 'form-l'
}

export default function TeamStatsPanel({ team, stats, side }: Props) {
  const accentColor = side === 'home' ? '#00ff6a' : '#60a5fa'

  return (
    <div className="ticket-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-800 text-lg uppercase tracking-wide">{team}</h3>
        <span
          className="text-xs font-mono px-2 py-1 rounded border"
          style={{ borderColor: accentColor + '40', color: accentColor }}
        >
          {side === 'home' ? '🏠 GAZDĂ' : '✈ OASPETE'}
        </span>
      </div>

      {/* Elo Rating */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-mono text-[#4a6b50] uppercase tracking-wider">Elo Rating</span>
          <span className="font-mono font-700 text-lg" style={{ color: accentColor }}>
            {stats.elo}
          </span>
        </div>
        <div className="h-2 bg-[#1a3d22] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min((stats.elo - 1000) / 1000 * 100, 100)}%`,
              backgroundColor: accentColor
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-[#1a3d22] mt-1">
          <span>1000</span><span>1500</span><span>2000</span>
        </div>
      </div>

      {/* Form */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-[#4a6b50] uppercase tracking-wider">Formă recentă</span>
          <span className="font-mono text-xs" style={{ color: accentColor }}>
            {stats.form_score}%
          </span>
        </div>
        <div className="flex gap-1.5">
          {stats.form.map((r, i) => (
            <span
              key={i}
              className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-700 rounded ${formColors[r] || 'form-d'}`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* xG Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#071309] rounded-lg p-3 border border-[#1a3d22]">
          <p className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-wider mb-1">xG For</p>
          <p className="font-mono font-700 text-xl" style={{ color: accentColor }}>
            {stats.xg_for.toFixed(2)}
          </p>
          <p className="text-[10px] text-[#1a3d22] mt-1">goluri așteptate</p>
        </div>
        <div className="bg-[#071309] rounded-lg p-3 border border-[#1a3d22]">
          <p className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-wider mb-1">xG Against</p>
          <p className="font-mono font-700 text-xl text-[#f87171]">
            {stats.xg_against.toFixed(2)}
          </p>
          <p className="text-[10px] text-[#1a3d22] mt-1">goluri concepute</p>
        </div>
      </div>
    </div>
  )
}
