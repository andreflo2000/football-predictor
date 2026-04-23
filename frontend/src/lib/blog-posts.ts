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
  {
    slug: 'analiza-1x2-fotbal-ghid-complet',
    title: 'Analiza 1X2 în fotbal — ghid complet: cum se calculează și ce înseamnă fiecare rezultat',
    description: 'Analiza 1X2 este fundamentul oricărei predicții statistice de fotbal. Explicăm cum calculează modelul Oxiano probabilitățile pentru victorie gazdă, egal și victorie oaspete, ce factori contează și cum să interpretezi corect scorurile de confidence.',
    date: '2026-04-23',
    readTime: 8,
    category: 'Ghid Piețe',
    keywords: ['analiza 1X2 fotbal', 'ce inseamna 1X2 la pariuri', 'probabilitati fotbal', 'cum se calculeaza 1X2', 'pronosticuri 1X2 fotbal'],
    content: `
<p>Dacă ai deschis vreodată un bilet de pariuri sau ai urmărit o predicție sportivă, ai văzut sigur notația <strong>1X2</strong>. Este cel mai fundamental tip de analiză din fotbal — și, surprinzător, cel mai greșit înțeles.</p>

<h2>Ce înseamnă 1, X și 2</h2>
<p>Notația vine din tradiția europeană a pariurilor pe fotbal:</p>
<ul>
  <li><strong>1</strong> — victorie echipă gazdă (home win)</li>
  <li><strong>X</strong> — egal (draw)</li>
  <li><strong>2</strong> — victorie echipă oaspete (away win)</li>
</ul>
<p>Suma probabilităților celor trei variante este întotdeauna 100%. Dacă modelul spune că gazda câștigă cu 55% probabilitate, egalul are 27% și oaspetele 18%, suma face exact 100%.</p>

<h2>Cum calculează modelul Oxiano probabilitățile 1X2</h2>
<p>Modelul XGBoost antrenat pe <strong>225.000 de meciuri</strong> folosește 84 de variabile pentru fiecare predicție. Cele mai importante pentru analiza 1X2:</p>
<ul>
  <li><strong>Rating Elo al ambelor echipe</strong> — scorul Elo reflectă forța reală a echipei, ajustat după calitatea adversarilor învinși sau de care a fost învinsă. O diferență Elo de 100 de puncte înseamnă aproximativ 64% șanse de victorie pentru echipa mai bine cotată.</li>
  <li><strong>Forma recentă acasă vs. deplasare separat</strong> — modelul analizează ultimele 5 și 10 meciuri jucate specific acasă, respectiv în deplasare. O echipă poate fi formidabilă acasă și slabă în deplasare — statisticile globale amestecă această informație.</li>
  <li><strong>Istoricul direct (head-to-head)</strong> — ultimele 6 confruntări directe între cele două echipe, cu ponderare mai mare pe meciurile recente.</li>
  <li><strong>xG (Expected Goals)</strong> — golurile așteptate reflectă calitatea reală a ocaziilor create, nu norocul. O echipă care a creat ocazii de 2.1 xG per meci dar a marcat doar 1.2 goluri va reveni statistic la media xG.</li>
  <li><strong>Semnale din cote sharp</strong> — piețele Pinnacle, cel mai eficient bookmaker din lume, conțin informație valoroasă despre probabilitățile reale. Modelul extrage această informație fără a replica orbește cotele.</li>
</ul>

<h2>Ce înseamnă „confidence" și de ce contează</h2>
<p>Oxiano nu afișează pur și simplu „1 câștigă". Afișează probabilitatea modelului și un scor de încredere:</p>
<ul>
  <li><strong>Confidence ≥65%</strong> — pick de înaltă calitate, acuratețe istorică 74–86% în funcție de ligă. Aproximativ 1–2 astfel de picks pe zi.</li>
  <li><strong>Confidence 55–65%</strong> — pick mediu, acuratețe 60–65%. Util pentru context, nu pentru selecții principale.</li>
  <li><strong>Confidence sub 55%</strong> — meci echilibrat, modelul evită să facă predicții tari. Egalul este cel mai probabil sau cele trei variante sunt aproape egale.</li>
</ul>
<p>Un pick cu confidence 49% — cum ar fi un meci echilibrat din Premier League — nu este o predicție slabă. Este onestitate statistică: modelul recunoaște că meciul e greu de prezis.</p>

<h2>De ce egalul (X) este cel mai greu de prezis</h2>
<p>Egalul are în medie 26–28% probabilitate în ligile europene majore, dar este cel mai imprevizibil rezultat. Motivele:</p>
<ul>
  <li>Egalul apare adesea când ambele echipe joacă defensiv sau când un gol marcat târziu schimbă rezultatul</li>
  <li>Este influențat de factori care nu apar în date: tactici defensive la comanda antrenorului, oboseală acumulată, presiunea clasamentului</li>
  <li>Modelele de machine learning tind să sub-estimeze egalul față de piețele de pariuri</li>
</ul>
<p>Oxiano calibrează probabilitatea de egal per ligă: Seria A și Ligue 1 produc mai multe egaluri decât Bundesliga sau Premier League.</p>

<h2>Performanța historică pe analiza 1X2</h2>
<p>Pe backtestul out-of-sample (meciuri nevăzute de model la antrenament):</p>
<ul>
  <li>La Liga — confidence ≥65%: <strong>86% acuratețe</strong></li>
  <li>Bundesliga — confidence ≥65%: <strong>79% acuratețe</strong></li>
  <li>Premier League — confidence ≥65%: <strong>70% acuratețe</strong> (cea mai echilibrată ligă)</li>
  <li>Champions League — confidence ≥65%: <strong>74% acuratețe</strong></li>
</ul>
<p>Referință: un pronostic aleatoriu dă ~33% pe analiza 1X2. Modelul depășește de 2–2.5× performanța la întâmplare pe picks cu confidence ridicată.</p>

<h2>Cum să citești analiza 1X2 pe Oxiano</h2>
<p>Pe pagina fiecărui meci vei vedea trei bare de probabilitate — una pentru 1, una pentru X, una pentru 2 — plus confidence-ul predicției principale. Bara verde și procentul evidențiat reprezintă predicția modelului. Dacă confidence e sub 55%, cardul afișează avertisment „meci echilibrat" — nu ascundem incertitudinea.</p>
    `.trim(),
  },
  {
    slug: 'over-under-25-goluri-analiza',
    title: 'Over/Under 2.5 goluri — cum se calculează, ce înseamnă și cum îl analizează modelul statistic',
    description: 'Over/Under 2.5 goluri este una dintre cele mai populare piețe de analiză statistică în fotbal. Explicăm ce înseamnă pragul 2.5, cum folosește modelul Oxiano xG și distribuția Poisson pentru a calcula probabilitatea și care ligi produc cel mai des meciuri cu goluri multe.',
    date: '2026-04-23',
    readTime: 7,
    category: 'Ghid Piețe',
    keywords: ['over under 2.5 goluri fotbal', 'ce inseamna over 2.5', 'analiza over under fotbal', 'probabilitate goluri fotbal', 'over 2.5 statistici'],
    content: `
<p>„Over 2.5" sau „Under 2.5" — poate cea mai vizibilă piață de analiză din fotbalul modern. Dar ce se ascunde în spatele acestui prag și cum îl calculează un model statistic?</p>

<h2>Ce înseamnă 2.5 goluri</h2>
<p>Pragul 2.5 este un număr fracționar ales deliberat pentru a elimina ambiguitatea. Concret:</p>
<ul>
  <li><strong>Over 2.5</strong> — meciul se termină cu 3 sau mai multe goluri (1-2, 0-3, 2-1, 3-0 etc.)</li>
  <li><strong>Under 2.5</strong> — meciul se termină cu 0, 1 sau 2 goluri total (0-0, 1-0, 1-1, 2-0 etc.)</li>
</ul>
<p>Nu există egal — nu poți marca exact 2.5 goluri. Asta simplifică analiza: rezultatul e binar.</p>

<h2>De ce 2.5 și nu 3?</h2>
<p>Statistic, ~52–55% din meciurile ligilor majore europene se termină cu 3+ goluri. Pragul 2.5 creează o piață echilibrată — nici Over, nici Under nu are o probabilitate covârșitoare, ceea ce o face interesantă pentru analiză. Pragul 3.5 ar da Over cu doar ~25% probabilitate medie, prea dezechilibrat.</p>

<h2>Cum calculează modelul Oxiano Over/Under 2.5</h2>
<p>Procesul are două etape distincte:</p>

<h3>Etapa 1 — Estimarea xG pentru fiecare echipă</h3>
<p><strong>xG (Expected Goals)</strong> este numărul de goluri pe care o echipă ar trebui să le marcheze, bazat pe calitatea ocaziilor create în meciurile recente. Modelul calculează xG estimat per meci pentru gazda și oaspetele din meciul următor folosind:</p>
<ul>
  <li>Media xG din ultimele 5, 10 și 20 de meciuri (cu ponderare mai mare pe recent)</li>
  <li>xG acasă vs. xG în deplasare (separat — o echipă poate juca diferit pe teren propriu)</li>
  <li>xG împotriva adversarului — câte ocazii a generat adversarul în meciurile sale recente</li>
  <li>Ajustare prin rating Elo — joci contra unui adversar mai slab sau mai puternic decât media?</li>
</ul>

<h3>Etapa 2 — Distribuția Poisson</h3>
<p>Odată estimate xG Home = λ₁ și xG Away = λ₂, modelul aplică distribuția Poisson bivariată pentru a calcula probabilitatea fiecărui scor posibil: P(0-0), P(1-0), P(0-1), P(1-1), P(2-0) și așa mai departe până la scoruri improbabile.</p>
<p>Suma probabilităților tuturor scorurilor cu 3+ goluri dă <strong>P(Over 2.5)</strong>. Simplu, elegant, matematic riguros.</p>

<h2>Exemplu concret de calcul</h2>
<p>Meci: Arsenal vs Wolves. Modelul estimează xG Arsenal = 1.9, xG Wolves = 0.8. xG combinat = 2.7.</p>
<ul>
  <li>P(Over 2.5) ≈ <strong>58%</strong> — probabilitate moderată spre ridicată</li>
  <li>P(Under 2.5) ≈ <strong>42%</strong></li>
</ul>
<p>Dacă xG combinat ar fi 1.4, P(Over 2.5) ar scădea la ~30%. Relația dintre xG combinat și probabilitatea Over 2.5 este aproape liniară în intervalul relevant.</p>

<h2>Care ligi produc cel mai des Over 2.5</h2>
<p>Statistici istorice din sezonul 2024–2025:</p>
<ul>
  <li><strong>Bundesliga</strong> — ~60% din meciuri se termină Over 2.5. Stilul ofensiv al ligii germane produce cele mai multe goluri per meci din Europa.</li>
  <li><strong>Premier League</strong> — ~54% Over 2.5. Ritm ridicat, dar și apărări solide.</li>
  <li><strong>La Liga</strong> — ~52% Over 2.5. Mai echilibrat, cu mai multe meciuri tactice.</li>
  <li><strong>Serie A</strong> — ~48% Over 2.5. Cel mai defensiv campionat din top 5.</li>
  <li><strong>Ligue 1</strong> — ~50% Over 2.5. Variabilitate mare între meciuri.</li>
</ul>

<h2>Factori care cresc probabilitatea Over 2.5</h2>
<ul>
  <li>Ambele echipe cu xG ofensiv ridicat (>1.4 per meci fiecare)</li>
  <li>Apărări permisive — xG Against ridicat la ambele echipe</li>
  <li>Meciuri fără miză de clasament (echipe fără presiunea retrogradării sau a titlului)</li>
  <li>Derby-uri tradițional „deschise" cu mulți goluri în H2H</li>
</ul>

<h2>Factori care cresc probabilitatea Under 2.5</h2>
<ul>
  <li>Una sau ambele echipe cu apărare solidă (xG Against sub 0.9)</li>
  <li>Meci de mare miză tactică (eliminatorii, derby de titlu)</li>
  <li>Condiții meteo dificile (vânt, ploaie — reduc precizia șuturilor)</li>
  <li>Echipe în formă slabă ofensiv în ultimele 5 meciuri</li>
</ul>

<h2>Over/Under 2.5 pe Oxiano</h2>
<p>Modelul afișează probabilitatea Over și Under 2.5 pentru fiecare meci analizat, calculat prin Poisson din xG estimat. Planul Analyst oferă accesul complet la toate piețele secundare, inclusiv Over/Under 1.5, 3.5 și piețele de goluri pe reprize.</p>
    `.trim(),
  },
  {
    slug: 'cum-sa-folosesti-oxiano-ghid-utilizator',
    title: 'Cum să folosești Oxiano — ghid complet pentru utilizatori noi',
    description: 'Ghid pas cu pas pentru utilizarea platformei Oxiano: cum citești un pick, ce înseamnă fiecare nivel de confidence, indicatorii tehnici (Elo, Edge, Kelly, xG, H2H) și sfaturi practice pentru utilizare eficientă.',
    date: '2026-04-23',
    readTime: 10,
    category: 'Ghid Platformă',
    keywords: ['cum sa folosesti oxiano', 'ghid utilizare predicții fotbal', 'cum citesti un pick fotbal', 'confidence nivel predicție', 'indicatori tehnici fotbal oxiano'],
    content: `
<p>Oxiano afișează un număr de variabile per meci care, la prima vedere, pot părea copleșitoare. Acest ghid îți explică tot ce trebuie să știi ca să extragi maximum din platforma în câteva minute.</p>

<h2>Cum citești un pick — pas cu pas</h2>

<h3>1. Identifică meciul și liga</h3>
<p>Verifică echipele și liga înainte de orice altceva. Modelul performează diferit în funcție de competiție — La Liga și Bundesliga au acuratețe istorică mai mare decât Premier League, tocmai pentru că Premier League e mai echilibrată. Dacă nu cunoști echipele, verifică forma recentă din cardul de meci pentru context rapid.</p>

<h3>2. Citește Confidence % — indicatorul principal</h3>
<p>Confidence este cel mai important număr de pe platformă. Reprezintă probabilitatea modelului pentru rezultatul prezis:</p>
<ul>
  <li><strong>≥70%</strong> — pick cu convingere ridicată. Acuratețe istorică ~78%. Frecvență: ~0.8 picks/zi.</li>
  <li><strong>65–69%</strong> — pick recomandat. Acuratețe istorică ~74.7%. Baza principală de selecții.</li>
  <li><strong>55–64%</strong> — pick informativ. Util ca context, nu ca selecție principală.</li>
  <li><strong>sub 55%</strong> — meci echilibrat. Modelul recunoaște incertitudinea, nu forțează o predicție.</li>
</ul>

<h3>3. Verifică simbolul 💎 Value Bet</h3>
<p>Dacă pick-ul are simbolul diamant, modelul vede și un dezacord față de piața sharp (Edge ≥5%). Acestea sunt cele mai selective semnale — 0.3–0.8 pe zi — și au cel mai bun raport risc/randament pe termen lung în backtesting.</p>

<h3>4. Consultă tab-ul Stats</h3>
<p>Tab-ul Stats afișează forma recentă, rating Elo, xG și head-to-head. Folosește aceste date pentru a valida sau a pune în context predicția modelului — nu lua niciodată o predicție fără să înțelegi contextul meciului.</p>

<h3>5. Verifică Istoricul & Performanța modelului</h3>
<p>Înainte de a folosi orice predicție, consultă secțiunea <a href="/track-record">Istoric & Performanță</a> pentru a înțelege acuratețea reală în timp real. Toate pick-urile trecute sunt vizibile, niciuna nu e ștearsă sau modificată după publicare.</p>

<h2>Nivelurile de confidence — ce înseamnă în practică</h2>

<p>Confidence nu e un număr arbitrar — e probabilitatea calibrată a modelului, validată pe meciuri nevăzute la antrenament:</p>
<ul>
  <li><strong>≥70% (High)</strong> — Modelul are convingere puternică. Acuratețe istorică ~78%. Recomandat ca pick principal. Frecvență redusă — aproximativ 0.8 picks/zi în medie.</li>
  <li><strong>65–69% (Good)</strong> — Baza principală de picks. Acuratețe istorică ~74.7%. Picks zilnice standard — ~1–2 pe zi.</li>
  <li><strong>55–64% (Medium)</strong> — Informativ. Util ca context secundar. Nu baza principală de analiză. Frecvență mare, selectivitate redusă.</li>
  <li><strong>≥65% + Edge ≥5% (💎 Value Bet)</strong> — Cel mai selectiv semnal. Combină convingerea modelului cu dezacord față de piața sharp. ~0.3–0.8/zi. Cel mai bun raport risc/randament în backtesting.</li>
</ul>

<h2>Indicatori tehnici — referință rapidă</h2>

<p>Fiecare meci analizat de Oxiano include mai mulți indicatori tehnici. Iată ce înseamnă fiecare:</p>

<ul>
  <li><strong>Confidence %</strong> — Probabilitatea modelului pentru rezultatul prezis. Baza principală de decizie. ≥65% = pick recomandat.</li>
  <li><strong>Edge %</strong> — Diferența dintre probabilitatea modelului și cea implicată de cotele Pinnacle. Edge ≥5% = dezacord semnificativ față de piața sharp. Disponibil în planul Analyst.</li>
  <li><strong>Kelly %</strong> — Procentul optim din bankroll conform Criteriului Kelly. Oxiano aplică Kelly fracțional, limitat la 10% per pick. Disponibil în planul Analyst.</li>
  <li><strong>Value Bet 💎</strong> — Confidence ≥65% + Edge ≥5% simultan. Cel mai selectiv semnal al platformei.</li>
  <li><strong>Elo Rating</strong> — Forța relativă a echipei, inspirat din sistemul de rating din șah. 1700+ = echipă de elită. O diferență Elo de 100 puncte înseamnă ~64% șanse de victorie pentru echipa mai bine cotată. Unul dintre cei mai predictivi indicatori.</li>
  <li><strong>xG (Expected Goals)</strong> — Goluri așteptate statistic pe baza calității ocaziilor create. xG >1.5 per meci = atac puternic. Calculat din date istorice, actualizat zilnic.</li>
  <li><strong>H2H (Head-to-Head)</strong> — Statistici din ultimele 6 meciuri directe: rata de victorie, egaluri și diferența de goluri a gazdei. Unele rivalități au tipare statistice stabile.</li>
  <li><strong>Formă recentă</strong> — Rata de victorie din ultimele 5 și 10 meciuri, calculată separat pentru acasă și deplasare. O echipă poate fi formidabilă acasă și slabă în deplasare — statisticile globale maschează această asimetrie.</li>
</ul>

<h2>Sfaturi practice pentru utilizare eficientă</h2>

<h3>Verifică platforma de două ori pe zi</h3>
<p>Picks-urile se calculează automat la <strong>07:00 și 13:30 ora României</strong>. Prima verificare dimineața îți dă timp să analizezi meciurile de la prânz și seară; a doua prinde meciurile de după-amiază adăugate mai târziu.</p>

<h3>Pornește mereu din Analiza Zilei</h3>
<p>Pagina <a href="/daily">/daily</a> este deja filtrată și sortată descrescător după confidence. Economisești timp față de a parcurge manual toate predicțiile de pe pagina principală.</p>

<h3>Urmărește Value Bets cu atenție specială</h3>
<p>Sunt rare (0.3–0.8/zi) și reprezintă dezacordul modelului față de piața sharp. Pe termen lung, în backtesting, acestea au cel mai bun raport risc/randament din toate tipurile de picks.</p>

<h3>Consultă Istoricul săptămânal</h3>
<p>Urmărește acuratețea live, nu doar performanța declarată. Dacă modelul trece printr-o perioadă slabă pe o anumită ligă, e important să știi contextul înainte de a te baza pe picks din acea ligă.</p>

<h3>Folosește Combo Analyzer cu precauție</h3>
<p>Probabilitățile combinate scad exponențial cu fiecare meci adăugat. Un combo de 3 picks cu 70% fiecare are probabilitate combinată de doar ~34%. Secțiunea <a href="/bet-builder">Combo Analyzer</a> calculează automat această probabilitate ca să nu fii surprins.</p>

<h3>Abonează-te la canalul Telegram</h3>
<p>Canalul <a href="https://t.me/Oxianoo" target="_blank" rel="noopener noreferrer">@Oxianoo</a> trimite zilnic un combo automat cu cele mai bune 2–3 picks ale zilei (confidence ≥70%, cotă combinată ≥1.80). Dacă nu există un combo care îndeplinește criteriile, nu se trimite nimic — fără spam, fără picks forțate.</p>
    `.trim(),
  },
  {
    slug: 'btts-both-teams-to-score-analiza',
    title: 'BTTS — Both Teams To Score: ce este, cum se calculează și în ce meciuri apare cel mai des',
    description: 'BTTS (Both Teams To Score) sau "Ambele echipe marchează" este o piață statistică care măsoară probabilitatea ca ambele echipe să înscrie cel puțin un gol. Explicăm calculul, factorii determinanți și cum identifici meciurile cu BTTS ridicat.',
    date: '2026-04-23',
    readTime: 6,
    category: 'Ghid Piețe',
    keywords: ['BTTS fotbal ce inseamna', 'ambele echipe marcheaza fotbal', 'both teams to score analiza', 'BTTS statistici fotbal', 'cum se calculeaza BTTS'],
    content: `
<p>BTTS este abrevierea de la <strong>Both Teams To Score</strong> — în română, „Ambele echipe marchează". E una dintre piețele cu cea mai clară logică statistică și, tocmai de aceea, una dintre cele mai analizable cu un model cantitativ.</p>

<h2>Ce înseamnă BTTS exact</h2>
<p>BTTS = Da înseamnă că <strong>ambele echipe</strong> marchează cel puțin un gol pe parcursul meciului, indiferent de scorul final. Exemple de scoruri care satisfac condiția BTTS = Da:</p>
<ul>
  <li>1-1 ✓ (ambele au marcat)</li>
  <li>2-1 ✓</li>
  <li>3-2 ✓</li>
  <li>1-0 ✗ (oaspetele nu a marcat)</li>
  <li>0-0 ✗ (niciuna nu a marcat)</li>
  <li>2-0 ✗ (oaspetele nu a marcat)</li>
</ul>
<p>BTTS = Nu înseamnă că cel puțin una dintre echipe a terminat meciul fără gol marcat.</p>

<h2>Cum calculează modelul Oxiano BTTS</h2>
<p>BTTS este matematic diferit de Over/Under. Nu depinde de totalul golurilor, ci de dacă <em>fiecare echipă în parte</em> marchează. Calculul:</p>

<h3>Probabilitatea că echipa gazdă marchează cel puțin un gol</h3>
<p>Folosind distribuția Poisson cu xG Home = λ₁:</p>
<p>P(gazda marchează) = 1 − P(gazda nu marchează niciun gol) = 1 − e^(−λ₁)</p>

<h3>Probabilitatea că echipa oaspete marchează cel puțin un gol</h3>
<p>Similar, cu xG Away = λ₂:</p>
<p>P(oaspetele marchează) = 1 − e^(−λ₂)</p>

<h3>P(BTTS = Da)</h3>
<p>Presupunând independență statistică (simplificare acceptată în model):</p>
<p>P(BTTS) = P(gazda marchează) × P(oaspetele marchează)</p>

<p>Exemplu: xG Home = 1.6, xG Away = 1.1</p>
<ul>
  <li>P(gazda marchează) = 1 − e^(−1.6) ≈ 79.8%</li>
  <li>P(oaspetele marchează) = 1 − e^(−1.1) ≈ 66.7%</li>
  <li>P(BTTS) ≈ 79.8% × 66.7% ≈ <strong>53.2%</strong></li>
</ul>

<h2>Factori care influențează BTTS</h2>

<h3>Cresc probabilitatea BTTS</h3>
<ul>
  <li><strong>Ambele echipe cu xG ofensiv ridicat</strong> — dacă ambele creează multe ocazii de calitate, e probabil că ambele vor marca cel puțin una</li>
  <li><strong>Apărări permisive la ambele echipe</strong> — un xG Against ridicat (>1.2) la ambele sugerează că adversarul va marca cu ușurință</li>
  <li><strong>Rata BTTS istorică ridicată</strong> — dacă echipa A a marcat în 8 din ultimele 10 meciuri și echipa B în 7 din 10, probabilitatea compusă e ridicată</li>
  <li><strong>Meciuri echilibrate</strong> — când forța echipelor e similară (Elo diferit sub 50 puncte), egalul e mai probabil, deci BTTS crește</li>
  <li><strong>H2H cu multe goluri</strong> — unele rivalități produc sistematic meciuri cu goluri la ambele capete</li>
</ul>

<h3>Scad probabilitatea BTTS</h3>
<ul>
  <li><strong>Apărare solidă la una dintre echipe</strong> — dacă una dintre echipe are Clean Sheet rate >50% în ultimele 10 meciuri, BTTS = Nu devine mai probabil</li>
  <li><strong>Asimetrie mare de forță</strong> — când favoriții zdrobesc adversarii fără să primească gol (ex: Real Madrid acasă cu echipe de mijloc)</li>
  <li><strong>Meci defensiv prin natură</strong> — derby-uri de titlu sau meciuri de evitare a retrogradării produc adesea meciuri mai blocate</li>
</ul>

<h2>BTTS vs. Over 2.5 — care e diferența</h2>
<p>O confuzie frecventă: BTTS și Over 2.5 nu sunt același lucru.</p>
<ul>
  <li>Un meci 1-0 e <strong>Under 2.5</strong> și <strong>BTTS = Nu</strong></li>
  <li>Un meci 1-1 e <strong>Under 2.5</strong> și <strong>BTTS = Da</strong> — surprinzător pentru mulți</li>
  <li>Un meci 3-0 e <strong>Over 2.5</strong> și <strong>BTTS = Nu</strong></li>
  <li>Un meci 2-1 e <strong>Over 2.5</strong> și <strong>BTTS = Da</strong></li>
</ul>
<p>Corelația dintre Over 2.5 și BTTS = Da există dar e departe de a fi perfectă. Modelul le calculează independent prin Poisson.</p>

<h2>Statistici BTTS pe ligi europene</h2>
<ul>
  <li><strong>Bundesliga</strong> — ~55% din meciuri se termină BTTS = Da. Liga cu cel mai ridicat ritm ofensiv.</li>
  <li><strong>Premier League</strong> — ~52% BTTS = Da. Ritm ridicat, dar și apărări solid organizate.</li>
  <li><strong>La Liga</strong> — ~48% BTTS = Da. Mai mult control și mai puțin verticalism.</li>
  <li><strong>Serie A</strong> — ~44% BTTS = Da. Cel mai defensiv campionat din top 5 european.</li>
  <li><strong>Champions League</strong> — ~50% BTTS = Da, cu variabilitate ridicată în funcție de faza competiției.</li>
</ul>

<h2>Cum citești BTTS pe Oxiano</h2>
<p>Fiecare fișă de meci afișează probabilitatea BTTS calculată prin modelul Poisson din xG estimat. Planul Analyst oferă acces la probabilitățile exacte pentru toate piețele secundare, inclusiv BTTS pe prima repriză, BTTS + Over 2.5 și alte combinații derivate.</p>
    `.trim(),
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map(p => p.slug)
}
