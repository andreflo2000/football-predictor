'use client'

interface Props {
  breakdown: {
    elo: { home_win: number; draw: number; away_win: number; home_rating: number; away_rating: number }
    poisson: { home_win: number; draw: number; away_win: number }
    xgboost?: { home_win: number; draw: number; away_win: number; method: string } | null
  }
}

const models = [
  {
    key: 'elo' as const,
    name: 'Elo Rating System',
    color: '#a78bfa',
    icon: '♟',
    description: 'Calcul bazat pe diferența de rating Elo cu home advantage +100 pts. K-factor=32.',
    weight: '20%',
  },
  {
    key: 'poisson' as const,
    name: 'Poisson Dixon-Coles',
    color: '#fbbf24',
    icon: '📊',
    description: 'Distribuție Poisson bidirecțională ajustată pentru scoruri mici. Input: xG mediu ponderat.',
    weight: '40%',
  },
  {
    key: 'xgboost' as const,
    name: 'XGBoost Classifier',
    color: '#00ff6a',
    icon: '🤖',
    description: '14 feature-uri: Elo diff, xG for/against, formă, H2H. n_estimators=200, max_depth=6.',
    weight: '40%',
  },
]

function ModelRow({
  name, color, icon, description, weight, data
}: {
  name: string; color: string; icon: string; description: string; weight: string
  data: { home_win: number; draw: number; away_win: number } | null | undefined
}) {
  if (!data) {
    return (
      <div className="ticket-card p-5 opacity-40">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-display font-700 uppercase tracking-wide">{name}</p>
            <p className="text-xs font-mono text-[#4a6b50]">Nu disponibil</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-display font-700 uppercase tracking-wide">{name}</p>
            <p className="text-[10px] font-mono" style={{ color }}>Peso ensemble: {weight}</p>
          </div>
        </div>
      </div>

      <p className="text-xs font-mono text-[#4a6b50] mb-4 leading-relaxed">{description}</p>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '1 Gazdă', value: data.home_win },
          { label: 'X Egal', value: data.draw },
          { label: '2 Oaspete', value: data.away_win },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#071309] rounded-lg p-3 border border-[#1a3d22] text-center">
            <p className="text-[10px] font-mono text-[#4a6b50] uppercase mb-1">{label}</p>
            <p className="font-mono font-700 text-lg" style={{ color }}>{value.toFixed(1)}%</p>
            <div className="mt-2 h-1 bg-[#1a3d22] rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${value}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ModelBreakdown({ breakdown }: Props) {
  return (
    <div className="space-y-4">
      <div className="ticket-card p-4">
        <p className="text-xs font-mono text-[#4a6b50] leading-relaxed">
          <span className="text-[#00ff6a]">Ensemble Method:</span> Predicția finală combină cele 3 modele
          cu ponderi: <span className="text-[#00ff6a]">XGBoost 40%</span> +
          <span className="text-[#fbbf24]"> Poisson 40%</span> +
          <span className="text-[#a78bfa]"> Elo 20%</span>.
          Suma probabilităților este normalizată la 100%.
        </p>
      </div>

      {models.map(m => (
        <ModelRow
          key={m.key}
          {...m}
          data={m.key === 'xgboost' ? breakdown.xgboost : breakdown[m.key as 'elo' | 'poisson']}
        />
      ))}
    </div>
  )
}
