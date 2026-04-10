'use client'
import { useLang } from '@/lib/LangContext'

const PILLARS_RO = [
  { icon: '⚙️', title: 'Algoritmi de ultimă generație', body: 'Modelul nostru principal este un clasificator XGBoost antrenat pe 225.000 de meciuri din ligile europene (2005–2026). Utilizăm 110 variabile independente — de la forme recente și statistici Expected Goals (xG), până la ratinguri Elo actualizate dinamic și diferențiale de piață față de bookmaker-ii sharp (Pinnacle).' },
  { icon: '📐', title: 'Validare out-of-sample riguroasă', body: 'Performanța nu este raportată pe datele de antrenament — ci exclusiv pe meciuri nevăzute de model (Oct 2025–Mar 2026). La La Liga, picks-urile cu confidence ≥65% au atins 86.1% acuratețe pe 36 de meciuri. Bundesliga: 79.4%. Ligue 1: 79.4%. Aceste cifre sunt reale, nu simulate.' },
  { icon: '📊', title: 'Inteligență de piață integrată', body: 'Integrăm cotele closing de la bookmaker-ii sharp pentru a calcula edge-ul față de piață și a filtra meciurile cu valoare statistică reală. Un pick fără edge față de piață nu este emis, indiferent de confidence-ul brut al modelului.' },
  { icon: '🔁', title: 'Actualizare continuă', body: 'Picks-urile sunt recalculate automat la 07:00 și 13:00 (ora Bucureștilor), înglobând toate meciurile disponibile pentru ziua curentă. Ratingurile Elo se actualizează după fiecare meci, iar formele sunt calculate pe ferestre glisante de 5 și 10 meciuri — home/away separat.' },
  { icon: '🎯', title: 'Criteriul Kelly pentru gestiunea riscului', body: 'Fiecare pick include un procent Kelly calculat pe baza confidence-ului modelului și a cotei implicite de piață. Criteriul Kelly este standardul matematic pentru optimizarea creșterii bankroll-ului pe termen lung, folosit de fondurile quant și traderii profesioniști.' },
  { icon: '🔒', title: 'Transparență și responsabilitate', body: 'Toate rezultatele istorice sunt stocate public în secțiunea Track Record. Nu ștergem picks-urile pierdute. Nu retrogradam confidence după rezultat. Oxiano nu deține licență ONJN și nu furnizează sfat de pariere — oferim analiză statistică în scop educațional și informativ.' },
]

const PILLARS_EN = [
  { icon: '⚙️', title: 'State-of-the-art algorithms', body: 'Our main model is an XGBoost classifier trained on 225,000 matches from European leagues (2005–2026). We use 110 independent features — from recent form and Expected Goals (xG) statistics, to dynamically updated Elo ratings and market differentials vs. sharp bookmakers (Pinnacle).' },
  { icon: '📐', title: 'Rigorous out-of-sample validation', body: 'Performance is not reported on training data — only on matches unseen by the model (Oct 2025–Mar 2026). In La Liga, picks with confidence ≥65% reached 86.1% accuracy across 36 matches. Bundesliga: 79.4%. Ligue 1: 79.4%. These figures are real, not simulated.' },
  { icon: '📊', title: 'Integrated market intelligence', body: 'We integrate closing odds from sharp bookmakers to calculate market edge and filter matches with genuine statistical value. A pick with no market edge is not issued, regardless of the model\'s raw confidence. This is the difference between a disciplined system and a noisy one.' },
  { icon: '🔁', title: 'Continuous updates', body: 'Picks are automatically recalculated at 07:00 and 13:00 (Bucharest time), incorporating all available matches for the current day. Elo ratings update after every match, and form windows are computed over rolling 5- and 10-match horizons — home/away split separately.' },
  { icon: '🎯', title: 'Kelly Criterion for risk management', body: 'Each pick includes a Kelly percentage calculated from the model\'s confidence and the implied market odds. The Kelly Criterion is the mathematical standard for optimising long-term bankroll growth, used by quant funds and professional traders.' },
  { icon: '🔒', title: 'Transparency and accountability', body: 'All historical results are stored publicly in the Track Record section. We do not delete losing picks. We do not downgrade confidence after the result. Oxiano does not hold an ONJN licence and does not provide betting advice — we offer statistical analysis for educational and informational purposes.' },
]

const STATS_RO = [
  { value: '225K+', label: 'meciuri în setul de antrenament' },
  { value: '110', label: 'variabile independente' },
  { value: '86.1%', label: 'acuratețe La Liga ≥65% conf.' },
  { value: '19.5K', label: 'perechi H2H cu istoric real' },
]

const STATS_EN = [
  { value: '225K+', label: 'matches in training set' },
  { value: '110', label: 'independent features' },
  { value: '86.1%', label: 'La Liga accuracy ≥65% conf.' },
  { value: '19.5K', label: 'H2H pairs with real history' },
]

