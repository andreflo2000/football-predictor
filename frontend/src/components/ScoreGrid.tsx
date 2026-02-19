'use client'

interface Score {
  score: string
  home_goals: number
  away_goals: number
  probability: number
}

interface Props {
  scores: Score[]
}

export default function ScoreGrid({ scores }: Props) {
  const maxProb = scores[0]?.probability || 1

  return (
    <div className="ticket-card p-6">
      <h3 className="font-display text-xs font-600 tracking-[0.3em] uppercase text-[#00ff6a]/60 mb-4">
        Top Scoruri Probabile (Poisson Dixon-Coles)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {scores.map((s, i) => (
          <div
            key={s.score}
            className={`score-badge p-4 text-center ${i === 0 ? 'border-[#00ff6a]/40' : ''}`}
            style={{ opacity: 0.4 + 0.6 * (s.probability / maxProb) }}
          >
            <div className={`font-display font-800 text-3xl tracking-tight ${i === 0 ? 'text-[#00ff6a] glow-text' : 'text-white'}`}>
              {s.score}
            </div>
            <div className="font-mono text-[#00ff6a] text-sm mt-1 font-700">
              {s.probability.toFixed(1)}%
            </div>
            {/* Mini bar */}
            <div className="mt-2 h-1 bg-[#1a3d22] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00ff6a] rounded-full transition-all"
                style={{ width: `${(s.probability / maxProb) * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#4a6b50] mt-1">
              #{i + 1}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[#071309] rounded-lg border border-[#1a3d22]">
        <p className="text-xs font-mono text-[#4a6b50]">
          <span className="text-[#00ff6a]">Metodologie:</span> Model Poisson bidirecțional cu corecție Dixon-Coles
          pentru scoruri mici (0:0, 1:0, 0:1, 1:1). λ (goluri gazdă) și μ (goluri oaspete)
          sunt calculate din xG mediu ponderat ajustat cu home advantage factor 1.15.
        </p>
      </div>
    </div>
  )
}
