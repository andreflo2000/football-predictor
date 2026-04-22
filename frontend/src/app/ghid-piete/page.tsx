'use client'
import { useLang } from '@/lib/LangContext'

const MARKETS_RO = [
  {
    id: '01',
    name: 'Rezultat Final — 1X2',
    tag: 'Model principal',
    tagColor: '#22d3ee',
    icon: '⚖️',
    complexity: 3,
    what: 'Clasificarea tripartită a rezultatului unui meci de fotbal în una din cele trei variante posibile: victorie echipă gazdă (1), egal (X) sau victorie echipă oaspete (2). Reprezintă fundamentul oricărei analize statistice de fotbal.',
    factors: [
      'Rating Elo al ambelor echipe și diferența relativă de forță',
      'Forma recentă acasă vs. deplasare (ferestre 5 și 10 meciuri)',
      'Istoricul direct H2H din ultimele 6 confruntări',
      'Statistici xG (Expected Goals) medii pe sezon curent',
      'Avantajul deteren — modelul calibrează separat performanța acasă față de deplasare',
    ],
    insight: 'Modelul Oxiano atinge 74–86% acuratețe pe acest tip de analiză la confidence ≥65%, în funcție de ligă. La Liga și Bundesliga prezintă cel mai ridicat grad de predictibilitate statistică.',
  },
  {
    id: '02',
    name: 'Distribuție Goluri — Over/Under 2.5',
    tag: 'Volum ofensiv',
    tagColor: '#4ade80',
    icon: '⚽',
    complexity: 4,
    what: 'Analizează probabilitatea ca totalul golurilor marcate într-un meci să depășească sau să rămână sub pragul de 2.5 goluri. Este cel mai utilizat prag de volum în analiza statistică a meciurilor de fotbal.',
    factors: [
      'xG mediu ofensiv și defensiv al ambelor echipe pe sezonul curent',
      'Rata golurilor înscrise și primite în ultimele 10 meciuri',
      'Stilul de joc identificat prin analiza secvențelor ofensive istorice',
      'Condiții de meci: derby local, importanță clasament, oboseală (rotație de lot)',
      'Tendința H2H spre meciuri cu multe sau puține goluri',
    ],
    insight: 'Meciurile între echipe cu xG combinat >2.8 per meci au probabilitate statistică ridicată de a depăși pragul 2.5. Modelul integrează această variabilă ca factor primar de clasificare.',
  },
  {
    id: '03',
    name: 'Markaj Reciproc — BTTS',
    tag: 'Activitate defensivă',
    tagColor: '#f59e0b',
    icon: '🔄',
    complexity: 4,
    what: 'Both Teams To Score (BTTS) cuantifică probabilitatea ca ambele echipe să înscrie cel puțin un gol pe parcursul meciului. Reflectă echilibrul dintre capacitatea ofensivă a fiecărei echipe și vulnerabilitățile defensive ale adversarului.',
    factors: [
      'Rata de meciuri în care echipa a marcat cel puțin un gol (ultimele 10)',
      'Rata de meciuri în care echipa a primit cel puțin un gol (ultimele 10)',
      'xG ofensiv vs. soliditate defensivă a adversarului',
      'Frecvența BTTS în meciurile directe anterioare',
      'Importanța meciului — echipele care au nevoie de puncte adoptă strategie mai ofensivă',
    ],
    insight: 'Echipele cu rata BTTS >65% în ultimele 10 meciuri prezintă coerență statistică ridicată pentru această clasificare. Modelul ponderează separat forma ofensivă și cea defensivă.',
  },
  {
    id: '04',
    name: 'Acoperire Dublă — Double Chance',
    tag: 'Probabilitate compusă',
    tagColor: '#818cf8',
    icon: '🛡️',
    complexity: 2,
    what: 'Cuantifică probabilitatea compusă a două din cele trei rezultate posibile simultan: 1X (gazdă nu pierde), X2 (oaspete nu pierde) sau 12 (niciuna dintre echipe nu face egal). Reprezintă suma probabilităților individuale din matricea 1X2.',
    factors: [
      'Distribuția probabilistică completă a rezultatului 1X2',
      'Corelația statistică dintre cele trei variante posibile',
      'Robustețea modelului în meciurile cu echipe de forță similară (elo_diff mic)',
    ],
    insight: 'Double Chance este derivat matematic direct din analiza 1X2. Un model cu acuratețe ridicată pe 1X2 produce automat estimări corecte pentru varianta compusă.',
  },
  {
    id: '05',
    name: 'Handicap Asiatic',
    tag: 'Analiză ajustată',
    tagColor: '#f472b6',
    icon: '⚡',
    complexity: 5,
    what: 'Sistemul de handicap asiatic elimină posibilitatea echipatei și redistribuie probabilitățile pe un spectru continuu. Modelul calculează probabilitățile ajustate prin aplicarea unui offset de forță relativă (Elo differential) la distribuția brută 1X2.',
    factors: [
      'Diferența Elo între echipe — factorul principal de ajustare',
      'Distribuția istorică a marjelor de victorie pentru perechea analizată',
      'Performanța în meciuri cu handicap similar (istoricul de acoperire)',
      'Linia de handicap specifică oferită de piața de referință (Pinnacle)',
    ],
    insight: 'Handicapul asiatic reduce varianța analizei în meciurile dezechilibrate. Modelul Oxiano calculează probabilitățile ajustate pentru linii standard: -0.5, -1, -1.5, +0.5, +1.',
  },
  {
    id: '06',
    name: 'Proiecție Scor Exact',
    tag: 'Distribuție Poisson',
    tagColor: '#34d399',
    icon: '🎯',
    complexity: 5,
    what: 'Estimarea distribuției complete a scorurilor posibile prin modelul statistic Poisson bivariate. Modelul calculează probabilitatea fiecărui scor individual (0-0, 1-0, 1-1 etc.) pe baza ratelor de atac și apărare ale ambelor echipe.',
    factors: [
      'Rata medie de goluri înscrise a echipei gazdă vs. puterea defensivă a oaspetelui',
      'Rata medie de goluri primite a oaspetelui vs. puterea ofensivă a gazdei',
      'Parametri lambda calculați prin regresie pe ultimele 10 meciuri',
      'Ajustare pentru meciuri cu mize deosebite (finală, derby, retrogradare)',
    ],
    insight: 'Distribuția Poisson produce o matrice completă de probabilități pentru toate scorurile posibile. Scorurile 1-0, 1-1 și 2-1 acoperă statistic ~45% din totalul meciurilor europene.',
  },
  {
    id: '07',
    name: 'Prag Redus Goluri — Over/Under 1.5',
    tag: 'Volum minim',
    tagColor: '#38bdf8',
    icon: '📉',
    complexity: 3,
    what: 'Analizează probabilitatea ca meciul să producă cel puțin 2 goluri (Over 1.5) sau să rămână la maximum 1 gol (Under 1.5). Pragul 1.5 este relevant în meciurile cu echipe puternic defensive sau în contextul confruntărilor de mare miză tactică.',
    factors: [
      'xG combinat al ambelor echipe — indicator primar',
      'Frecvența meciurilor cu 0 sau 1 gol în istoricul celor două echipe',
      'Contextul competițional: faza eliminatorie, derby de retrogradare',
      'Soliditatea defensivă cuantificată prin Goals Against Average (GAA)',
    ],
    insight: 'Statistic, ~88% din meciurile ligilor majore europene depășesc pragul 1.5 goluri. Under 1.5 este o clasificare cu probabilitate mai redusă dar cu putere predictivă crescută când modelul o identifică.',
  },
  {
    id: '08',
    name: 'Rezultat Pauză — Half Time',
    tag: 'Analiză temporală',
    tagColor: '#fb923c',
    icon: '⏱️',
    complexity: 4,
    what: 'Clasificarea statistică a rezultatului la finalul primei reprize, independent de rezultatul final. Modelul analizează tendințele de start de meci, stilul tactic de deschidere și corelația dintre rezultatul la pauză și cel final.',
    factors: [
      'Rata de victorie/egal/înfrângere la pauză din ultimele 10 meciuri per echipă',
      'Corelația HT/FT — frecvența cu care rezultatul de la pauză se menține la final',
      'Strategia de start identificată din analiza secvențelor primelor 45 de minute',
      'Oboseala acumulată și rotația de lot — factori care afectează prima repriză',
    ],
    insight: 'Corelația HT/FT variază semnificativ între ligi. În Premier League, ~55% din rezultatele de la pauză se mențin la finalul meciului. Modelul calibrează această corelație per ligă.',
  },
  {
    id: '09',
    name: 'Victorie la Zero — Win to Nil',
    tag: 'Eficiență defensiv-ofensivă',
    tagColor: '#22c55e',
    icon: '🔒',
    complexity: 5,
    what: 'Cuantifică probabilitatea ca o echipă să câștige meciul fără a primi niciun gol. Reprezintă intersecția statistică dintre capacitatea ofensivă (să marcheze cel puțin un gol) și soliditatea defensivă completă (să nu primească niciun gol). Este una dintre cele mai selective clasificări ale modelului.',
    factors: [
      'Probabilitatea de victorie din matricea 1X2',
      'Rata de Clean Sheet a echipei respective în ultimele 10 meciuri',
      'xG Against — goluri așteptate primite, indicator al vulnerabilității defensive',
      'Puterea ofensivă a adversarului față de soliditatea defensivă proprie (matchup analysis)',
      'Istoricul Win to Nil în confruntările directe anterioare',
    ],
    insight: 'Win to Nil combină două probabilități independente: victorie și Clean Sheet. Modelul calculează intersecția lor, producând o clasificare cu frecvență redusă (~15–25% din meciurile câștigate) dar cu putere predictivă ridicată.',
  },
  {
    id: '10',
    name: 'Foaie Albă — Clean Sheet',
    tag: 'Soliditate defensivă',
    tagColor: '#a78bfa',
    icon: '🧱',
    complexity: 4,
    what: 'Analizează probabilitatea ca o echipă să nu primească niciun gol pe parcursul meciului, indiferent de rezultatul final. Este un indicator pur al solidității defensive și al incapacității adversarului de a finaliza ocaziile create. Modelul analizează Clean Sheet separat pentru echipa gazdă și pentru cea oaspete.',
    factors: [
      'Rata de Clean Sheet din ultimele 10 meciuri (acasă/deplasare separat)',
      'xG Against — media golurilor așteptate primite per meci',
      'Puterea ofensivă a adversarului: xG For, rata de finalizare, eficiența în față porții',
      'Forma portarului și a liniei defensive (indice de soliditate calculat din GAA)',
      'Contextul tactic: echipa adoptă bloc defensiv sau presing înalt?',
    ],
    insight: 'Clean Sheet-ul gazdei apare statistic în ~30–35% din meciurile ligilor majore. Corelat cu soliditatea defensivă (GAA <1.0) și cu xG Against scăzut (<0.8), probabilitatea crește semnificativ și devine relevantă statistic pentru model.',
  },
]

