'use client'
import { useLang } from '@/lib/LangContext'

export default function ManualPage() {
  const { lang } = useLang()
  const ro = lang === 'ro'
  const handlePrint = () => window.print()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #1a1a1a !important; }
          .print-page { background: white !important; color: #1a1a1a !important; padding: 0 !important; }
          .section-card { border: 1px solid #ccc !important; background: #f9f9f9 !important; break-inside: avoid; margin-bottom: 20px; }
          h1, h2, h3 { color: #1a1a1a !important; }
          p, li { color: #333 !important; }
          .badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          a { color: #1e40af !important; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 20mm; size: A4; }
      `}</style>

      <div className="print-page" style={{ minHeight: '100vh', background: '#0a1128', color: '#e5e7eb', fontFamily: 'Georgia, serif' }}>

        {/* Nav */}
        <nav className="no-print" style={{ borderBottom: '1px solid #1f2937', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Oxiano" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '0.08em' }}>OXIANO</span>
          </a>
          <button onClick={handlePrint} style={{ background: '#22d3ee', color: '#000', border: 'none', padding: '10px 22px', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ⬇ {ro ? 'Descarcă PDF' : 'Download PDF'}
          </button>
        </nav>

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 28px' }}>

          {/* ── COVER ─────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', paddingBottom: 48, marginBottom: 56, borderBottom: '1px solid #1e3a5f' }}>
            <img src="/logo.png" alt="Oxiano" style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 20 }} />
            <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'monospace' }}>
              OXIANO · Advanced Quantitative Intelligence
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.01em' }}>
              {ro ? 'Ghid de utilizare' : 'User Guide'}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 16, margin: '0 0 8px' }}>
              {ro ? 'Cum să folosești eficient platforma Oxiano' : 'How to use the Oxiano platform efficiently'}
            </p>
            <p style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace' }}>
              {ro ? 'Versiunea 2.0 · Aprilie 2026 · oxiano.com' : 'Version 2.0 · April 2026 · oxiano.com'}
            </p>
          </div>

          {/* ── 1. CE ESTE OXIANO ─────────────────────────────── */}
          <Section num="01" title={ro ? 'Ce este Oxiano' : 'What is Oxiano'}>
            <p style={bodyText}>
              {ro
                ? 'Oxiano este o platformă de analiză cantitativă a meciurilor de fotbal, construită pe un model de machine learning antrenat pe peste 225.000 de meciuri istorice din ligile majore europene (2010–2025). Modelul combină algoritmi XGBoost, ratinguri Elo, statistici xG, forme recente și semnale din cotele de piață pentru a genera predicții cu probabilități calibrate.'
                : 'Oxiano is a quantitative football match analysis platform, built on a machine learning model trained on over 225,000 historical matches from major European leagues (2010–2025). The model combines XGBoost algorithms, Elo ratings, xG statistics, recent form, and market odds signals to generate predictions with calibrated probabilities.'}
            </p>
            <p style={bodyText}>
              {ro
                ? 'Platforma analizează zilnic meciurile din 10 ligi europene, selectează automat meciurile unde modelul are suficientă certitudine și prezintă rezultatele într-un format clar, transparent și verificabil. Fiecare predicție publicată este înregistrată și urmărită în secțiunea Istoric & Performanță — nicio predicție nu este ștearsă sau modificată ulterior.'
                : 'The platform analyses daily matches from 10 European leagues, automatically selects matches where the model has sufficient conviction, and presents results in a clear, transparent and verifiable format. Every published prediction is recorded and tracked in the History & Performance section — no prediction is deleted or modified after the fact.'}
            </p>
            <HighlightBox color="#22d3ee">
              {ro
                ? '🎯 Oxiano nu îți spune ce să faci — îți arată ce vede modelul, cu ce grad de certitudine și de ce. Tu decizi cum folosești această informație.'
                : '🎯 Oxiano does not tell you what to do — it shows you what the model sees, with what degree of certainty and why. You decide how to use this information.'}
            </HighlightBox>
          </Section>

          {/* ── 2. NAVIGAREA PLATFORMEI ───────────────────────── */}
          <Section num="02" title={ro ? 'Navigarea în platformă' : 'Navigating the platform'}>
            <p style={{ ...bodyText, marginBottom: 20 }}>
              {ro ? 'Platforma are 5 secțiuni principale, fiecare cu un scop distinct:' : 'The platform has 5 main sections, each with a distinct purpose:'}
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                {
                  icon: '🔮', page: ro ? 'Predicții' : 'Predictions', href: '/',
                  desc: ro ? 'Pagina principală. Conține toate meciurile analizate azi, cu probabilitățile modelului pentru fiecare. Poți filtra pe ligă, confidence sau tip de predicție.' : 'The main page. Contains all matches analysed today, with the model\'s probabilities for each. Filter by league, confidence or prediction type.',
                },
                {
                  icon: '🎯', page: ro ? 'Analiza Zilei' : 'Daily Analysis', href: '/daily',
                  desc: ro ? 'Picks-urile recomandate ale zilei — meciurile unde modelul are cel mai înalt confidence. Sortate automat după certitudine. Include bara de share și statistici zilnice.' : 'The recommended picks of the day — matches where the model has the highest confidence. Automatically sorted by conviction. Includes share bar and daily statistics.',
                },
                {
                  icon: '🔢', page: 'Combo Analyzer', href: '/bet-builder',
                  desc: ro ? 'Instrument pentru construirea combinațiilor. Selectezi mai multe meciuri și calculezi probabilitatea combinată a tuturor să fie corecte simultan.' : 'Tool for building combinations. Select multiple matches and calculate the combined probability of all being correct simultaneously.',
                },
                {
                  icon: '📊', page: ro ? 'Istoric & Performanță' : 'History & Performance', href: '/track-record',
                  desc: ro ? 'Toate predicțiile anterioare, cu rezultatele reale. Include acuratețea live, curba de equity și statistici per ligă. Date verificabile, actualizate automat la 23:30.' : 'All previous predictions with real results. Includes live accuracy, equity curve and per-league statistics. Verifiable data, auto-updated at 23:30.',
                },
                {
                  icon: '⚡', page: 'Upgrade', href: '/upgrade',
                  desc: ro ? 'Planurile de abonament Analyst și Pro. Deblochez picks VIP (confidence ≥75%), Value Bets, Kelly % și statistici avansate.' : 'Analyst and Pro subscription plans. Unlock VIP picks (confidence ≥75%), Value Bets, Kelly % and advanced statistics.',
                },
              ].map(item => (
                <div key={item.page} className="section-card" style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee', marginBottom: 4, fontFamily: 'monospace' }}>{item.page}</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 3. CUM CITEȘTI UN PICK ────────────────────────── */}
          <Section num="03" title={ro ? 'Cum citești un pick — pas cu pas' : 'How to read a pick — step by step'}>
            <p style={{ ...bodyText, marginBottom: 20 }}>
              {ro ? 'Fiecare pick afișat de Oxiano conține mai multe elemente. Iată ordinea în care să le citești:' : 'Each pick displayed by Oxiano contains several elements. Here is the order in which to read them:'}
            </p>
            {[
              {
                step: '1', color: '#22d3ee',
                title: ro ? 'Identifică meciul și liga' : 'Identify the match and league',
                desc: ro ? 'Verifică echipele și liga. Modelul performează diferit pe ligi — La Liga și Bundesliga au acuratețe istorică mai mare decât Premier League. Dacă nu cunoști echipele, verifică tab-ul Stats din pagina de predicție pentru context.' : 'Check the teams and league. The model performs differently across leagues — La Liga and Bundesliga have higher historical accuracy than the Premier League. If you don\'t know the teams, check the Stats tab on the prediction page for context.',
              },
              {
                step: '2', color: '#4ade80',
                title: ro ? 'Citește Confidence %' : 'Read the Confidence %',
                desc: ro ? 'Este cel mai important indicator. ≥65% = pick recomandat. ≥70% = pick cu convingere ridicată. Sub 65% = informativ, nu pick principal. Nu acționa pe picks sub 55%.' : 'This is the most important indicator. ≥65% = recommended pick. ≥70% = high-conviction pick. Below 65% = informational, not a primary pick. Do not act on picks below 55%.',
              },
              {
                step: '3', color: '#a78bfa',
                title: ro ? 'Verifică dacă există 💎 Value Bet' : 'Check for 💎 Value Bet',
                desc: ro ? 'Dacă pick-ul are simbolul diamant, înseamnă că modelul vede și un dezacord față de piața sharp (Edge ≥5%). Acestea sunt cele mai selective semnale — 0.3–0.8 pe zi.' : 'If the pick has the diamond symbol, the model also sees a disagreement with the sharp market (Edge ≥5%). These are the most selective signals — 0.3–0.8 per day.',
              },
              {
                step: '4', color: '#f59e0b',
                title: ro ? 'Consultă tab-urile Stats și Models (Pro)' : 'Check the Stats and Models tabs (Pro)',
                desc: ro ? 'Tab-ul Stats afișează forma recentă, Elo, xG și H2H. Tab-ul Models (Pro) arată distribuția probabilităților pentru toate cele 3 rezultate posibile. Folosește aceste date pentru a valida sau a pune în context predicția.' : 'The Stats tab shows recent form, Elo, xG and H2H. The Models tab (Pro) shows the probability distribution for all 3 possible outcomes. Use this data to validate or contextualise the prediction.',
              },
              {
                step: '5', color: '#f472b6',
                title: ro ? 'Verifică Istoricul & Performanța modelului' : 'Check the model\'s History & Performance',
                desc: ro ? 'Înainte de a folosi orice predicție, consultă Istoric & Performanță pentru a înțelege acuratețea reală a modelului în timp real. Transparența este totală — toate pick-urile trecute sunt vizibile.' : 'Before using any prediction, check History & Performance to understand the model\'s real-time accuracy. Transparency is total — all past picks are visible.',
              },
            ].map(item => (
              <div key={item.step} className="section-card" style={{ background: '#0f1f35', border: `1px solid ${item.color}33`, borderLeft: `3px solid ${item.color}`, borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.color, fontFamily: 'monospace', flexShrink: 0, minWidth: 28 }}>{item.step}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          {/* ── 4. NIVELURI CONFIDENCE ────────────────────────── */}
          <Section num="04" title={ro ? 'Nivelurile de confidence — ce înseamnă în practică' : 'Confidence levels — what they mean in practice'}>
            {[
              { range: '≥ 70%', label: ro ? 'Confidence ridicat' : 'High confidence', color: '#22c55e', bg: '#16a34a15',
                desc: ro ? 'Modelul are convingere puternică. Acuratețe istorică ~78%. Recomandat ca pick principal. Frecvență: ~0.8 picks/zi.' : 'Model has strong conviction. Historical accuracy ~78%. Recommended as primary pick. Frequency: ~0.8 picks/day.' },
              { range: '65–69%', label: ro ? 'Confidence bun' : 'Good confidence', color: '#4ade80', bg: '#22c55e10',
                desc: ro ? 'Baza principală de picks. Acuratețe istorică ~74.7%. Picks zilnice standard.' : 'Main pick basis. Historical accuracy ~74.7%. Standard daily picks.' },
              { range: '55–64%', label: ro ? 'Confidence mediu' : 'Medium confidence', color: '#f59e0b', bg: '#f59e0b10',
                desc: ro ? 'Informativ. Util ca context secundar. Nu baza principală de analiză. Frecvență mare, selectivitate redusă.' : 'Informational. Useful as secondary context. Not the primary analysis basis. High frequency, low selectivity.' },
              { range: '≥ 65% + Edge ≥ 5%', label: '💎 Value Bet', color: '#a78bfa', bg: '#a78bfa10',
                desc: ro ? 'Cel mai selectiv semnal. Combină convingerea modelului cu dezacord față de piața sharp. ~0.3–0.8/zi. Cel mai bun raport risc/randament în backtest.' : 'The most selective signal. Combines model conviction with sharp market disagreement. ~0.3–0.8/day. Best risk/reward ratio in backtesting.' },
            ].map(t => (
              <div key={t.range} className="section-card" style={{ background: t.bg, border: `1px solid ${t.color}44`, borderRadius: 10, padding: '18px 22px', marginBottom: 12, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.color, fontFamily: 'monospace' }}>{t.range}</div>
                  <div style={{ fontSize: 11, color: t.color, opacity: 0.7, marginTop: 2 }}>{t.label}</div>
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{t.desc}</div>
              </div>
            ))}
          </Section>

          {/* ── 5. PLANURI ────────────────────────────────────── */}
          <Section num="05" title={ro ? 'Planuri de abonament — ce ai acces' : 'Subscription plans — what you get'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                {
                  name: 'Free', price: ro ? '0 RON' : '$0', color: '#6b7280',
                  features: ro
                    ? ['Predicții zilnice (confidence vizibil)', 'Analiza Zilei — picks recomandate', 'Statistici de bază per meci', 'Istoric & Performanță public', 'Combo Analyzer (funcții de bază)']
                    : ['Daily predictions (confidence visible)', 'Daily Analysis — recommended picks', 'Basic per-match statistics', 'Public History & Performance', 'Combo Analyzer (basic features)'],
                  locked: ro ? ['Value Bets 💎', 'Kelly %', 'Edge %', 'VIP Picks (conf ≥75%)', 'Tab Models (distribuție prob.)'] : ['Value Bets 💎', 'Kelly %', 'Edge %', 'VIP Picks (conf ≥75%)', 'Models tab (prob. distribution)'],
                },
                {
                  name: 'Analyst', price: ro ? '39 RON/lună' : '$8/month', color: '#22d3ee',
                  features: ro
                    ? ['Tot ce include Free', 'Edge % față de piața sharp', 'Kelly % (management risc)', 'Statistici avansate per meci', 'Acces la toate ligile']
                    : ['Everything in Free', 'Edge % vs. sharp market', 'Kelly % (risk management)', 'Advanced per-match statistics', 'Access to all leagues'],
                  locked: ro ? ['Value Bets 💎', 'VIP Picks (conf ≥75%)', 'Tab Models'] : ['Value Bets 💎', 'VIP Picks (conf ≥75%)', 'Models tab'],
                },
                {
                  name: 'Pro', price: ro ? '99 RON/lună' : '$20/month', color: '#a78bfa',
                  features: ro
                    ? ['Tot ce include Analyst', 'VIP Picks (confidence ≥75%)', 'Value Bets 💎 — semnal complet', 'Tab Models — distribuție probabilități', 'Predicții scor (Over/Under, BTTS)', 'Suport prioritar']
                    : ['Everything in Analyst', 'VIP Picks (confidence ≥75%)', 'Value Bets 💎 — full signal', 'Models tab — probability distribution', 'Score predictions (Over/Under, BTTS)', 'Priority support'],
                  locked: [],
                },
              ].map(plan => (
                <div key={plan.name} className="section-card" style={{ background: '#0f1f35', border: `1px solid ${plan.color}44`, borderRadius: 12, padding: '20px 18px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, fontFamily: 'monospace' }}>{plan.price}</div>
                  <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{ro ? 'Inclus' : 'Included'}</div>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#9ca3af', marginBottom: 5, display: 'flex', gap: 8 }}>
                      <span style={{ color: plan.color }}>✓</span> {f}
                    </div>
                  ))}
                  {plan.locked.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, marginTop: 12 }}>{ro ? 'Blocat' : 'Locked'}</div>
                      {plan.locked.map((f, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#4b5563', marginBottom: 5, display: 'flex', gap: 8 }}>
                          <span>🔒</span> {f}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* ── 6. SFATURI PRO ────────────────────────────────── */}
          <Section num="06" title={ro ? 'Sfaturi pentru utilizare eficientă' : 'Tips for efficient use'}>
            {[
              {
                icon: '📅', title: ro ? 'Verifică platforma de 2 ori pe zi' : 'Check the platform twice a day',
                desc: ro ? 'Picks-urile se calculează automat la 07:00 și 13:30 ora României. Prima verificare dimineața îți dă timp să analizezi, a doua prinde meciurile de după-amiază.' : 'Picks are automatically calculated at 07:00 and 13:30 Romanian time. The morning check gives you time to analyse, the second catches afternoon matches.',
              },
              {
                icon: '🎯', title: ro ? 'Pornește mereu din Analiza Zilei' : 'Always start from Daily Analysis',
                desc: ro ? 'Pagina /daily este deja filtrată și sortată după confidence. Economisești timp față de a parcurge toate predicțiile manual.' : 'The /daily page is already filtered and sorted by confidence. You save time compared to going through all predictions manually.',
              },
              {
                icon: '💎', title: ro ? 'Urmărește Value Bets cu atenție specială' : 'Watch Value Bets with special attention',
                desc: ro ? 'Sunt rare (0.3–0.8/zi) și reprezintă dezacordul modelului față de piața sharp. Pe termen lung, acestea au cel mai bun raport risc/randament în backtesting.' : 'They are rare (0.3–0.8/day) and represent the model\'s disagreement with the sharp market. Long-term, these have the best risk/reward ratio in backtesting.',
              },
              {
                icon: '📊', title: ro ? 'Consultă Istoric & Performanță săptămânal' : 'Check History & Performance weekly',
                desc: ro ? 'Urmărește acuratețea live, nu doar backtesting-ul. Dacă modelul trece printr-o perioadă de performanță slabă, e important să știi contextul.' : 'Track live accuracy, not just backtesting. If the model goes through a weak performance period, it\'s important to know the context.',
              },
              {
                icon: '🔢', title: ro ? 'Folosește Combo Analyzer cu precauție' : 'Use Combo Analyzer with caution',
                desc: ro ? 'Probabilitățile combinate scad exponențial cu fiecare meci adăugat. Un combo de 3 picks cu 70% fiecare are probabilitate combinată de ~34%. Combo Analyzer îți arată exact acest calcul.' : 'Combined probabilities decrease exponentially with each match added. A 3-pick combo at 70% each has a combined probability of ~34%. Combo Analyzer shows you exactly this calculation.',
              },
              {
                icon: '📱', title: ro ? 'Activează alertele push (mobile)' : 'Enable push alerts (mobile)',
                desc: ro ? 'Pe mobil, activează notificările din pagina Analiza Zilei pentru a fi anunțat automat când apar picks noi sau când se actualizează rezultatele.' : 'On mobile, enable notifications from the Daily Analysis page to be automatically notified when new picks appear or results are updated.',
              },
            ].map(tip => (
              <div key={tip.title} className="section-card" style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 10, padding: '16px 20px', marginBottom: 12, display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', marginBottom: 6 }}>{tip.title}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{tip.desc}</div>
                </div>
              </div>
            ))}
          </Section>

          {/* ── 7. INDICATORI TEHNICI ─────────────────────────── */}
          <Section num="07" title={ro ? 'Indicatori tehnici — referință rapidă' : 'Technical indicators — quick reference'}>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { name: 'Confidence %', color: '#22d3ee', desc: ro ? 'Probabilitatea modelului pentru rezultatul prezis. Baza principală de decizie. ≥65% = pick recomandat.' : 'Model probability for the predicted outcome. Primary decision basis. ≥65% = recommended pick.' },
                { name: 'Edge %', color: '#4ade80', desc: ro ? 'Diferența dintre probabilitatea modelului și cea implicată de cotele Pinnacle. Edge ≥5% = dezacord semnificativ față de piața sharp.' : 'Difference between model probability and Pinnacle implied probability. Edge ≥5% = significant disagreement vs. sharp market.' },
                { name: 'Kelly %', color: '#f59e0b', desc: ro ? 'Procentul optim din bankroll conform Criteriului Kelly. Oxiano aplică Kelly fracțional, limitat la 10% per pick.' : 'Optimal bankroll percentage per Kelly Criterion. Oxiano applies fractional Kelly, capped at 10% per pick.' },
                { name: 'Value Bet 💎', color: '#a78bfa', desc: ro ? 'Confidence ≥65% + Edge ≥5% simultan. Cel mai selectiv semnal al platformei.' : 'Confidence ≥65% + Edge ≥5% simultaneously. The platform\'s most selective signal.' },
                { name: 'Elo Rating', color: '#38bdf8', desc: ro ? 'Forța relativă a echipei (inspirat din șah). 1700+ = echipă de elită. Diferența Elo este una dintre cele mai predictive variabile.' : 'Relative team strength (inspired by chess). 1700+ = elite team. Elo differential is one of the most predictive features.' },
                { name: 'xG (Expected Goals)', color: '#34d399', desc: ro ? 'Goluri așteptate statistic pe baza calității ocaziilor. xG >1.5 = atac puternic. Calculat din date istorice, nu live.' : 'Statistically expected goals based on chance quality. xG >1.5 = strong attack. Calculated from historical data, not live.' },
                { name: 'H2H', color: '#fb923c', desc: ro ? 'Statistici din ultimele 6 meciuri directe: rata de victorie, egaluri și diferență de goluri a gazdei.' : 'Statistics from the last 6 direct matches: win rate, draws and home goal difference.' },
                { name: ro ? 'Formă recentă' : 'Recent Form', color: '#f472b6', desc: ro ? 'Rata de victorie din ultimele 5 și 10 meciuri, calculată separat pentru acasă și deplasare.' : 'Win rate over last 5 and 10 matches, calculated separately for home and away.' },
              ].map(ind => (
                <div key={ind.name} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 16px', background: '#0f1f35', borderRadius: 8, border: `1px solid ${ind.color}22` }}>
                  <div style={{ minWidth: 130, fontSize: 12, fontWeight: 700, color: ind.color, fontFamily: 'monospace', paddingTop: 2 }}>{ind.name}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>{ind.desc}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 8. DISCLAIMER ─────────────────────────────────── */}
          <div style={{ marginTop: 48, background: '#1a0a0a', border: '1px solid #3b1212', borderRadius: 14, padding: '28px 28px' }}>
            <h3 style={{ color: '#fca5a5', fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>{ro ? 'Disclaimer legal' : 'Legal disclaimer'}</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              {ro
                ? 'Oxiano furnizează analiză statistică cu scop exclusiv educațional și informativ. Indicatorii prezentați în acest ghid reprezintă output-uri ale unui model matematic antrenat pe date istorice — nu constituie sfat de pariere, sfat financiar sau recomandare de investiții. Performanța istorică nu garantează rezultate viitoare. Parierile sportive implică risc financiar real. Utilizatorul este singurul responsabil pentru deciziile sale. Oxiano nu deține licență ONJN sau echivalent și nu operează ca operator de jocuri de noroc.'
                : 'Oxiano provides statistical analysis for exclusively educational and informational purposes. The indicators presented in this guide represent outputs of a mathematical model trained on historical data — they do not constitute betting advice, financial advice or investment recommendations. Past performance does not guarantee future results. Sports betting involves real financial risk. The user is solely responsible for their decisions. Oxiano does not hold an ONJN licence or equivalent and does not operate as a gambling operator.'}
            </p>
            <p style={{ color: '#6b7280', fontSize: 11, marginTop: 12, marginBottom: 0, fontFamily: 'monospace' }}>
              oxiano.com · contact@oxiano.com · © 2026 Oxiano
            </p>
          </div>

          {/* Download button bottom */}
          <div className="no-print" style={{ textAlign: 'center', marginTop: 40 }}>
            <button onClick={handlePrint} style={{ background: '#22d3ee', color: '#000', border: 'none', padding: '14px 36px', borderRadius: 9, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              ⬇ {ro ? 'Descarcă ca PDF' : 'Download as PDF'}
            </button>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 10 }}>
              {ro ? 'În browser: Print → Save as PDF · Recomandat: A4, margini 20mm' : 'In browser: Print → Save as PDF · Recommended: A4, 20mm margins'}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const bodyText: React.CSSProperties = {
  fontSize: 14, color: '#9ca3af', lineHeight: 1.8, marginBottom: 16,
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', fontFamily: 'monospace', background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 6, padding: '3px 10px' }}>
          {num}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function HighlightBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: color + '0f', border: `1px solid ${color}33`, borderRadius: 10, padding: '14px 18px', marginTop: 16 }}>
      <div style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
