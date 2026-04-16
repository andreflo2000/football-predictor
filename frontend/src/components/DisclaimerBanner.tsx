'use client'
import Link from 'next/link'
import { useLang } from '@/lib/LangContext'

export default function DisclaimerBanner() {
  const { lang } = useLang()
  const en = lang === 'en'
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      borderTop: '1px solid rgba(239,68,68,0.25)',
      padding: '8px 16px',
      textAlign: 'center',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', margin: 0, lineHeight: 1.6 }}>
        <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ DISCLAIMER</span>
        {en
          ? <> — Oxiano provides <strong style={{ color: '#cbd5e1' }}>statistical analysis and business intelligence</strong> for
              informational and educational purposes only. This does not constitute betting advice, financial recommendation, or
              inducement to place bets. Users are solely responsible for their own decisions.{' '}
              <Link href="/terms" style={{ color: '#60a5fa', textDecoration: 'underline' }}>T&C</Link>
              {' · '}
              <Link href="/privacy" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Privacy</Link>
            </>
          : <> — Oxiano oferă <strong style={{ color: '#cbd5e1' }}>analiză statistică și business intelligence</strong> cu scop
              informativ și educațional. Nu constituie sfat de pariere, investiție sau recomandare financiară.
              Utilizatorul este singurul responsabil pentru deciziile proprii.{' '}
              <Link href="/terms" style={{ color: '#60a5fa', textDecoration: 'underline' }}>T&C</Link>
              {' · '}
              <Link href="/privacy" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Confidențialitate</Link>
            </>
        }
      </p>
    </div>
  )
}
