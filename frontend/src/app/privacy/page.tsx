'use client'
import { useLang } from '@/lib/LangContext'

const LAST_UPDATED = 'April 23, 2026'
const LAST_UPDATED_RO = '23 aprilie 2026'

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div className="card p-6 mb-4">
    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 font-mono">{id}</div>
    <h2 className="text-white font-bold text-base mb-3">{title}</h2>
    <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
  </div>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <span className="text-blue-400 shrink-0 mt-0.5">·</span>
    <span>{children}</span>
  </li>
)

export default function Privacy() {
  const { lang, setLang } = useLang()
  const ro = lang === 'ro'

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <main className="max-w-2xl mx-auto px-4 py-8" style={{ overflowX: 'hidden' }}>

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="flex justify-center mb-4">
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
              {(['ro', 'en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '6px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: lang === l ? '#3b82f6' : 'transparent',
                  color: lang === l ? '#fff' : '#6b7280',
                  fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                }}>
                  {l === 'ro' ? '🇷🇴 Română' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </div>
          <h1 className="font-display text-3xl text-white mb-2" style={{ letterSpacing: '0.05em' }}>
            {ro ? 'POLITICĂ DE CONFIDENȚIALITATE' : 'PRIVACY POLICY'}
          </h1>
          <div className="text-blue-400 text-xs font-mono uppercase tracking-widest">
            Oxiano · {ro ? `Ultima actualizare: ${LAST_UPDATED_RO}` : `Last updated: ${LAST_UPDATED}`}
          </div>
        </div>

        <div className="space-y-4 fade-in">

          {ro ? (
            <>
              <Section id="1. Introducere" title="Cine suntem">
                <p>
                  <strong className="text-gray-300">Oxiano</strong> ("platforma", "noi", "serviciul nostru") este o platformă
                  de analiză cantitativă a datelor sportive, operată ca serviciu digital independent.
                  Ne angajăm să protejăm confidențialitatea utilizatorilor noștri în conformitate cu
                  Regulamentul (UE) 2016/679 (GDPR) și legislația aplicabilă în vigoare.
                </p>
                <p>
                  Această Politică de Confidențialitate descrie în detaliu ce date personale colectăm,
                  în ce scopuri le prelucrăm, cu cine le partajăm și care sunt drepturile dumneavoastră.
                  Prin utilizarea platformei Oxiano, confirmați că ați citit și înțeles prezenta politică.
                </p>
              </Section>

              <Section id="2. Date colectate" title="Categorii de date personale prelucrate">
                <p>Colectăm exclusiv datele strict necesare funcționării serviciului:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Adresă de e-mail</strong> — utilizată pentru crearea și autentificarea contului opțional. Nu este folosită în scopuri de marketing fără consimțământ explicit.</Bullet>
                  <Bullet><strong className="text-gray-300">Parolă criptată</strong> — stocată exclusiv sub formă de hash bcrypt (algoritm de hashing unidirecțional). Nu avem acces la parola în format clar.</Bullet>
                  <Bullet><strong className="text-gray-300">Preferințe de utilizare</strong> — selecții salvate în Combo Analyzer, stocate local în browser (localStorage), fără transmitere către server.</Bullet>
                  <Bullet><strong className="text-gray-300">Date tehnice anonime</strong> — adresă IP (anonimizată), tip browser, erori tehnice, colectate prin Sentry.io exclusiv pentru diagnosticare tehnică.</Bullet>
                </ul>
                <p className="mt-3 text-xs text-gray-500 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <strong className="text-blue-400">Important:</strong> Crearea unui cont este complet opțională. Platforma este pe deplin funcțională fără autentificare. Nu colectăm: nume real, număr de telefon, date de localizare GPS, date biometrice sau informații financiare.
                </p>
              </Section>

              <Section id="3. Scopul prelucrării" title="De ce prelucrăm datele dumneavoastră">
                <p>Prelucrăm datele personale în baza următoarelor temeiuri juridice:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Executarea contractului (Art. 6(1)(b) GDPR)</strong> — furnizarea serviciilor de analiză statistică, gestionarea contului și accesul la funcționalitățile platformei.</Bullet>
                  <Bullet><strong className="text-gray-300">Interes legitim (Art. 6(1)(f) GDPR)</strong> — securitatea platformei, prevenirea fraudei și îmbunătățirea calității serviciului prin date tehnice anonime.</Bullet>
                  <Bullet><strong className="text-gray-300">Consimțământ (Art. 6(1)(a) GDPR)</strong> — comunicări opționale prin e-mail, retractabil oricând.</Bullet>
                </ul>
                <p className="mt-3">Nu folosim datele dumneavoastră pentru publicitate comportamentală, profilare automatizată cu efecte juridice sau vânzare către terți.</p>
              </Section>

              <Section id="4. Stocare și securitate" title="Unde și cum sunt stocate datele">
                <p>Datele cu caracter personal sunt stocate securizat prin intermediul următorilor furnizori certificați:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Supabase Inc.</strong> (SUA) — baza de date principală, cu servere în Uniunea Europeană, certificat SOC 2 Type II. Transfer internațional efectuat în baza clauzelor contractuale standard (SCCs).</Bullet>
                  <Bullet><strong className="text-gray-300">Render.com</strong> (SUA) — server de procesare, certificat SOC 2. Date prelucrate în tranzit, fără stocare permanentă a datelor personale.</Bullet>
                </ul>
                <p className="mt-3">Toate transmisiile sunt protejate prin criptare TLS 1.2+. Datele în repaus sunt criptate la nivel de bază de date. Parola este stocată exclusiv ca hash bcrypt cu salt aleatoriu.</p>
              </Section>

              <Section id="5. Terți și parteneri" title="Partajarea datelor cu terți">
                <p>Nu vindem, nu închiriem și nu comercializăm datele dumneavoastră. Partajăm date limitate exclusiv cu furnizorii de servicii tehnice necesari operării platformei:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Supabase</strong> — stocare date cont (supabase.com/privacy-policy)</Bullet>
                  <Bullet><strong className="text-gray-300">Sentry.io</strong> — monitorizare erori tehnice, date anonimizate (sentry.io/privacy)</Bullet>
                  <Bullet><strong className="text-gray-300">Render.com</strong> — infrastructură server (render.com/privacy)</Bullet>
                  <Bullet><strong className="text-gray-300">Football-data.org / The Odds API</strong> — furnizori de date sportive terțe, nu primesc date personale</Bullet>
                  <Bullet><strong className="text-gray-300">Gumroad Inc.</strong> (SUA) — procesator de plăți pentru abonamentele Analyst și Pro. Gumroad colectează și prelucrează datele de plată (card bancar, adresă de facturare) direct, conform propriei politici de confidențialitate disponibile la <span className="text-blue-400 font-mono">gumroad.com/privacy</span>. Oxiano nu are acces la datele financiare complete ale cardului dumneavoastră.</Bullet>
                </ul>
                <p className="mt-3">Toți furnizorii terți sunt legați contractual să prelucreze datele exclusiv conform instrucțiunilor noastre și să implementeze măsuri adecvate de securitate.</p>
              </Section>

              <Section id="6. Drepturile dumneavoastră" title="Drepturile dumneavoastră conform GDPR">
                <p>Conform Regulamentului (UE) 2016/679, beneficiați de următoarele drepturi:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Dreptul de acces (Art. 15)</strong> — să solicitați o copie a datelor personale pe care le prelucrăm.</Bullet>
                  <Bullet><strong className="text-gray-300">Dreptul la rectificare (Art. 16)</strong> — să corectați datele inexacte sau incomplete.</Bullet>
                  <Bullet><strong className="text-gray-300">Dreptul la ștergere (Art. 17)</strong> — să solicitați ștergerea datelor. Disponibil direct din aplicație prin butonul „Șterge contul și toate datele mele".</Bullet>
                  <Bullet><strong className="text-gray-300">Dreptul la portabilitate (Art. 20)</strong> — să primiți datele dumneavoastră în format JSON structurat.</Bullet>
                  <Bullet><strong className="text-gray-300">Dreptul de opoziție (Art. 21)</strong> — să vă opuneți prelucrării bazate pe interes legitim.</Bullet>
                  <Bullet><strong className="text-gray-300">Dreptul la restricționare (Art. 18)</strong> — să restricționați prelucrarea în anumite circumstanțe.</Bullet>
                </ul>
                <p className="mt-3">Pentru exercitarea oricărui drept, contactați-ne la <span className="text-blue-400 font-mono">contact@oxiano.com</span>. Răspundem în termen de maximum <strong className="text-gray-300">30 de zile calendaristice</strong>. Aveți dreptul să depuneți plângere la <strong className="text-gray-300">Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong>.</p>
              </Section>

              <Section id="7. Retenție" title="Durata de stocare a datelor">
                <ul className="space-y-2">
                  <Bullet><strong className="text-gray-300">Date de cont</strong> — stocate pe durata existenței contului. Șterse integral în termen de 30 de zile de la solicitarea de ștergere a contului.</Bullet>
                  <Bullet><strong className="text-gray-300">Date tehnice anonime</strong> — maximum 90 de zile, conform politicilor Sentry.io.</Bullet>
                  <Bullet><strong className="text-gray-300">Date localStorage</strong> — stocate local pe dispozitivul utilizatorului, sub controlul exclusiv al acestuia.</Bullet>
                </ul>
              </Section>

              <Section id="8. Copii" title="Utilizatori minori">
                <p>
                  Platforma Oxiano este destinată exclusiv persoanelor cu vârsta de minimum <strong className="text-gray-300">18 ani</strong>.
                  Nu colectăm în mod intenționat date cu caracter personal de la minori. Dacă aflăm că am colectat
                  date de la un minor, le vom șterge imediat. Dacă suspectați că un minor a creat un cont,
                  contactați-ne la <span className="text-blue-400 font-mono">contact@oxiano.com</span>.
                </p>
              </Section>

              <Section id="9. Modificări" title="Actualizarea acestei politici">
                <p>
                  Această Politică de Confidențialitate poate fi actualizată periodic pentru a reflecta modificări
                  legislative sau operaționale. Versiunea actuală este întotdeauna disponibilă la
                  <span className="text-blue-400 font-mono"> oxiano.com/privacy</span>. Data ultimei actualizări
                  este indicată la începutul documentului. Continuarea utilizării platformei după publicarea
                  modificărilor constituie acceptul implicit al noii versiuni.
                </p>
              </Section>

              <Section id="10. Contact" title="Date de contact">
                <p>Pentru orice solicitare legată de prelucrarea datelor cu caracter personal:</p>
                <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-blue-300 font-mono text-sm">contact@oxiano.com</p>
                  <p className="text-gray-600 font-mono text-xs mt-1">Oxiano · Sports Analytics Platform · România</p>
                  <p className="text-gray-600 font-mono text-xs mt-0.5">Timp de răspuns: maximum 30 de zile calendaristice</p>
                </div>
              </Section>
            </>
          ) : (
            <>
              <Section id="1. Introduction" title="Who We Are">
                <p>
                  <strong className="text-gray-300">Oxiano</strong> ("the platform", "we", "our service") is a quantitative
                  sports data analytics platform operated as an independent digital service. We are committed to
                  protecting the privacy of our users in accordance with Regulation (EU) 2016/679 (GDPR) and
                  all applicable data protection legislation.
                </p>
                <p>
                  This Privacy Policy describes in detail what personal data we collect, for what purposes
                  we process it, with whom we share it, and what your rights are. By using the Oxiano platform,
                  you confirm that you have read and understood this policy.
                </p>
              </Section>

              <Section id="2. Data Collected" title="Categories of Personal Data Processed">
                <p>We collect exclusively the data strictly necessary for the operation of the service:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Email address</strong> — used for creating and authenticating an optional account. Not used for marketing purposes without explicit consent.</Bullet>
                  <Bullet><strong className="text-gray-300">Encrypted password</strong> — stored exclusively as a bcrypt hash (one-way hashing algorithm). We have no access to passwords in plain text.</Bullet>
                  <Bullet><strong className="text-gray-300">Usage preferences</strong> — Combo Analyzer selections stored locally in the browser (localStorage), without transmission to our servers.</Bullet>
                  <Bullet><strong className="text-gray-300">Anonymous technical data</strong> — anonymised IP address, browser type, technical errors, collected via Sentry.io exclusively for technical diagnostics.</Bullet>
                </ul>
                <p className="mt-3 text-xs text-gray-500 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <strong className="text-blue-400">Important:</strong> Account creation is entirely optional. The platform is fully functional without authentication. We do not collect: real name, phone number, GPS location data, biometric data, or financial information.
                </p>
              </Section>

              <Section id="3. Purpose of Processing" title="Why We Process Your Data">
                <p>We process personal data based on the following legal grounds:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Performance of contract (Art. 6(1)(b) GDPR)</strong> — providing statistical analysis services, account management, and access to platform features.</Bullet>
                  <Bullet><strong className="text-gray-300">Legitimate interest (Art. 6(1)(f) GDPR)</strong> — platform security, fraud prevention, and service quality improvement through anonymous technical data.</Bullet>
                  <Bullet><strong className="text-gray-300">Consent (Art. 6(1)(a) GDPR)</strong> — optional email communications, withdrawable at any time.</Bullet>
                </ul>
                <p className="mt-3">We do not use your data for behavioural advertising, automated profiling with legal effects, or sale to third parties.</p>
              </Section>

              <Section id="4. Storage & Security" title="Where and How Data Is Stored">
                <p>Personal data is stored securely through the following certified providers:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Supabase Inc.</strong> (USA) — primary database, with servers in the European Union, SOC 2 Type II certified. International transfer conducted under Standard Contractual Clauses (SCCs).</Bullet>
                  <Bullet><strong className="text-gray-300">Render.com</strong> (USA) — processing server, SOC 2 certified. Data processed in transit, no permanent storage of personal data.</Bullet>
                </ul>
                <p className="mt-3">All transmissions are protected by TLS 1.2+ encryption. Data at rest is encrypted at the database level. Passwords are stored exclusively as bcrypt hashes with random salt.</p>
              </Section>

              <Section id="5. Third Parties" title="Sharing Data with Third Parties">
                <p>We do not sell, rent, or commercialise your data. We share limited data exclusively with technical service providers necessary for operating the platform:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Supabase</strong> — account data storage (supabase.com/privacy-policy)</Bullet>
                  <Bullet><strong className="text-gray-300">Sentry.io</strong> — technical error monitoring, anonymised data (sentry.io/privacy)</Bullet>
                  <Bullet><strong className="text-gray-300">Render.com</strong> — server infrastructure (render.com/privacy)</Bullet>
                  <Bullet><strong className="text-gray-300">Football-data.org / The Odds API</strong> — third-party sports data providers, do not receive personal data</Bullet>
                  <Bullet><strong className="text-gray-300">Gumroad Inc.</strong> (USA) — payment processor for Analyst and Pro subscriptions. Gumroad collects and processes payment data (bank card, billing address) directly, under its own privacy policy available at <span className="text-blue-400 font-mono">gumroad.com/privacy</span>. Oxiano does not have access to your full card financial data.</Bullet>
                </ul>
                <p className="mt-3">All third-party providers are contractually bound to process data solely in accordance with our instructions and to implement appropriate security measures.</p>
              </Section>

              <Section id="6. Your Rights" title="Your Rights under GDPR">
                <p>Under Regulation (EU) 2016/679, you have the following rights:</p>
                <ul className="mt-2 space-y-2">
                  <Bullet><strong className="text-gray-300">Right of access (Art. 15)</strong> — to request a copy of the personal data we process about you.</Bullet>
                  <Bullet><strong className="text-gray-300">Right to rectification (Art. 16)</strong> — to correct inaccurate or incomplete data.</Bullet>
                  <Bullet><strong className="text-gray-300">Right to erasure (Art. 17)</strong> — to request deletion of your data. Available directly from the app via "Delete account and all my data".</Bullet>
                  <Bullet><strong className="text-gray-300">Right to data portability (Art. 20)</strong> — to receive your data in structured JSON format.</Bullet>
                  <Bullet><strong className="text-gray-300">Right to object (Art. 21)</strong> — to object to processing based on legitimate interest.</Bullet>
                  <Bullet><strong className="text-gray-300">Right to restriction (Art. 18)</strong> — to restrict processing in certain circumstances.</Bullet>
                </ul>
                <p className="mt-3">To exercise any right, contact us at <span className="text-blue-400 font-mono">contact@oxiano.com</span>. We respond within a maximum of <strong className="text-gray-300">30 calendar days</strong>. You have the right to lodge a complaint with your competent national supervisory authority.</p>
              </Section>

              <Section id="7. Retention" title="Data Retention Periods">
                <ul className="space-y-2">
                  <Bullet><strong className="text-gray-300">Account data</strong> — stored for the duration of the account. Deleted in full within 30 days of an account deletion request.</Bullet>
                  <Bullet><strong className="text-gray-300">Anonymous technical data</strong> — maximum 90 days, in accordance with Sentry.io policies.</Bullet>
                  <Bullet><strong className="text-gray-300">localStorage data</strong> — stored locally on the user's device, under the user's exclusive control.</Bullet>
                </ul>
              </Section>

              <Section id="8. Children" title="Minor Users">
                <p>
                  The Oxiano platform is intended exclusively for individuals aged <strong className="text-gray-300">18 years or older</strong>.
                  We do not knowingly collect personal data from minors. If we become aware that we have
                  collected data from a minor, we will delete it immediately. If you suspect that a minor
                  has created an account, please contact us at <span className="text-blue-400 font-mono">contact@oxiano.com</span>.
                </p>
              </Section>

              <Section id="9. Changes" title="Updates to This Policy">
                <p>
                  This Privacy Policy may be updated periodically to reflect legislative or operational changes.
                  The current version is always available at <span className="text-blue-400 font-mono">oxiano.com/privacy</span>.
                  The date of the last update is indicated at the top of this document. Continued use of the
                  platform after publication of changes constitutes implicit acceptance of the new version.
                </p>
              </Section>

              <Section id="10. Contact" title="Contact Information">
                <p>For any request related to the processing of personal data:</p>
                <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-blue-300 font-mono text-sm">contact@oxiano.com</p>
                  <p className="text-gray-600 font-mono text-xs mt-1">Oxiano · Sports Analytics Platform · Romania</p>
                  <p className="text-gray-600 font-mono text-xs mt-0.5">Response time: maximum 30 calendar days</p>
                </div>
              </Section>
            </>
          )}
        </div>

        <div className="text-center mt-8 text-xs text-gray-700 font-mono">
          © 2026 Oxiano · {ro ? 'Toate drepturile rezervate' : 'All rights reserved'}
        </div>
      </main>

      <footer className="border-t border-blue-900/40 mt-8 py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            {ro
              ? 'Oxiano — Platformă de analiză statistică sportivă. Scop exclusiv educațional și informativ.'
              : 'Oxiano — Sports Analytics Platform. For educational and informational purposes only.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
