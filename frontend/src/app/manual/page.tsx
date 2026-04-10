'use client'
import { useLang } from '@/lib/LangContext'

const PARAMS_RO = [
  {
    id: '01',
    name: 'Confidence %',
    badge: 'Principal',
    badgeColor: '#22d3ee',
    symbol: '74%',
    what: 'Probabilitatea pe care modelul o atribuie rezultatului prezis (victorie gazdă, egal sau victorie oaspete). Este valoarea brută ieșită din clasificatorul XGBoost, calibrată pe 225.000 de meciuri istorice și ajustată cu date de piață.',
    how: [
      '≥ 70% — Confidence ridicat. Modelul are o convingere puternică. Istoric: 77.8% acuratețe pe acest prag.',
      '65–69% — Confidence bun. Baza principală de picks recomandați. Istoric: 74.7% acuratețe.',
      '55–64% — Confidence mediu. Utilizabil ca informație secundară, nu ca pick principal.',
      '< 55% — Sub pragul recomandat. Oxiano nu emite picks în mod normal sub acest nivel.',
    ],
    warning: 'Confidence-ul NU este o garanție de câștig. Un pick cu 75% confidence înseamnă că modelul estimează 3 din 4 șanse să fie corect — nu că va câștiga sigur.',
  },
  {
    id: '02',
    name: 'Edge %',
    badge: 'Market Intel',
    badgeColor: '#4ade80',
    symbol: '+8.3%',
    what: 'Diferența dintre probabilitatea modelului și probabilitatea implicată de cotele bookmaker-ilor sharp (Pinnacle). Un edge pozitiv înseamnă că modelul vede o probabilitate mai mare decât piața.',
    how: [
      'Edge +5% sau mai mare — Semnal de value bet potențial. Piața subevaluează rezultatul.',
      'Edge 0–5% — Picks fără avantaj clar față de piață. Informativ, nu acționabil.',
      'Edge negativ — Modelul e sub piață. Picks cu edge negativ nu sunt emise.',
    ],
    warning: 'Edge-ul se calculează față de cotele closing Pinnacle — cel mai eficient bookmaker din lume. Un edge față de Pinnacle este semnificativ statistic.',
  },
  {
    id: '03',
    name: 'Kelly %',
    badge: 'Risk Management',
    badgeColor: '#f59e0b',
    symbol: '4.2%',
    what: 'Procentul optim din bankroll pe care Criteriul Kelly îl recomandă pentru acest pick. Formula Kelly maximizează creșterea bankroll-ului pe termen lung, echilibrând randamentul cu riscul de ruină.',
    how: [
      'Kelly se calculează ca: (b×p − (1−p)) / b, unde p = confidence modelului, b = cota − 1.',
      'Oxiano aplică Kelly fracțional (limitat la 10% din bankroll per pick) pentru siguranță suplimentară.',
      'Kelly 3–5%: stake recomandat moderat. Kelly >5%: convingere ridicată a modelului.',
      'Kelly 0%: picks unde formula nu identifică valoare matematică pozitivă.',
    ],
    warning: 'Kelly presupune că probabilitățile modelului sunt corecte și că ai o bancă dedicată pentru acest tip de analiză. Nu utiliza Kelly pe bani pe care nu îți permiți să îi pierzi.',
  },
  {
    id: '04',
    name: 'Value Bet 💎',
    badge: 'Semnal special',
    badgeColor: '#a78bfa',
    symbol: '💎',
    what: 'Indicatorul diamant apare când sunt îndeplinite simultan două condiții: confidence ≥ 65% și edge față de piață ≥ 5%. Este cel mai selectiv filtru al platformei.',
    how: [
      'Un value bet combină convingerea modelului cu un dezacord semnificativ față de piața sharp.',
      'Frecvență medie: 0.3–0.8 picks pe zi — selectivitate ridicată intenționată.',
      'Value bets au cel mai bun raport risc/randament în backtest-ul out-of-sample.',
    ],
    warning: 'Chiar și value bets pierd frecvent pe termen scurt. Valoarea se manifestă statistic pe serii de 50+ picks, nu pe 5–10.',
  },
  {
    id: '05',
    name: 'Rating Elo',
    badge: 'Context',
    badgeColor: '#38bdf8',
    symbol: '1680 vs 1520',
    what: 'Sistem de rating numeric care cuantifică forța relativă a fiecărei echipe, inspirat din șah. Un Elo mai mare = echipă mai puternică. Ratingurile se actualizează după fiecare meci pe baza rezultatului și a diferenței de forță.',
    how: [
      'Elo 1700+ — Echipă de elită (Real Madrid, Manchester City, Bayern).',
      'Elo 1500–1700 — Echipă de nivel mediu-superior în liga sa.',
      'Elo < 1500 — Echipă din zona inferioară a ligii.',
      'Diferența Elo (elo_diff) este una dintre cele mai predictive variabile din model.',
    ],
    warning: null,
  },
  {
    id: '06',
    name: 'H2H (Head-to-Head)',
    badge: 'Istoric direct',
    badgeColor: '#fb923c',
    symbol: 'H2H: 4/6',
    what: 'Statistici din ultimele 6 meciuri directe între cele două echipe: rata de victorii a echipei de acasă în duelurile directe, rata de egaluri și diferența medie de goluri în favorea gazdei.',
    how: [
      'H2H hw (home win rate): cât de des câștigă echipa gazdă din meciurile directe recente.',
      'H2H dr (draw rate): frecvența egalurilor în meciurile directe.',
      'H2H gd (goal difference): diferența medie de goluri din perspectiva gazdei.',
      'H2H n = 0: fără istoric direct — modelul folosește mediile de ligă.',
    ],
    warning: null,
  },
  {
    id: '07',
    name: 'xG (Expected Goals)',
    badge: 'Calitate joc',
    badgeColor: '#34d399',
    symbol: 'xG: 1.8 vs 0.9',
    what: 'Expected Goals reprezintă numărul de goluri pe care o echipă ar trebui să le marcheze statistic, bazat pe calitatea ocaziilor create — nu pe golurile efectiv marcate. Un xG ridicat = echipă care creează ocazii de calitate.',
    how: [
      'xG > 1.5: atac puternic, echipă care domină mecanic.',
      'xG 0.8–1.5: nivel mediu de creare a ocaziilor.',
      'xG < 0.8: echipă defensivă sau în formă slabă.',
      'xG diferențial (xg_diff): avantajul de atac al gazdei față de oaspete.',
    ],
    warning: 'xG-ul din model este calculat ca proxy din date istorice, nu din statistici live ale meciului.',
  },
  {
    id: '08',
    name: 'Forma recentă',
    badge: 'Trend',
    badgeColor: '#f472b6',
    symbol: 'W5: 80% / W10: 60%',
    what: 'Rata de victorie a echipei în ultimele 5 și 10 meciuri (all/home/away). Modelul calculează forma separat pentru meciuri acasă și deplasare — o echipă poate fi puternică acasă și slabă în deplasare.',
    how: [
      'win5 ≥ 0.6 (3 victorii din 5): formă bună.',
      'win_home5: rata de victorie acasă în ultimele 5 meciuri jucate pe teren propriu.',
      'win_away5: rata de victorie în deplasare în ultimele 5 meciuri în deplasare.',
      'Streak: număr de rezultate consecutive identice (pozitiv = victorii, negativ = înfrângeri).',
    ],
    warning: null,
  },
]

