'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getToken, logout } from '@/lib/auth'
import { useLang } from '@/lib/LangContext'

const LINKS = {
  ro: [
    { href: '/',             label: 'Predicții AI',     icon: '🔮' },
    { href: '/daily',        label: 'Selecțiile zilei', icon: '🎯' },
    { href: '/bet-builder',  label: 'Combo Analyzer',   icon: '🔢' },
    { href: '/track-record', label: 'Track Record',     icon: '📊' },
    { href: '/despre',       label: 'Despre',           icon: 'ℹ️'  },
    { href: '/upgrade',      label: 'Upgrade',          icon: '⚡', highlight: true },
  ],
  en: [
    { href: '/',             label: 'AI Predictions',   icon: '🔮' },
    { href: '/daily',        label: "Daily Picks",      icon: '🎯' },
    { href: '/bet-builder',  label: 'Combo Analyzer',   icon: '🔢' },
    { href: '/track-record', label: 'Track Record',     icon: '📊' },
    { href: '/despre',       label: 'About',            icon: 'ℹ️'  },
    { href: '/upgrade',      label: 'Upgrade',          icon: '⚡', highlight: true },
  ],
}

export default function Navbar() {
  const pathname  = usePathname()
  const [open, setOpen]     = useState(false)
  const [logged, setLogged] = useState(false)
  const { lang, setLang }   = useLang()

  useEffect(() => {
    setLogged(!!getToken())
  }, [pathname])

  if (pathname?.startsWith('/manual')) return null

  const links = LINKS[lang]

  return (
    <>
      {/* ── Desktop / Mobile top bar ─────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(5, 15, 10, 0.97)',
        borderBottom: '1px solid rgba(34,197,94,0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 16px',
          height: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="Oxiano" className="navbar-logo" style={{ objectFit: 'contain' }} />
          </a>

          {/* Desktop links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
            {links.map(l => {
              const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href))
              return (
                <a key={l.href} href={l.href} style={{
                  padding: '6px 10px',
                  borderRadius: 7,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: l.highlight ? '#f59e0b' : active ? '#4ade80' : '#9ca3af',
                  background: active ? 'rgba(34,197,94,0.10)' : 'transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                  {l.icon} {l.label}
                </a>
              )
            })}

            {/* Lang toggle */}
            <select
              value={lang}
              onChange={e => setLang(e.target.value as 'ro' | 'en')}
              style={{
                marginLeft: 8,
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#e5e7eb',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'monospace',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ro" style={{ background: '#0a1628', color: '#e5e7eb' }}>RO</option>
              <option value="en" style={{ background: '#0a1628', color: '#e5e7eb' }}>EN</option>
            </select>

            <a href="/login" style={{
              marginLeft: 8,
              padding: '6px 14px',
              borderRadius: 7,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: logged ? '#4ade80' : '#fff',
              background: logged ? 'rgba(34,197,94,0.12)' : 'rgba(37,99,235,0.25)',
              border: `1px solid ${logged ? 'rgba(34,197,94,0.3)' : 'rgba(37,99,235,0.4)'}`,
              whiteSpace: 'nowrap',
            }}>
              {logged ? (lang === 'ro' ? '👤 Cont' : '👤 Account') : '🔑 Login'}
            </a>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(v => !v)}
            className="mobile-menu-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 22, padding: '4px 8px',
              display: 'none',
            }}
            aria-label="Menu"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'fixed', top: 68, left: 0, right: 0, bottom: 0,
            background: 'rgba(3, 10, 6, 0.98)',
            zIndex: 999,
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 4,
            overflowY: 'auto',
          }}
          onClick={() => setOpen(false)}
        >
          {links.map(l => {
            const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href))
            return (
              <a key={l.href} href={l.href} style={{
                padding: '14px 18px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: active ? 700 : 500,
                color: l.highlight ? '#f59e0b' : active ? '#4ade80' : '#e5e7eb',
                background: active ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>{l.icon}</span>
                {l.label}
                {active && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 12 }}>●</span>}
              </a>
            )
          })}

          {/* Lang toggle mobile */}
          <div style={{ padding: '4px 18px' }} onClick={e => e.stopPropagation()}>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as 'ro' | 'en')}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e5e7eb',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'monospace',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ro" style={{ background: '#0a1628', color: '#e5e7eb' }}>RO</option>
              <option value="en" style={{ background: '#0a1628', color: '#e5e7eb' }}>EN</option>
            </select>
          </div>

          <a href="/login" style={{
            marginTop: 4,
            padding: '14px 18px',
            borderRadius: 10,
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            color: logged ? '#4ade80' : '#fff',
            background: logged ? 'rgba(34,197,94,0.10)' : 'rgba(37,99,235,0.20)',
            border: `1px solid ${logged ? 'rgba(34,197,94,0.3)' : 'rgba(37,99,235,0.4)'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{logged ? '👤' : '🔑'}</span>
            {logged
              ? (lang === 'ro' ? 'Contul meu' : 'My Account')
              : (lang === 'ro' ? 'Login / Înregistrare' : 'Login / Register')}
          </a>

          {logged && (
            <button
              onClick={(e) => { e.stopPropagation(); logout(); setLogged(false); setOpen(false) }}
              style={{
                marginTop: 4,
                padding: '12px 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                color: '#6b7280',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {lang === 'ro' ? 'Deconectare' : 'Sign out'}
            </button>
          )}
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 68 }} />

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .navbar-logo { width: 44px; height: 44px; }
        }
        @media (min-width: 769px) {
          .navbar-logo { width: 68px; height: 68px; }
        }
      `}</style>
    </>
  )
}
