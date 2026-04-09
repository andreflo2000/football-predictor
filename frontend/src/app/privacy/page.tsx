'use client'

export default function Privacy() {
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
            POLITICĂ DE CONFIDENȚIALITATE
          </h1>
          <div className="text-blue-400 text-xs font-mono uppercase tracking-widest">
            Oxiano · Ultima actualizare: Martie 2026
          </div>
        </div>

        <div className="space-y-4 fade-in">

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">1. Introducere</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Oxiano ("aplicația", "noi") respectă confidențialitatea utilizatorilor săi.
              Această politică explică ce date colectăm, cum le folosim și cum le protejăm.
              Prin utilizarea aplicației, ești de acord cu această politică.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">2. Date colectate</div>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <p>Aplicația colectează următoarele date:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">·</span>
                  <span><strong className="text-gray-300">Adresă de email</strong> — dacă îți creezi un cont opțional, pentru autentificare</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">·</span>
                  <span><strong className="text-gray-300">Parolă criptată</strong> — stocată exclusiv sub formă hash bcrypt, niciodată în clar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">·</span>
                  <span><strong className="text-gray-300">Pronosticuri introduse manual</strong> — meciurile și predicțiile pe care le adaugi în Tracker</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">·</span>
                  <span><strong className="text-gray-300">Date anonime de utilizare</strong> — pagini vizitate, erori tehnice (fără date personale)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">·</span>
                  <span><strong className="text-gray-300">Nu colectăm</strong> — nume real, număr de telefon, date de plată, locație GPS sau date biometrice</span>
                </li>
              </ul>
              <p className="mt-3 text-gray-600 text-xs">Crearea contului este <strong className="text-gray-400">opțională</strong> — aplicația funcționează complet fără cont.</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">3. Cum folosim datele</div>
            <div className="space-y-1 text-sm text-gray-400 leading-relaxed">
              <p>Datele colectate sunt folosite exclusiv pentru:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Afișarea pronosticurilor tale în Tracker</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Calculul statisticilor de succes (rată corectă/greșită)</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span>Îmbunătățirea experienței în aplicație</span></li>
              </ul>
              <p className="mt-3 text-gray-500">Nu vindem, nu închiriem și nu partajăm datele tale cu terți.</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">4. Stocare date</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Pronosticurile din Tracker sunt stocate securizat în baza de date Supabase (supabase.com),
              cu servere în Europa. Datele sunt criptate în tranzit (HTTPS) și în repaus.
              Poți șterge toate datele tale oricând din aplicație folosind butonul "Șterge tot".
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">5. Predicții AI</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Predicțiile generate de aplicație sunt produse de modele matematice (XGBoost, Poisson, Elo Rating)
              și au scop <strong className="text-gray-300">exclusiv educațional și informativ</strong>.
              Nu reprezintă sfaturi financiare sau de pariuri. Utilizatorul este singurul responsabil
              pentru deciziile luate pe baza informațiilor din aplicație.
              Pariurile sportive implică riscuri financiare. Joacă responsabil.
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">6. Servicii terțe</div>
            <div className="space-y-1 text-sm text-gray-400 leading-relaxed">
              <p>Aplicația folosește servicii externe:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Supabase</strong> — stocare date (supabase.com/privacy)</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Football-data.org</strong> — date sportive live</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Render.com</strong> — hosting server AI</span></li>
              </ul>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">7. Drepturile tale (GDPR)</div>
            <div className="space-y-1 text-sm text-gray-400 leading-relaxed">
              <p>Conform Regulamentului UE 2016/679 (GDPR), ai dreptul să:</p>
              <ul className="space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Acces</strong> — să primești o copie a datelor tale</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Rectificare</strong> — să corectezi datele incorecte</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Ștergere (Art. 17)</strong> — să ștergi contul și toate datele asociate, din pagina de cont sau prin email</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Portabilitate</strong> — să primești datele în format JSON la cerere</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">·</span><span><strong className="text-gray-300">Opoziție</strong> — să te opui prelucrării datelor tale</span></li>
              </ul>
              <p className="mt-3">Pentru exercitarea drepturilor, contactează-ne la <span className="text-blue-400 font-mono">contact@oxiano.com</span>. Răspundem în maxim <strong className="text-gray-300">30 de zile</strong>.</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">8. Contact</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Pentru orice întrebare legată de confidențialitate, ne poți contacta la:
            </p>
            <div className="mt-2 p-3 bg-gray-800/40 rounded-lg">
              <p className="text-sm text-blue-300 font-mono">contact@oxiano.com</p>
              <p className="text-xs text-gray-600 font-mono mt-1">Oxiano · România</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">9. Modificări</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Această politică poate fi actualizată periodic. Versiunea curentă este întotdeauna disponibilă
              la adresa <span className="text-blue-400 font-mono">oxiano.com/privacy</span>.
              Continuarea utilizării aplicației după modificări constituie acceptul noii politici.
            </p>
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
