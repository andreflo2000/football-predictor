'use client'
import { useState, useEffect } from 'react'

export default function GdprConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('flopi_gdpr')
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('flopi_gdpr', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.98)',
      borderTop: '1px solid rgba(59,130,246,0.3)',
      padding: '16px',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🍪</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#e2e8f0', fontSize: '13px', margin: '0 0 4px', fontWeight: 600 }}>
              Confidențialitate și cookies
            </p>
            <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
              Folosim cookies esențiale pentru funcționarea aplicației și stocăm local pronosticurile tale.
              Nu folosim cookies de marketing sau tracking terți.{' '}
              <a href="/privacy" style={{ color: '#60a5fa' }}>Politica de confidențialitate</a>
              {' · '}
              <a href="/terms" style={{ color: '#60a5fa' }}>Termeni și condiții</a>
            </p>
          </div>
          <button
            onClick={accept}
            style={{
              background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 16px',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              flexShrink: 0, fontFamily: 'monospace',
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
