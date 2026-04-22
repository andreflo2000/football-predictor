export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  readTime: number
  category: string
  keywords: string[]
  content: string // HTML string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'cum-functioneaza-predictiile-ai-fotbal',
    title: 'Cum funcționează predicțiile AI în fotbal — XGBoost, Elo și Poisson explicate simplu',
    description: 'Cum transformă Oxiano datele statistice din 225.000 de meciuri în predicții precise de fotbal. Explicăm modelul XGBoost, rating-ul Elo și distribuția Poisson pe înțelesul tuturor.',
    date: '2026-04-22',
    readTime: 7,
    category: 'Metodologie',
    keywords: ['predicții fotbal AI', 'model XGBoost fotbal', 'cum funcționează predicțiile fotbal', 'analiză cantitativă fotbal', 'Elo fotbal'],
    content: `
<p>Când spui „predicție fotbal bazată pe AI", mulți se gândesc la un algoritm magic care ghicește scoruri. Realitatea e mai interesantă — și mai verificabilă.</p>

<h2>Cei trei piloni ai modelului Oxiano</h2>

<h3>1. XGBoost — creierul principal</h3>
<p>XGBoost (eXtreme Gradient Boosting) este un algoritm de machine learning antrenat pe <strong>225.000 de meciuri</strong> din ligile europene majore între 2010 și 2025. Modelul învață din 84 de variabile per meci:</p>
<ul>
  <li>Forma recentă a echipei (ultimele 5, 10, 20 de meciuri)</li>
  <li>Performanța acasă vs. deplasare separat</li>
  <li>Istoricul direct (head-to-head)</li>
  <li>xG (expected goals) — goluri așteptate bazate pe calitatea șuturilor</li>
  <li>Semnale din cotele de piață (cote sharp Pinnacle)</li>
</ul>
<p>Rezultatul: o probabilitate pentru 1, X și 2 care depășește în medie cu 50% acuratețea unui pronostic la întâmplare.</p>

<h3>2. Rating Elo — forța relativă a echipelor</h3>
<p>Sistemul Elo, inventat pentru șah și adaptat pentru fotbal, atribuie fiecărei echipe un scor care reflectă forța sa reală. Când Real Madrid bate Bayern în Champions League, Elo-ul lui Real crește; când pierde cu o echipă inferioară, scade proporțional.</p>
<p>Oxiano folosește date Elo de la ClubElo.com, actualizate zilnic, ca variabilă separată în model.</p>

<h3>3. Distribuția Poisson — calculul piețelor secundare</h3>
<p>Pentru piețele de tip Over/Under, BTTS, Clean Sheet sau Victorie la zero, modelul estimează mai întâi <strong>xG</strong> (goluri așteptate) pentru fiecare echipă, apoi aplică distribuția Poisson pentru a calcula probabilitatea exactă a fiecărui scor posibil.</p>
<p>Exemplu: dacă xG Home = 1.8 și xG Away = 1.1, probabilitatea ca meciul să se termine Peste 2.5 goluri este calculată matematic, nu estimată subiectiv.</p>

<h2>Ce înseamnă „confidence" în practică</h2>
<p>Modelul generează un scor de încredere pentru fiecare predicție:</p>
<ul>
  <li><strong>≥65% confidence</strong> → acuratețe istorică 74% · ~1.1 picks/zi</li>
  <li><strong>55–65% confidence</strong> → acuratețe istorică 60–65%</li>
  <li><strong>&lt;55% confidence</strong> → meci echilibrat, evitat în selecțiile principale</li>
</ul>

<h2>Transparență totală</h2>
<p>Spre deosebire de alte platforme care afișează pronosticuri fără să explice nimic, Oxiano publică metodologia completă, rezultatele verificate zilnic automat și o curbă de equity care arată performanța reală în timp.</p>
<p>Predicțiile sunt analiză statistică, nu sfaturi de pariere. Dar dacă ești interesat de cum funcționează probabilitatea aplicată sportului, aceasta e una dintre cele mai avansate implementări publice disponibile în prezent.</p>
    `.trim(),
  },
  {
    slug: 'predictii-premier-league-model-ai',
    title: 'Predicții Premier League cu AI — cum analizăm cele mai competitive 20 de echipe din lume',
    description: 'Premier League e cea mai impredictibilă ligă din Europa. Cum reușește modelul Oxiano să atingă 70% acuratețe pe meciurile cu confidence ridicată și ce face diferența față de pronosticurile clasice.',
    date: '2026-04-20',
    readTime: 6,
    category: 'Premier League',
    keywords: ['predicții Premier League', 'pronosticuri Premier League azi', 'Premier League AI predictions', 'fotbal Anglia predicții', 'analiză Premier League'],
    content: `
<p>Premier League e considerată cea mai echilibrată ligă de top din lume. Diferența dintre locul 1 și locul 10 e mai mică decât în orice altă ligă majoră. Asta o face și cea mai grea de prezis.</p>

<h2>De ce Premier League e diferită</h2>
<p>În La Liga, Real Madrid și Barcelona câștigă ~85% din meciurile de acasă. În Premier League, niciun club nu depășește constant 75%. Surprizele sunt regula, nu excepția.</p>
<p>Implicația pentru modele de predicție: <strong>o acuratețe de 70% la picks cu confidence ridicată în Premier League valorează mai mult decât 80% în Ligue 1</strong>, unde favoriții câștigă aproape garantat.</p>

<h2>Ce date folosim pentru Premier League</h2>
<p>Modelul Oxiano integrează pentru fiecare meci din Premier League:</p>
<ul>
  <li><strong>Forma pe teren propriu și în deplasare separat</strong> — un club poate fi excelent acasă și slab în deplasare (sau invers)</li>
  <li><strong>xG din ultimele 8 meciuri</strong> — reflectă calitatea reală a jocului, nu norocul</li>
  <li><strong>Rating Elo actualizat zilnic</strong> — ține cont de forța adversarilor din meciurile recente</li>
  <li><strong>Head-to-head pe același stadion</strong> — unele rivalități au tipare statistice clare</li>
  <li><strong>Semnale din cote sharp</strong> — piața Pinnacle e cel mai bun indicator disponibil de „adevăr" statistic</li>
</ul>

<h2>Performanța istorică pe Premier League</h2>
<p>Pe backtestul out-of-sample (Oct 2025–Mar 2026, meciuri nevăzute de model la antrenament):</p>
<ul>
  <li>Confidence ≥65%: <strong>70.0% acuratețe</strong> pe 40 de picks</li>
  <li>Confidence ≥70%: <strong>71.4% acuratețe</strong></li>
</ul>
<p>Referință: un pronostic aleatoriu ar da ~33%. Modelul depășește de peste 2× performanța la întâmplare.</p>

<h2>Cum accesezi predicțiile Premier League</h2>
<p>Predicțiile zilnice pentru Premier League sunt disponibile pe <a href="/predictii/premier-league">pagina dedicată</a>. Planul gratuit arată direcția meciului (1/X/2); planul Analyst deblochează probabilitățile exacte, Over/Under, BTTS și toate piețele calculate prin Poisson.</p>
    `.trim(),
  },
  {
    slug: 'ce-este-xg-expected-goals-fotbal',
    title: 'Ce este xG (Expected Goals) și de ce e cel mai important indicator în fotbalul modern',
    description: 'xG sau Expected Goals a revoluționat analiza fotbalistică. Explicăm ce măsoară, cum se calculează și de ce platforme ca Oxiano îl folosesc ca bază pentru predicții precise.',
    date: '2026-04-18',
    readTime: 5,
    category: 'Educație',
    keywords: ['ce este xG fotbal', 'expected goals explicat', 'xG fotbal Romania', 'statistici avansate fotbal', 'cum se calculeaza xG'],
    content: `
<p>Dacă urmărești fotbal și statistici, ai văzut sigur abrevierea „xG". Dar ce înseamnă exact și de ce contează pentru predicții?</p>

<h2>Definiție simplă</h2>
<p><strong>xG (Expected Goals)</strong> măsoară probabilitatea ca un șut să se transforme în gol, bazată pe caracteristicile acelui șut: distanța față de poartă, unghiul, tipul (cap, picior drept, picior stâng), presiunea adversarilor, faza de joc (corner, atac organizat, contraatac).</p>
<p>Un xG de 0.8 înseamnă că, în situații similare, 8 din 10 șuturi se transformă în gol. Un xG de 0.05 înseamnă un șut dificil, cu 5% șanse.</p>

<h2>De ce e mai util decât golurile marcate</h2>
<p>Golurile sunt zgomotoase statistic. O echipă poate câștiga 3-0 cu xG total 0.9 (a avut noroc) sau pierde 0-1 cu xG 2.4 (a dominat dar n-a marcat). Pe termen lung, echipele tind să revină la performanța indicată de xG.</p>
<p>Asta face din xG un predictor mai bun al performanței viitoare decât scorul din meciurile trecute.</p>

<h2>Cum folosește Oxiano xG</h2>
<p>Modelul estimează xG pentru fiecare echipă din meciul următor bazat pe:</p>
<ul>
  <li>Media xG din ultimele 5, 10 și 20 de meciuri (ferestre temporale multiple)</li>
  <li>xG acasă vs. xG în deplasare separat</li>
  <li>xG împotriva (câte ocazii generează adversarii)</li>
  <li>Ajustare pentru calitatea adversarilor (prin rating Elo)</li>
</ul>
<p>Apoi, aceste valori estimate intră în distribuția Poisson pentru calculul probabilităților la Over/Under, BTTS, Clean Sheet și alte piețe.</p>

<h2>Limitele xG</h2>
<p>xG nu capturează tot. Nu știe de accidentări de ultim moment, nu cuantifică motivația (meci de titlu vs. meci fără miză), nu reflectă transferuri recente. De aceea Oxiano combină xG cu Elo, formă recentă și semnale de piață — nu depinde de o singură metrică.</p>
    `.trim(),
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map(p => p.slug)
}