const MARKETS_EN = [
  {
    id: '01',
    name: 'Final Result — 1X2',
    tag: 'Primary model',
    tagColor: '#22d3ee',
    icon: '⚖️',
    complexity: 3,
    what: 'The tripartite classification of a football match result into one of three possible outcomes: home team win (1), draw (X) or away team win (2). This is the foundation of any statistical football analysis.',
    factors: [
      'Elo rating of both teams and relative strength differential',
      'Recent home vs. away form (5 and 10 match windows)',
      'Direct H2H history from the last 6 encounters',
      'Average xG (Expected Goals) statistics for the current season',
      'Venue advantage — model calibrates home and away performance separately',
    ],
    insight: 'The Oxiano model achieves 74–86% accuracy on this analysis type at confidence ≥65%, depending on the league. La Liga and Bundesliga show the highest degree of statistical predictability.',
  },
  {
    id: '02',
    name: 'Goal Volume — Over/Under 2.5',
    tag: 'Offensive volume',
    tagColor: '#4ade80',
    icon: '⚽',
    complexity: 4,
    what: 'Analyses the probability that the total goals scored in a match will exceed or remain below the 2.5 goal threshold. This is the most widely used volume threshold in statistical football match analysis.',
    factors: [
      'Average offensive and defensive xG for both teams in the current season',
      'Goals scored and conceded rate over the last 10 matches',
      'Playing style identified through historical offensive sequence analysis',
      'Match conditions: local derby, table importance, fatigue (squad rotation)',
      'H2H tendency toward high or low scoring matches',
    ],
    insight: 'Matches between teams with combined xG >2.8 per game have a statistically high probability of exceeding the 2.5 threshold. The model integrates this variable as a primary classification factor.',
  },
  {
    id: '03',
    name: 'Mutual Scoring — BTTS',
    tag: 'Defensive activity',
    tagColor: '#f59e0b',
    icon: '🔄',
    complexity: 4,
    what: 'Both Teams To Score (BTTS) quantifies the probability that both teams will score at least one goal during the match. It reflects the balance between each team\'s offensive capacity and the opponent\'s defensive vulnerabilities.',
    factors: [
      'Rate of matches in which the team scored at least one goal (last 10)',
      'Rate of matches in which the team conceded at least one goal (last 10)',
      'Offensive xG vs. defensive solidity of the opponent',
      'BTTS frequency in previous direct encounters',
      'Match importance — teams needing points adopt a more offensive strategy',
    ],
    insight: 'Teams with a BTTS rate >65% in their last 10 matches show high statistical consistency for this classification. The model weights offensive and defensive form separately.',
  },
  {
    id: '04',
    name: 'Double Chance',
    tag: 'Composite probability',
    tagColor: '#818cf8',
    icon: '🛡️',
    complexity: 2,
    what: 'Quantifies the composite probability of two of the three possible outcomes simultaneously: 1X (home does not lose), X2 (away does not lose) or 12 (neither team draws). Represents the sum of individual probabilities from the 1X2 matrix.',
    factors: [
      'Complete probabilistic distribution of the 1X2 result',
      'Statistical correlation between the three possible outcomes',
      'Model robustness in matches with similarly-rated teams (small elo_diff)',
    ],
    insight: 'Double Chance is derived mathematically directly from the 1X2 analysis. A model with high 1X2 accuracy automatically produces correct estimates for the composite variant.',
  },
  {
    id: '05',
    name: 'Asian Handicap',
    tag: 'Adjusted analysis',
    tagColor: '#f472b6',
    icon: '⚡',
    complexity: 5,
    what: 'The Asian handicap system eliminates the draw possibility and redistributes probabilities across a continuous spectrum. The model calculates adjusted probabilities by applying a relative strength offset (Elo differential) to the raw 1X2 distribution.',
    factors: [
      'Elo differential between teams — primary adjustment factor',
      'Historical distribution of winning margins for the analysed pairing',
      'Performance in matches with similar handicap (coverage history)',
      'Specific handicap line offered by the reference market (Pinnacle)',
    ],
    insight: 'Asian handicap reduces analysis variance in unbalanced matches. The Oxiano model calculates adjusted probabilities for standard lines: -0.5, -1, -1.5, +0.5, +1.',
  },
  {
    id: '06',
    name: 'Correct Score Projection',
    tag: 'Poisson distribution',
    tagColor: '#34d399',
    icon: '🎯',
    complexity: 5,
    what: 'Estimation of the complete distribution of possible scores through the bivariate Poisson statistical model. The model calculates the probability of each individual score (0-0, 1-0, 1-1 etc.) based on the attack and defence rates of both teams.',
    factors: [
      'Average goals scored rate of the home team vs. defensive strength of the away side',
      'Average goals conceded rate of the away team vs. offensive strength of the home side',
      'Lambda parameters calculated through regression on the last 10 matches',
      'Adjustment for high-stakes matches (final, derby, relegation)',
    ],
    insight: 'The Poisson distribution produces a complete probability matrix for all possible scores. Scores of 1-0, 1-1 and 2-1 statistically cover ~45% of all European matches.',
  },
  {
    id: '07',
    name: 'Low Goal Threshold — Over/Under 1.5',
    tag: 'Minimum volume',
    tagColor: '#38bdf8',
    icon: '📉',
    complexity: 3,
    what: 'Analyses the probability that the match will produce at least 2 goals (Over 1.5) or remain at a maximum of 1 goal (Under 1.5). The 1.5 threshold is relevant in matches featuring highly defensive teams or in high-stakes tactical encounters.',
    factors: [
      'Combined xG of both teams — primary indicator',
      'Frequency of matches with 0 or 1 goal in both teams\' history',
      'Competitive context: knockout stage, relegation derby',
      'Defensive solidity quantified through Goals Against Average (GAA)',
    ],
    insight: 'Statistically, ~88% of major European league matches exceed the 1.5 goal threshold. Under 1.5 is a lower-frequency classification but carries increased predictive power when identified by the model.',
  },
  {
    id: '08',
    name: 'Half Time Result',
    tag: 'Temporal analysis',
    tagColor: '#fb923c',
    icon: '⏱️',
    complexity: 4,
    what: 'Statistical classification of the result at the end of the first half, independent of the final result. The model analyses match-opening trends, tactical starting styles and the correlation between the half-time and full-time result.',
    factors: [
      'Win/draw/loss rate at half-time over the last 10 matches per team',
      'HT/FT correlation — frequency with which the half-time result holds at full-time',
      'Opening strategy identified from first-45-minute sequence analysis',
      'Accumulated fatigue and squad rotation — factors affecting the first half',
    ],
    insight: 'HT/FT correlation varies significantly between leagues. In the Premier League, ~55% of half-time results hold at full-time. The model calibrates this correlation per league.',
  },
  {
    id: '09',
    name: 'Win to Nil',
    tag: 'Defensive-offensive efficiency',
    tagColor: '#22c55e',
    icon: '🔒',
    complexity: 5,
    what: 'Quantifies the probability that a team wins the match without conceding any goals. Represents the statistical intersection between offensive capacity (scoring at least one goal) and complete defensive solidity (conceding no goals). One of the model\'s most selective classifications.',
    factors: [
      'Win probability from the 1X2 matrix',
      'Clean Sheet rate of the team in question over the last 10 matches',
      'xG Against — expected goals conceded, indicator of defensive vulnerability',
      'Opponent offensive strength vs. own defensive solidity (matchup analysis)',
      'Win to Nil history in previous direct encounters',
    ],
    insight: 'Win to Nil combines two independent probabilities: win and Clean Sheet. The model calculates their intersection, producing a low-frequency classification (~15–25% of matches won) but with high predictive power.',
  },
  {
    id: '10',
    name: 'Clean Sheet',
    tag: 'Defensive solidity',
    tagColor: '#a78bfa',
    icon: '🧱',
    complexity: 4,
    what: 'Analyses the probability that a team concedes no goals during the match, regardless of the final result. It is a pure indicator of defensive solidity and the opponent\'s inability to convert created chances. The model analyses Clean Sheet separately for the home and away team.',
    factors: [
      'Clean Sheet rate over the last 10 matches (home/away separately)',
      'xG Against — average expected goals conceded per match',
      'Opponent offensive strength: xG For, finishing rate, efficiency in front of goal',
      'Goalkeeper and defensive line form (solidity index calculated from GAA)',
      'Tactical context: does the team adopt a defensive block or high press?',
    ],
    insight: 'Home team Clean Sheet occurs statistically in ~30–35% of major league matches. Correlated with defensive solidity (GAA <1.0) and low xG Against (<0.8), the probability increases significantly and becomes statistically relevant for the model.',
  },
]

function ComplexityBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 16, height: 4, borderRadius: 2,
          background: i <= value ? '#22d3ee' : '#1e3a5f',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

export default function GhidPietePage() {
  const { lang } = useLang()
  const ro = lang === 'ro'
  const MARKETS = ro ? MARKETS_RO : MARKETS_EN

  return (
    <div style={{ minHeight: '100vh', background: '#0a1128', color: '#e5e7eb' }}>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>
            OXIANO · Quantitative Analysis Engine
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.01em' }}>
            {ro ? 'Tipuri de Analize Statistice' : 'Statistical Analysis Types'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 15, maxWidth: 580, margin: '0 auto 8px' }}>
            {ro
              ? 'Cele 10 tipuri de rezultate statistice pe care modelul Oxiano le analizează, cu metodologia și factorii de calcul aferenți.'
              : 'The 10 statistical result types that the Oxiano model analyses, with their associated methodology and calculation factors.'}
          </p>
          <p style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace' }}>
            {ro ? 'Model XGBoost + Poisson · 225.000 meciuri · 10 ligi europene' : 'XGBoost + Poisson model · 225,000 matches · 10 European leagues'}
          </p>
        </div>

        {/* Complexity legend */}
        <div style={{ background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 10, padding: '14px 20px', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace', flexShrink: 0 }}>
            {ro ? 'Complexitate model' : 'Model complexity'}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: ro ? 'Redusă' : 'Low', val: 2 },
              { label: ro ? 'Medie' : 'Medium', val: 3 },
              { label: ro ? 'Ridicată' : 'High', val: 4 },
              { label: ro ? 'Foarte ridicată' : 'Very high', val: 5 },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ComplexityBar value={c.val} />
                <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Markets grid */}
        <div style={{ display: 'grid', gap: 24 }}>
          {MARKETS.map(m => (
            <div key={m.id} style={{
              background: '#0f1f35',
              border: `1px solid ${m.tagColor}22`,
              borderLeft: `3px solid ${m.tagColor}`,
              borderRadius: 14,
              padding: '28px 28px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', fontFamily: 'monospace', background: '#0a1128', border: '1px solid #1e3a5f', borderRadius: 6, padding: '3px 10px' }}>
                    #{m.id}
                  </div>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{m.name}</h2>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: m.tagColor + '18', color: m.tagColor,
                    border: `1px solid ${m.tagColor}33`,
                    borderRadius: 20, padding: '2px 10px',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>{m.tag}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    {ro ? 'Complexitate' : 'Complexity'}
                  </div>
                  <ComplexityBar value={m.complexity} />
                </div>
              </div>

              {/* What */}
              <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.8, marginBottom: 18 }}>{m.what}</p>

              {/* Factors */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  {ro ? 'Factori de calcul' : 'Calculation factors'}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {m.factors.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: m.tagColor, fontSize: 12, flexShrink: 0, marginTop: 2 }}>▸</span>
                      <span style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insight */}
              <div style={{ background: m.tagColor + '0a', border: `1px solid ${m.tagColor}22`, borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: m.tagColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  {ro ? 'Insight model' : 'Model insight'}
                </div>
                <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>{m.insight}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 56, padding: '40px 32px', background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>
            {ro ? 'Accesează analiza live' : 'Access live analysis'}
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
            {ro ? 'Toate cele 10 tipuri de analiză, actualizate zilnic' : 'All 10 analysis types, updated daily'}
          </h3>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
            {ro
              ? 'Modelul Oxiano rulează automat la 07:00 și 13:30 și publică rezultatele analizei pentru meciurile zilei.'
              : 'The Oxiano model runs automatically at 07:00 and 13:30 and publishes analysis results for the day\'s matches.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/daily" style={{ padding: '12px 28px', borderRadius: 9, textDecoration: 'none', fontWeight: 700, fontSize: 14, background: '#22d3ee', color: '#000' }}>
              {ro ? '🎯 Analiza zilei' : '🎯 Daily Analysis'}
            </a>
            <a href="/manual" style={{ padding: '12px 28px', borderRadius: 9, textDecoration: 'none', fontWeight: 700, fontSize: 14, background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)' }}>
              {ro ? '📖 Ghid de utilizare' : '📖 User Guide'}
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace', lineHeight: 1.6 }}>
            {ro
              ? 'Conținutul acestei pagini are scop exclusiv educațional și informativ. Analiză statistică · Nu sfat de pariere · oxiano.com'
              : 'The content of this page is for exclusively educational and informational purposes. Statistical analysis · Not betting advice · oxiano.com'}
          </p>
        </div>

      </main>
    </div>
  )
}
