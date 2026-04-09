'use client'

export default function Terms() {
  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Oxiano" className="w-10 h-10" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">OXIANO</div>
              <div className="text-[9px] font-mono text-blue-400 tracking-[0.2em] uppercase">Quantitative Analysis</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link">Predicții AI</a>
            <a href="/daily" className="nav-link">🎯 Selecțiile zilei</a>
            <a href="/weekly" className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-2xl mx-auto px-4 py-8" style={{ overflowX: 'hidden' }}>
        <div className="text-center mb-8 fade-in">
          <h1 className="font-display text-4xl text-white mb-2" style={{ letterSpacing: '0.05em' }}>
            TERMENI ȘI CONDIȚII
          </h1>
          <div className="text-blue-400 text-xs font-mono uppercase tracking-widest">
            Oxiano · Ultima actualizare: Aprilie 2026
          </div>
        </div>

        <div className="space-y-4 fade-in">

          {/* Disclaimer prominent */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3">Disclaimer important</div>
            <p className="text-sm text-gray-300 leading-relaxed font-medium">
              Oxiano este o platformă de <strong>analiză statistică sportivă și business intelligence</strong>.
              Predicțiile generate sunt produse matematice (XGBoost, Elo, Poisson) cu scop
              exclusiv <strong>educațional și informativ</strong>.
            </p>
            <p className="text-sm text-red-400 leading-relaxed mt-2 font-medium">
              Nu reprezintă sfat de pariere, recomandare financiară sau îndemn la pariuri sportive.
              Utilizatorul este singurul responsabil pentru orice decizie luată pe baza informațiilor din aplicație.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">1. Acceptarea termenilor</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Prin accesarea sau utilizarea aplicației Oxiano, ești de acord cu acești Termeni și Condiții.
              Dacă nu ești de acord, te rugăm să nu folosești aplicația. Îți rezervăm dreptul de a modifica acești termeni oricând,
              cu notificare prealabilă prin actualizarea datei de mai sus.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">2. Descrierea serviciului</div>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <p>Oxiano oferă:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Analiză statistică a meciurilor de fotbal prin modele matematice (XGBoost, Elo Rating, Poisson)</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Indicatori de probabilitate bazați pe date istorice (225.000+ meciuri)</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Instrumente de tracking personal al pronosticurilor</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Date sportive live din surse terțe (football-data.org)</span></li>
              </ul>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">3. Limitarea răspunderii</div>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <p>Oxiano <strong className="text-gray-300">nu este responsabilă</strong> pentru:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Pierderi financiare rezultate din utilizarea predicțiilor noastre</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Decizii de pariere luate pe baza informațiilor din aplicație</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Inexactitățile datelor sportive furnizate de terți</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Întreruperi temporare ale serviciului</span></li>
              </ul>
              <p className="mt-3">Acuratețea modelului este de aproximativ <strong className="text-gray-300">75% la predicțiile cu confidence ≥65%</strong> pe piața 1X2, măsurată pe date istorice. Performanțele trecute nu garantează rezultate viitoare.</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">4. Vârsta minimă</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Aplicația este destinată utilizatorilor cu vârsta de <strong className="text-gray-300">minimum 18 ani</strong>.
              Prin utilizarea aplicației, confirmi că ai împlinit această vârstă.
              Nu colectăm în mod intenționat date de la minori.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">5. Utilizare permisă</div>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <p>Este permis să:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0">·</span><span>Folosești aplicația în scop personal și educațional</span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0">·</span><span>Distribui predicțiile cu menționarea sursei (Oxiano)</span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0">·</span><span>Integrezi API-ul în propriile proiecte de analiză (cu abonament Business)</span></li>
              </ul>
              <p className="mt-3">Este interzis să:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Reproduci sau vinzi conținutul fără acordul nostru scris</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Folosești aplicația pentru scraping automat fără acord</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 shrink-0">·</span><span>Prezinți predicțiile ca „certitudini" sau „garantate"</span></li>
              </ul>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">6. Proprietate intelectuală</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Modelele AI, algoritmii, design-ul și conținutul aplicației sunt proprietatea exclusivă a
              Oxiano. Codul sursă este protejat prin drepturi de autor.
              Datele sportive sunt furnizate de terți sub licențele lor proprii.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">7. Conturi și abonamente</div>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <ul className="space-y-1">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Crearea unui cont este opțională și gratuită</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Ești responsabil pentru securitatea parolei tale</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Abonamentele plătite sunt valabile pe durata specificată și nu se rambursează dacă serviciul a fost accesat</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Ne rezervăm dreptul de a suspenda conturi care încalcă acești termeni</span></li>
              </ul>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">8. Legea aplicabilă</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Acești termeni sunt guvernați de legea română și regulamentele UE aplicabile.
              Orice dispută va fi soluționată prin instanțele competente din România.
              Dacă o prevedere devine inaplicabilă, restul termenilor rămân în vigoare.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">9. Contact</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Pentru întrebări legate de acești termeni:
            </p>
            <div className="mt-2 p-3 bg-gray-800/40 rounded-lg">
              <p className="text-sm text-blue-300 font-mono">contact@oxiano.com</p>
              <p className="text-xs text-gray-600 font-mono mt-1">Oxiano · România</p>
            </div>
          </div>

        </div>

        <div className="text-center mt-8 text-xs text-gray-700 font-mono">
          © 2026 Oxiano · Toate drepturile rezervate
        </div>
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            Oxiano — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
