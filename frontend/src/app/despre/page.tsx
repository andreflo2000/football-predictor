import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Misiunea Oxiano — Advanced Quantitative Intelligence',
  description: 'Oxiano este o platformă de analiză cantitativă a fotbalului bazată pe algoritmi de tip XGBoost, rating Elo și inteligență de piață. Acuratețe verificată out-of-sample pe 6 luni de date reale.',
  alternates: { canonical: 'https://oxiano.com/despre' },
  openGraph: {
    title: 'Misiunea Oxiano',
    description: 'Analiză cantitativă avansată. Nu predicții, ci probabilități riguroase.',
    url: 'https://oxiano.com/despre',
  },
}

const PILLARS = [
  {
    icon: '⚙️',
    title: 'Algoritmi de ultimă generație',
    body: 'Modelul nostru principal este un clasificator XGBoost antrenat pe 225.000 de meciuri din ligile europene (2005–2026). Utilizăm 110 variabile independente — de la forme recente și statistici Expected Goals (xG), până la ratinguri Elo actualizate dinamic și diferențiale de piață față de bookmaker-ii sharp (Pinnacle).',
  },
  {
    icon: '📐',
    title: 'Validare out-of-sample riguroasă',
    body: 'Performanța nu este raportată pe datele de antrenament — ci exclusiv pe meciuri nevăzute de model (Oct 2025–Mar 2026). La La Liga, picks-urile cu confidence ≥65% au atins 86.1% acuratețe pe 36 de meciuri. Bundesliga: 79.4%. Ligue 1: 79.4%. Aceste cifre sunt reale, nu simulate.',
  },
  {
    icon: '📊',
    title: 'Inteligență de piață integrată',
    body: 'Integrăm cotele closing de la bookmaker-ii sharp pentru a calcula edge-ul față de piață și a filtra meciurile cu valoare statistică reală. Un pick fără edge față de piață nu este emis, indiferent de confidence-ul brut al modelului. Aceasta este diferența dintre un sistem disciplinat și unul zgomotos.',
  },
  {
    icon: '🔁',
    title: 'Actualizare continuă',
    body: 'Picks-urile sunt recalculate automat la 07:00 și 13:00 (ora Bucureștilor), înglobând toate meciurile disponibile pentru ziua curentă. Ratingurile Elo se actualizează după fiecare meci, iar formele sunt calculate pe ferestre glisante de 5 și 10 meciuri — home/away separat.',
  },
  {
    icon: '🎯',
    title: 'Criteriul Kelly pentru gestiunea riscului',
    body: 'Fiecare pick include un procent Kelly calculat pe baza confidence-ului modelului și a cotei implicite de piață. Criteriul Kelly este standardul matematic pentru optimizarea creșterii bankroll-ului pe termen lung, folosit de fondurile quant și traderii profesioniști.',
  },
  {
    icon: '🔒',
    title: 'Transparență și responsabilitate',
    body: 'Toate rezultatele istorice sunt stocate public în secțiunea Track Record. Nu ștergem picks-urile pierdute. Nu retrogradam confidence după rezultat. Oxiano nu deține licență ONJN și nu furnizează sfat de pariere — oferim analiză statistică în scop educațional și informativ.',
  },
]

const STATS = [
  { value: '225K+', label: 'meciuri în setul de antrenament' },
  { value: '110', label: 'variabile independente' },
  { value: '86.1%', label: 'acuratețe La Liga ≥65% conf.' },
  { value: '19.5K', label: 'perechi H2H cu istoric real' },
]

export default function DesprePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #051F14 0%, #0A1128 100%)', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1f2937', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Oxiano" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '0.08em' }}>OXIANO</span>
          </a>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <a href="/track-record" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Track Record</a>
            <a href="/daily" style={{ background: '#22d3ee', color: '#000', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Picks azi →</a>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: 8, padding: '4px 14px', fontSize: 11, color: '#22d3ee', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
            Misiunea Oxiano
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Probabilități riguroase,<br />nu predicții arbitrare
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.75, maxWidth: 620, margin: '0 auto' }}>
            Oxiano a fost construit cu un singur scop: să aplice metodologia quantitativă — folosită de fondurile de hedging și traderii algoritmici — în analiza fotbalului european. Nu furnizăm certitudini. Furnizăm probabilități calculate cu rigoare matematică.
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
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 18px' }}>De ce există Oxiano</h2>
          <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.8, margin: '0 0 14px' }}>
            Piața de pronosticuri sportive este dominată de opinii subiective, statistici selective și prezentări înșelătoare ale track record-ului. Tipscteri cu sute de mii de urmăritori raportează acuratețe de 70-80% — fără date verificabile, fără metodologie transparentă, fără risc asumat.
          </p>
          <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            Oxiano este răspunsul la această problemă. Fiecare cifră din platformă — acuratețe, confidence, edge, Kelly — are o formulă matematică documentată și este calculată pe date reale, verificabile, din surse publice. Nu vindem certitudini. Vindem structură analitică.
          </p>
        </div>

        {/* Piloni */}
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Cum funcționează platforma</h2>
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
          <h2 style={{ color: '#fca5a5', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Ce Oxiano nu este</h2>
          <ul style={{ color: '#9ca3af', fontSize: 14, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
            <li>Nu suntem un serviciu de pariuri și nu deținem licență ONJN sau echivalent</li>
            <li>Nu garantăm profit și nu afirmăm că picks-urile noastre sunt câștigătoare</li>
            <li>Nu ștergem sau modificăm retroactiv rezultatele din Track Record</li>
            <li>Nu utilizăm date insider, informații confidențiale sau surse ilegale</li>
            <li>Nu oferim sfat financiar sau de investiții de nicio natură</li>
          </ul>
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #0c1a3a 100%)', border: '1px solid #166534', borderRadius: 18, padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>
            Explorează platforma
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
            Picks zilnice actualizate automat · Track record public și verificabil · Analiză per ligă
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/daily" style={{ background: '#22d3ee', color: '#000', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              Picks de azi →
            </a>
            <a href="/track-record" style={{ background: 'transparent', color: '#22d3ee', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '1px solid #22d3ee' }}>
              Track Record
            </a>
            <a href="/manual" style={{ background: 'transparent', color: '#9ca3af', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '1px solid #374151' }}>
              📖 Manual PDF
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