const TIERS_RO = [
  { label: '🟢 HIGH CONFIDENCE', range: '≥ 65%', desc: 'Picks recomandate. Acuratețe istorică 74–86% în funcție de ligă. Baza principală de analiză.', color: '#22c55e' },
  { label: '🟡 MEDIUM CONFIDENCE', range: '55–64%', desc: 'Picks informative. Util ca context secundar sau pentru analiză proprie. Nu sunt baza recomandată.', color: '#f59e0b' },
  { label: '💎 VALUE BET', range: '≥ 65% + Edge ≥ 5%', desc: 'Cel mai selectiv semnal. Combină convingerea modelului cu dezacord față de piața sharp.', color: '#a78bfa' },
]

const TIERS_EN = [
  { label: '🟢 HIGH CONFIDENCE', range: '≥ 65%', desc: 'Recommended picks. Historical accuracy 74–86% depending on league. Primary basis for analysis.', color: '#22c55e' },
  { label: '🟡 MEDIUM CONFIDENCE', range: '55–64%', desc: 'Informational picks. Useful as secondary context or for your own analysis. Not the recommended primary basis.', color: '#f59e0b' },
  { label: '💎 VALUE BET', range: '≥ 65% + Edge ≥ 5%', desc: 'The most selective signal. Combines model conviction with significant disagreement vs. the sharp market.', color: '#a78bfa' },
]