export default function DesprePage() {
  const { lang } = useLang()
  const PILLARS = lang === 'en' ? PILLARS_EN : PILLARS_RO
  const STATS = lang === 'en' ? STATS_EN : STATS_RO
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #051F14 0%, #0A1128 100%)', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1f2937', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <a href="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Oxiano" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
          </a>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: 8, padding: '4px 14px', fontSize: 11, color: '#22d3ee', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
            {lang === 'en' ? "Oxiano's Mission" : 'Misiunea Oxiano'}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {lang === 'en' ? <>Rigorous probabilities,<br />not arbitrary predictions</> : <>Probabilități riguroase,<br />nu predicții arbitrare</>}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
            {lang === 'en'
              ? 'Oxiano was built with a single purpose: to apply quantitative methodology — used by hedge funds and algorithmic traders — to the analysis of European football. We do not provide certainties. We provide probabilities calculated with mathematical rigour.'
              : 'Oxiano a fost construit cu un singur scop: să aplice metodologia quantitativă — folosită de fondurile de hedging și traderii algoritmici — în analiza fotbalului european. Nu furnizăm certitudini. Furnizăm probabilități calculate cu rigoare matematică.'}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 64 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#22d3ee', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* De ce am construit Oxiano */}
        <div style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 16, padding: '36px 32px', marginBottom: 48 }}>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 18px' }}>{lang === 'en' ? 'Why Oxiano exists' : 'De ce există Oxiano'}</h2>
          <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.8, margin: '0 0 14px' }}>
            {lang === 'en'
              ? 'Oxiano was born from a simple conviction: football can be analysed with the same tools quant funds use to analyse financial markets. Gradient boosting, dynamic Elo ratings, market data integration — applied systematically, at scale, without subjectivity.'
              : 'Oxiano s-a născut dintr-o convingere simplă: fotbalul poate fi analizat cu aceleași instrumente cu care fondurile quant analizează piețele financiare. Gradient boosting, ratinguri Elo dinamice, integrare de date de piață — aplicate sistematic, pe volum mare, fără subiectivitate.'}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            {lang === 'en'
              ? 'Every figure on the platform — accuracy, confidence, edge, Kelly — has a documented mathematical formula and is computed on real, verifiable data from public sources. We do not sell certainties. We sell analytical structure applied to a complex sport.'
              : 'Fiecare cifră din platformă — acuratețe, confidence, edge, Kelly — are o formulă matematică documentată și este calculată pe date reale, verificabile, din surse publice. Nu vindem certitudini. Vindem structură analitică aplicată unui sport complex.'}
          </p>
        </div>

        {/* Piloni */}
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>{lang === 'en' ? 'How the platform works' : 'Cum funcționează platforma'}</h2>
        <div style={{ display: 'grid', gap: 16, marginBottom: 64 }}>
          {PILLARS.map(p => (
            <div key={p.title} style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 14, padding: '24px 28px', display: 'flex', gap: 20 }}>
              <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
              <div>
                <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{p.title}</div>
                <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.75 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ce nu suntem */}
        <div style={{ background: '#1a0a0a', border: '1px solid #3b1212', borderRadius: 16, padding: '32px', marginBottom: 48 }}>
          <h2 style={{ color: '#fca5a5', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>{lang === 'en' ? 'What Oxiano is NOT' : 'Ce Oxiano nu este'}</h2>
          <ul style={{ color: '#9ca3af', fontSize: 14, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
            {lang === 'en' ? <>
              <li>We are not a betting service and do not hold an ONJN licence or equivalent</li>
              <li>We do not guarantee profit and do not claim our picks are winners</li>
              <li>We do not delete or retroactively modify Track Record results</li>
              <li>We do not use insider data, confidential information or illegal sources</li>
              <li>We do not offer financial or investment advice of any kind</li>
            </> : <>
              <li>Nu suntem un serviciu de pariuri și nu deținem licență ONJN sau echivalent</li>
              <li>Nu garantăm profit și nu afirmăm că picks-urile noastre sunt câștigătoare</li>
              <li>Nu ștergem sau modificăm retroactiv rezultatele din Track Record</li>
              <li>Nu utilizăm date insider, informații confidențiale sau surse ilegale</li>
              <li>Nu oferim sfat financiar sau de investiții de nicio natură</li>
            </>}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #0c1a3a 100%)', border: '1px solid #166534', borderRadius: 18, padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>
            {lang === 'en' ? 'Explore the platform' : 'Explorează platforma'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
            {lang === 'en'
              ? 'Daily picks auto-updated · Public & verifiable track record · Per-league analysis'
              : 'Picks zilnice actualizate automat · Track record public și verificabil · Analiză per ligă'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/daily" style={{ background: '#22d3ee', color: '#000', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              {lang === 'en' ? "Today's Picks →" : 'Picks de azi →'}
            </a>
            <a href="/track-record" style={{ background: 'transparent', color: '#22d3ee', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '1px solid #22d3ee' }}>
              Track Record
            </a>
            <a href="/manual" style={{ background: 'transparent', color: '#9ca3af', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '1px solid #374151' }}>
              📖 {lang === 'en' ? 'Parameter Guide PDF' : 'Manual PDF'}
            </a>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: '#4b5563' }}>
            Analiză statistică în scop educațional · Nu constituie sfat de pariere
          </div>
        </div>

      </main>

      <footer style={{ borderTop: '1px solid #1f2937', padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
        © 2026 Oxiano · Advanced Quantitative Intelligence ·{' '}
        <a href="/terms" style={{ color: '#4b5563' }}>Termeni</a> ·{' '}
        <a href="/privacy" style={{ color: '#4b5563' }}>Confidențialitate</a> ·{' '}
        <a href="/despre" style={{ color: '#6b7280' }}>Despre</a>
      </footer>
    </div>
  )
}
