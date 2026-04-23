import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const revalidate = 3600 // Regenerare ISR la fiecare ora

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api-n9sl.onrender.com'

const LEAGUES: Record<string, {
  name: string
  flag: string
  country: string
  acc65: number
  acc70: number
  picks65: number
  description: string
  keywords: string[]
  teams: string[]
  apiNames: string[] // variantele de nume din API
}> = {
  'premier-league': {
    name: 'Premier League',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    country: 'Anglia',
    acc65: 70.0,
    acc70: 71.4,
    picks65: 40,
    description: 'Predicții Premier League bazate pe model XGBoost cu 110 variabile: Elo, xG, forme recente și inteligență de piață.',
    keywords: ['predicții Premier League', 'pronosticuri Premier League', 'Premier League predictions AI', 'football analysis England'],
    teams: ['Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Tottenham', 'Manchester United', 'Aston Villa', 'Newcastle'],
    apiNames: ['Premier League', 'England Premier League', 'EPL'],
  },
  'la-liga': {
    name: 'La Liga',
    flag: '🇪🇸',
    country: 'Spania',
    acc65: 86.1,
    acc70: 92.9,
    picks65: 36,
    description: 'Predicții La Liga cu cea mai ridicată acuratețe: 86.1% la confidence ≥65%. Model AI bazat pe XGBoost, Elo și cote Pinnacle.',
    keywords: ['predicții La Liga', 'pronosticuri La Liga', 'La Liga predictions AI', 'football analysis Spain', 'pronosticos La Liga'],
    teams: ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Real Sociedad', 'Villarreal', 'Athletic Bilbao'],
    apiNames: ['La Liga', 'Spain La Liga', 'Primera Division'],
  },
  'serie-a': {
    name: 'Serie A',
    flag: '🇮🇹',
    country: 'Italia',
    acc65: 71.1,
    acc70: 71.9,
    picks65: 45,
    description: 'Predicții Serie A prin analiză cantitativă avansată. Model AI antrenat pe 225.000 meciuri cu integrare cote sharp.',
    keywords: ['predicții Serie A', 'pronosticuri Serie A', 'Serie A predictions AI', 'football analysis Italy', 'pronostici Serie A'],
    teams: ['Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'Lazio', 'Roma', 'Fiorentina', 'Atalanta'],
    apiNames: ['Serie A', 'Italy Serie A', 'Serie A TIM'],
  },
  'bundesliga': {
    name: 'Bundesliga',
    flag: '🇩🇪',
    country: 'Germania',
    acc65: 79.4,
    acc70: 82.6,
    picks65: 34,
    description: 'Predicții Bundesliga cu acuratețe 79.4% la confidence ≥65%. Analiză cantitativă bazată pe modele statistice avansate.',
    keywords: ['predicții Bundesliga', 'pronosticuri Bundesliga', 'Bundesliga predictions AI', 'football analysis Germany', 'Bundesliga Prognosen'],
    teams: ['Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig', 'Wolfsburg', 'Eintracht Frankfurt'],
    apiNames: ['Bundesliga', 'Germany Bundesliga', '1. Bundesliga'],
  },
  'ligue-1': {
    name: 'Ligue 1',
    flag: '🇫🇷',
    country: 'Franța',
    acc65: 79.4,
    acc70: 76.9,
    picks65: 34,
    description: 'Predicții Ligue 1 prin model AI XGBoost. Acuratețe 79.4% la picks de înaltă confidență, verificate out-of-sample.',
    keywords: ['predicții Ligue 1', 'pronosticuri Ligue 1', 'Ligue 1 predictions AI', 'football analysis France', 'pronostics Ligue 1'],
    teams: ['Paris Saint-Germain', 'Marseille', 'Monaco', 'Lyon', 'Lille', 'Nice', 'Lens'],
    apiNames: ['Ligue 1', 'France Ligue 1', 'Ligue 1 Uber Eats'],
  },
  'champions-league': {
    name: 'Champions League',
    flag: '🏆',
    country: 'Europa',
    acc65: 72.5,
    acc70: 75.0,
    picks65: 28,
    description: 'Predicții Champions League bazate pe model XGBoost cu rating Elo european și statistici avansate pentru toate cluburile din competiție.',
    keywords: ['predicții Champions League', 'pronosticuri Champions League', 'UCL predictions AI', 'Champions League analysis', 'predictii UCL'],
    teams: ['PSG', 'Bayern Munich', 'Arsenal', 'Atletico Madrid'],
    apiNames: ['UEFA Champions League', 'Champions League', 'UCL'],
  },
  'europa-league': {
    name: 'Europa League',
    flag: '🌍',
    country: 'Europa',
    acc65: 70.8,
    acc70: 73.3,
    picks65: 24,
    description: 'Predicții Europa League prin analiză cantitativă. Model antrenat pe toate competițiile UEFA cu Elo cross-ligă și forme recente.',
    keywords: ['predicții Europa League', 'pronosticuri Europa League', 'UEL predictions AI', 'Europa League analysis', 'predictii UEL'],
    teams: ['Nottingham Forest', 'Aston Villa', 'Braga', 'Freiburg'],
    apiNames: ['UEFA Europa League', 'Europa League', 'UEL'],
  },
  'primeira-liga': {
    name: 'Primeira Liga',
    flag: '🇵🇹',
    country: 'Portugalia',
    acc65: 73.2,
    acc70: 76.4,
    picks65: 41,
    description: 'Predicții Primeira Liga portugheză prin model AI. Acuratețe 73.2% la ≥65% confidence pe meciuri din campionatul portughez.',
    keywords: ['predicții Primeira Liga', 'pronosticuri Primeira Liga', 'Liga Portugal predictions', 'football analysis Portugal', 'pronosticos liga portuguesa'],
    teams: ['Benfica', 'Porto', 'Sporting CP', 'Braga', 'Vitoria Guimaraes', 'Famalicao', 'Nacional'],
    apiNames: ['Primeira Liga', 'Portugal Primeira Liga', 'Liga Portugal'],
  },
  'eredivisie': {
    name: 'Eredivisie',
    flag: '🇳🇱',
    country: 'Olanda',
    acc65: 74.6,
    acc70: 77.1,
    picks65: 35,
    description: 'Predicții Eredivisie olandeză prin analiză statistică avansată. Model XGBoost cu 110 variabile antrenat pe date din campionatul olandez.',
    keywords: ['predicții Eredivisie', 'pronosticuri Eredivisie', 'Eredivisie predictions AI', 'football analysis Netherlands', 'Eredivisie voorspellingen'],
    teams: ['Ajax', 'PSV Eindhoven', 'Feyenoord', 'AZ Alkmaar', 'Utrecht', 'Twente', 'Vitesse'],
    apiNames: ['Eredivisie', 'Netherlands Eredivisie', 'Dutch Eredivisie'],
  },
  'championship': {
    name: 'Championship',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    country: 'Anglia',
    acc65: 68.9,
    acc70: 71.2,
    picks65: 52,
    description: 'Predicții Championship (eșalonul 2 englez) prin model AI. Cel mai mare număr de picks per sezon datorită programului dens.',
    keywords: ['predicții Championship', 'pronosticuri Championship England', 'EFL Championship predictions AI', 'football analysis Championship', 'Championship predictions'],
    teams: ['Leeds United', 'Leicester City', 'Sunderland', 'Sheffield United', 'West Brom', 'Middlesbrough', 'Coventry'],
    apiNames: ['Championship', 'EFL Championship', 'England Championship'],
  },
}

interface Pick {
  home: string
  away: string
  league: string
  flag: string
  prediction: string
  confidence: number
  home_win: number
  draw: number
  away_win: number
  time?: string
  value_bet?: boolean
  over25?: number
}

async function fetchLeaguePicks(leagueInfo: typeof LEAGUES[string]): Promise<Pick[]> {
  try {
    const res = await fetch(`${API_BASE}/api/daily?min_confidence=0.65`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const picks: Pick[] = data.picks || data || []
    return picks.filter(p =>
      leagueInfo.apiNames.some(n =>
        p.league?.toLowerCase().includes(n.toLowerCase()) ||
        n.toLowerCase().includes(p.league?.toLowerCase() || '')
      )
    )
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  return Object.keys(LEAGUES).map(liga => ({ liga }))
}

export async function generateMetadata({ params }: { params: Promise<{ liga: string }> }): Promise<Metadata> {
  const { liga } = await params
  const l = LEAGUES[liga]
  if (!l) return {}
  return {
    title: `Predicții ${l.name} ${l.flag} — Oxiano AI`,
    description: l.description,
    keywords: l.keywords,
    alternates: { canonical: `https://oxiano.com/predictii/${liga}` },
    openGraph: {
      title: `Predicții ${l.name} — Oxiano`,
      description: `${l.acc65}% acuratețe la ≥65% confidence · Model AI XGBoost`,
      url: `https://oxiano.com/predictii/${liga}`,
    },
  }
}

function predLabel(prediction: string, home: string, away: string) {
  if (prediction === 'H') return { short: '1', label: home, color: '#4ade80' }
  if (prediction === 'D') return { short: 'X', label: 'Egal', color: '#f59e0b' }
  return { short: '2', label: away, color: '#22d3ee' }
}

function impliedOdds(confidence: number): string {
  const p = confidence / 100
  return (Math.round((1 / (p * 1.08)) * 100) / 100).toFixed(2)
}

export default async function LeaguePage({ params }: { params: Promise<{ liga: string }> }) {
  const { liga } = await params
  const l = LEAGUES[liga]
  if (!l) notFound()

  const todayPicks = await fetchLeaguePicks(l)
  const today = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Predicții ${l.name} — Oxiano`,
    description: l.description,
    url: `https://oxiano.com/predictii/${liga}`,
    author: { '@type': 'Organization', name: 'Oxiano', url: 'https://oxiano.com' },
    ...(todayPicks.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        name: `Predicții ${l.name} azi — ${today}`,
        numberOfItems: todayPicks.length,
        itemListElement: todayPicks.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${p.home} vs ${p.away}`,
          description: `Predicție: ${predLabel(p.prediction, p.home, p.away).label} — Confidence: ${p.confidence}%`,
        })),
      },
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #051F14 0%, #0A1128 100%)', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid #1f2937', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1000px', margin: '0 auto' }}>
          <a href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '18px', letterSpacing: '0.1em' }}>OXIANO</a>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <a href="/track-record" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px' }}>Track Record</a>
            <a href="/daily" style={{ background: '#22d3ee', color: '#000', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Picks azi →</a>
          </div>
        </nav>

        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>

          {/* Hero */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>{l.flag}</div>
            <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Predicții {l.name}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '16px', lineHeight: 1.7, maxWidth: '600px', margin: 0 }}>
              {l.description}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '48px' }}>
            {[
              { label: 'Acuratețe ≥65%', value: `${l.acc65}%`, color: l.acc65 >= 80 ? '#4ade80' : '#f59e0b' },
              { label: 'Acuratețe ≥70%', value: `${l.acc70}%`, color: l.acc70 >= 80 ? '#4ade80' : '#f59e0b' },
              { label: 'Picks analizate', value: l.picks65.toString(), color: '#22d3ee' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Picks de azi — sectiune SEO cu date reale */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
              Meciuri {l.name} azi — {today}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>
              Predicții generate automat prin model AI · Actualizate la 07:00
            </p>

            {todayPicks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayPicks.map((pick, i) => {
                  const pred = predLabel(pick.prediction, pick.home, pick.away)
                  const odds = impliedOdds(pick.confidence)
                  const isValue = pick.value_bet
                  return (
                    <div key={i} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {pick.time && (
                            <div style={{ fontSize: '11px', color: '#4b5563', fontFamily: 'monospace', marginBottom: '4px' }}>
                              {pick.flag} {pick.league} · {pick.time}
                            </div>
                          )}
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e5e7eb', marginBottom: '6px' }}>
                            {pick.home} <span style={{ color: '#4b5563' }}>vs</span> {pick.away}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: pred.color, padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                              {pred.short} — {pred.label}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                              {pick.confidence}% confidence
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                              cotă ~{odds}
                            </span>
                            {isValue && (
                              <span style={{ fontSize: '11px', color: '#f59e0b' }}>💎 VALUE</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '12px', color: '#4b5563', fontFamily: 'monospace' }}>
                            <span>1: {Math.round(pick.home_win)}%</span>
                            <span>X: {Math.round(pick.draw)}%</span>
                            <span>2: {Math.round(pick.away_win)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div style={{ fontSize: '11px', color: '#374151', textAlign: 'center', marginTop: '8px' }}>
                  Doar picks cu confidence ≥65% · Analiză statistică — nu constituie sfat de pariere · <a href="/terms" style={{ color: '#374151' }}>Termeni</a>
                </div>
              </div>
            ) : (
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#4b5563' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Niciun pick cu confidence ≥65% pentru {l.name} azi.</div>
                <div style={{ fontSize: '12px', color: '#4b5563' }}>Modelul filtrează strict — afișăm doar când avem edge real față de piață.</div>
                <a href="/daily" style={{ display: 'inline-block', marginTop: '20px', background: '#22d3ee', color: '#000', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  Vezi toate picks-urile zilei →
                </a>
              </div>
            )}
          </div>

          {/* Metodologie */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '28px', marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '16px' }}>
              Cum funcționează modelul
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { title: 'XGBoost cu 110 variabile', desc: 'Model antrenat pe 225.000 meciuri din ligile europene (2005–2026), incluzând xG, forme, Elo și statistici avansate.' },
                { title: 'Inteligență de piață', desc: 'Integrăm cotele Pinnacle (sharp bookmaker) pentru a detecta edge-ul față de piață și a filtra meciurile cu valoare reală.' },
                { title: 'Backtest out-of-sample', desc: `Acuratețea de ${l.acc65}% la ≥65% confidence este verificată pe date din Oct 2025–Mar 2026, nevăzute de model.` },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: '#22d3ee', marginTop: '2px', flexShrink: 0 }}>▸</div>
                  <div>
                    <strong style={{ color: '#e5e7eb' }}>{item.title}</strong>
                    <span style={{ color: '#6b7280' }}> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Echipe acoperite */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              Echipe acoperite ({l.country})
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {l.teams.map(team => (
                <span key={team} style={{ background: '#1f2937', color: '#9ca3af', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                  {team}
                </span>
              ))}
              <span style={{ background: '#1f2937', color: '#6b7280', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                + toate celelalte
              </span>
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #0c1a3a 100%)', border: '1px solid #166534', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
              Vezi toate picks-urile de azi
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 20px' }}>
              Picks zilnice din toate ligile cu confidence ≥65% · Actualizate la 07:00 și 13:00
            </p>
            <a href="/daily" style={{ display: 'inline-block', background: '#22d3ee', color: '#000', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
              Picks zilnice →
            </a>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#4b5563' }}>
              Analiză statistică · Nu constituie sfat de pariere
            </div>
          </div>

          {/* Alte ligi — internal linking pentru SEO */}
          <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #1f2937' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>Alte ligi analizate:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(LEAGUES).filter(([k]) => k !== liga).map(([k, v]) => (
                <a key={k} href={`/predictii/${k}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '13px', background: '#111827', padding: '4px 12px', borderRadius: '6px', border: '1px solid #1f2937' }}>
                  {v.flag} {v.name}
                </a>
              ))}
            </div>
          </div>
        </main>

        <footer style={{ borderTop: '1px solid #1f2937', padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>
          © 2026 Oxiano · Quantitative Football Analysis ·{' '}
          <a href="/despre" style={{ color: '#4b5563' }}>Despre</a> ·{' '}
          <a href="/terms" style={{ color: '#4b5563' }}>Termeni</a> ·{' '}
          <a href="/privacy" style={{ color: '#4b5563' }}>Confidențialitate</a>
        </footer>
      </div>
    </>
  )
}