const PARAMS_EN = [
  {
    id: '01', name: 'Confidence %', badge: 'Primary', badgeColor: '#22d3ee', symbol: '74%',
    what: 'The probability the model assigns to the predicted outcome (home win, draw or away win). It is the raw output of the XGBoost classifier, calibrated on 225,000 historical matches and adjusted with market data.',
    how: ['≥ 70% — High confidence. Model has strong conviction. Historical accuracy: 77.8% at this threshold.', '65–69% — Good confidence. Main basis for recommended picks. Historical accuracy: 74.7%.', '55–64% — Medium confidence. Useful as secondary information, not a primary pick.', '< 55% — Below recommended threshold. Oxiano does not normally issue picks below this level.'],
    warning: 'Confidence is NOT a guarantee of winning. A pick with 75% confidence means the model estimates 3 in 4 chances of being correct — not that it will definitely win.',
  },
  {
    id: '02', name: 'Edge %', badge: 'Market Intel', badgeColor: '#4ade80', symbol: '+8.3%',
    what: 'The difference between the model probability and the implied probability from sharp bookmaker odds (Pinnacle). A positive edge means the model sees a higher probability than the market.',
    how: ['Edge +5% or more — Potential value bet signal. Market is undervaluing the outcome.', 'Edge 0–5% — Picks without a clear market advantage. Informational, not actionable.', 'Negative edge — Model is below market. Picks with negative edge are not issued.'],
    warning: 'Edge is calculated against Pinnacle closing odds — the most efficient bookmaker in the world. An edge vs. Pinnacle is statistically significant.',
  },
  {
    id: '03', name: 'Kelly %', badge: 'Risk Management', badgeColor: '#f59e0b', symbol: '4.2%',
    what: 'The optimal percentage of bankroll the Kelly Criterion recommends for this pick. The Kelly formula maximises long-term bankroll growth by balancing return against ruin risk.',
    how: ['Kelly is calculated as: (b×p − (1−p)) / b, where p = model confidence, b = odds − 1.', 'Oxiano applies fractional Kelly (capped at 10% of bankroll per pick) for additional safety.', 'Kelly 3–5%: moderate recommended stake. Kelly >5%: high model conviction.', 'Kelly 0%: picks where the formula finds no positive mathematical value.'],
    warning: 'Kelly assumes the model probabilities are correct and that you have a dedicated bankroll for this type of analysis. Do not use Kelly on money you cannot afford to lose.',
  },
  {
    id: '04', name: 'Value Bet 💎', badge: 'Special signal', badgeColor: '#a78bfa', symbol: '💎',
    what: 'The diamond indicator appears when two conditions are simultaneously met: confidence ≥ 65% and market edge ≥ 5%. It is the platform\'s most selective filter.',
    how: ['A value bet combines model conviction with significant disagreement vs. the sharp market.', 'Average frequency: 0.3–0.8 picks per day — intentionally high selectivity.', 'Value bets have the best risk/reward ratio in out-of-sample backtesting.'],
    warning: 'Even value bets frequently lose in the short term. Value manifests statistically over series of 50+ picks, not 5–10.',
  },
  {
    id: '05', name: 'Elo Rating', badge: 'Context', badgeColor: '#38bdf8', symbol: '1680 vs 1520',
    what: 'A numerical rating system that quantifies the relative strength of each team, inspired by chess. A higher Elo = stronger team. Ratings update after every match based on result and strength differential.',
    how: ['Elo 1700+ — Elite team (Real Madrid, Manchester City, Bayern).', 'Elo 1500–1700 — Mid-to-upper level team in its league.', 'Elo < 1500 — Team in the lower part of the league.', 'Elo differential (elo_diff) is one of the most predictive features in the model.'],
    warning: null,
  },
  {
    id: '06', name: 'H2H (Head-to-Head)', badge: 'Direct history', badgeColor: '#fb923c', symbol: 'H2H: 4/6',
    what: 'Statistics from the last 6 direct matches between the two teams: home win rate in direct duels, draw rate, and average goal difference in favour of the home side.',
    how: ['H2H hw (home win rate): how often the home team wins in recent direct matches.', 'H2H dr (draw rate): frequency of draws in direct matches.', 'H2H gd (goal difference): average goal difference from the home perspective.', 'H2H n = 0: no direct history — model uses league averages.'],
    warning: null,
  },
  {
    id: '07', name: 'xG (Expected Goals)', badge: 'Game quality', badgeColor: '#34d399', symbol: 'xG: 1.8 vs 0.9',
    what: 'Expected Goals represents the number of goals a team should statistically score, based on the quality of chances created — not goals actually scored. A high xG = a team creating quality chances.',
    how: ['xG > 1.5: strong attack, team that dominates mechanically.', 'xG 0.8–1.5: average chance-creation level.', 'xG < 0.8: defensive team or in poor form.', 'xG differential (xg_diff): home team\'s attack advantage over the away side.'],
    warning: 'The xG in the model is computed as a proxy from historical data, not from live match statistics.',
  },
  {
    id: '08', name: 'Recent Form', badge: 'Trend', badgeColor: '#f472b6', symbol: 'W5: 80% / W10: 60%',
    what: 'Win rate of the team over the last 5 and 10 matches (all/home/away). The model computes form separately for home and away matches — a team can be strong at home and weak away.',
    how: ['win5 ≥ 0.6 (3 wins from 5): good form.', 'win_home5: home win rate over the last 5 home matches.', 'win_away5: away win rate over the last 5 away matches.', 'Streak: number of consecutive identical results (positive = wins, negative = losses).'],
    warning: null,
  },
]

export default function ManualPage() {
  const { lang } = useLang()
  const PARAMS = lang === 'en' ? PARAMS_EN : PARAMS_RO
  const TIERS = lang === 'en' ? TIERS_EN : TIERS_RO
  const handlePrint = () => window.print()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #1a1a1a !important; }
          .print-page { background: white !important; color: #1a1a1a !important; padding: 0 !important; }
          .param-card { border: 1px solid #ccc !important; background: #f9f9f9 !important; break-inside: avoid; margin-bottom: 20px; }
          .param-name { color: #1a1a1a !important; }
          .param-body { color: #333 !important; }
          .param-badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .tier-card { border: 1px solid #ccc !important; background: #f9f9f9 !important; break-inside: avoid; }
          .cover-section { border-bottom: 2px solid #1e40af !important; }
          a { color: #1e40af !important; }
        }
        @page { margin: 20mm; size: A4; }
      `}</style>

      <div className="print-page" style={{ minHeight: '100vh', background: '#0a1128', color: '#e5e7eb', fontFamily: 'Georgia, serif' }}>

        {/* Nav — no print */}
        <nav className="no-print" style={{ borderBottom: '1px solid #1f2937', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Oxiano" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '0.08em' }}>OXIANO</span>
          </a>
          <button
            onClick={handlePrint}
            style={{ background: '#22d3ee', color: '#000', border: 'none', padding: '10px 22px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            ⬇ {lang === 'en' ? 'Download PDF' : 'Descarcă PDF'}
          </button>
        </nav>

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 28px' }}>

          {/* Cover */}
          <div className="cover-section" style={{ textAlign: 'center', paddingBottom: 40, marginBottom: 48, borderBottom: '1px solid #1e3a5f' }}>
            <img src="/logo.png" alt="Oxiano" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }} />
            <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>
              OXIANO — Advanced Quantitative Intelligence
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              {lang === 'en' ? 'Interpretation Guide' : 'Manual de interpretare'}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 15, margin: '0 0 6px' }}>{lang === 'en' ? 'Complete guide to platform indicators and parameters' : 'Ghid complet al indicatorilor și parametrilor platformei'}</p>
            <p style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace' }}>Versiunea 1.0 · Aprilie 2026 · oxiano.com</p>
          </div>

          {/* Intro */}
          <div style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 12, padding: '24px 28px', marginBottom: 40 }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>{lang === 'en' ? 'How to use this guide' : 'Cum să folosești acest ghid'}</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              {lang === 'en'
                ? 'Each pick generated by Oxiano contains several statistical indicators. This guide explains what each parameter represents, how to interpret it, and what its limitations are. The goal is not to tell you what to do — but to help you understand what the model is saying, so you can make informed decisions independently.'
                : 'Fiecare pick generat de Oxiano conține mai mulți indicatori statistici. Acest manual explică ce reprezintă fiecare parametru, cum să îl interpretezi și ce limitări are. Scopul nu este să îți spunem ce să faci — ci să înțelegi ce îți spune modelul, pentru a lua decizii informate în mod independent.'}
            </p>
          </div>

          {/* Tiers */}
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 18 }}>{lang === 'en' ? 'Confidence levels' : 'Niveluri de confidence'}</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 48 }}>
            {TIERS.map(t => (
              <div key={t.label} className="tier-card" style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 10, padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.color, fontFamily: 'monospace' }}>{t.range}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Parameters */}
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{lang === 'en' ? 'Pick parameters' : 'Parametrii picks-urilor'}</h2>
          <div style={{ display: 'grid', gap: 24 }}>
            {PARAMS.map(p => (
              <div key={p.id} className="param-card" style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 14, padding: '26px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', fontFamily: 'monospace' }}>#{p.id}</div>
                  <h3 className="param-name" style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{p.name}</h3>
                  <span className="param-badge" style={{ fontSize: 10, fontWeight: 700, background: p.badgeColor + '22', color: p.badgeColor, border: `1px solid ${p.badgeColor}44`, borderRadius: 20, padding: '2px 10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {p.badge}
                  </span>
                  <code style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: p.badgeColor, fontFamily: 'monospace', background: '#0a1128', padding: '3px 10px', borderRadius: 6 }}>
                    {p.symbol}
                  </code>
                </div>

                <div className="param-body">
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.75, marginBottom: 14 }}>{p.what}</div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{lang === 'en' ? 'How to interpret' : 'Cum să interpretezi'}</div>
                  <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
                    {p.how.map((h, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 4 }}>{h}</li>
                    ))}
                  </ul>

                  {p.warning && (
                    <div style={{ background: '#1a1208', border: '1px solid #854d0e', borderRadius: 8, padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>⚠️ {p.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ marginTop: 48, background: '#1a0a0a', border: '1px solid #3b1212', borderRadius: 14, padding: '28px 28px' }}>
            <h3 style={{ color: '#fca5a5', fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>{lang === 'en' ? 'Legal disclaimer' : 'Disclaimer legal'}</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              {lang === 'en'
                ? 'Oxiano provides statistical analysis for exclusively educational and informational purposes. The indicators presented in this guide represent outputs of a mathematical model trained on historical data — they do not constitute betting advice, financial advice or investment recommendations. Past performance does not guarantee future results. Sports betting involves real financial risk. The user is solely responsible for their decisions. Oxiano does not hold an ONJN licence or equivalent and does not operate as a gambling operator.'
                : 'Oxiano furnizează analiză statistică cu scop exclusiv educațional și informativ. Indicatorii prezentați în acest manual reprezintă output-uri ale unui model matematic antrenat pe date istorice — nu constituie sfat de pariere, sfat financiar sau recomandare de investiții. Performanța istorică nu garantează rezultate viitoare. Parierile sportive implică risc financiar real. Utilizatorul este singurul responsabil pentru deciziile sale. Oxiano nu deține licență ONJN sau echivalent și nu operează ca operator de jocuri de noroc.'}
            </p>
            <p style={{ color: '#6b7280', fontSize: 11, marginTop: 12, marginBottom: 0, fontFamily: 'monospace' }}>
              oxiano.com · contact@oxiano.com · © 2026 Oxiano
            </p>
          </div>

          {/* Download button bottom — no print */}
          <div className="no-print" style={{ textAlign: 'center', marginTop: 40 }}>
            <button
              onClick={handlePrint}
              style={{ background: '#22d3ee', color: '#000', border: 'none', padding: '14px 36px', borderRadius: 9, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
            >
              ⬇ {lang === 'en' ? 'Download as PDF' : 'Descarcă ca PDF'}
            </button>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 10 }}>
              {lang === 'en' ? 'In browser: Print → Save as PDF · Recommended: A4, 20mm margins' : 'În browser: Print → Save as PDF · Recomandat: A4, margini 20mm'}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
