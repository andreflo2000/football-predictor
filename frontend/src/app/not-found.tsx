export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚽</div>
      <h1 style={{ color: '#f1f5f9', fontSize: '48px', fontFamily: 'monospace', fontWeight: 900, margin: '0 0 8px' }}>
        404
      </h1>
      <p style={{ color: '#64748b', fontSize: '14px', fontFamily: 'monospace', margin: '0 0 32px' }}>
        Pagina nu există sau a fost mutată.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/daily" style={{
          background: '#3b82f6', color: '#fff', textDecoration: 'none',
          padding: '10px 20px', borderRadius: '10px',
          fontSize: '13px', fontWeight: 700, fontFamily: 'monospace',
        }}>
          🎯 Selecțiile zilei
        </a>
        <a href="/" style={{
          background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
          textDecoration: 'none', padding: '10px 20px', borderRadius: '10px',
          fontSize: '13px', fontFamily: 'monospace',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          Predicții AI
        </a>
      </div>
    </div>
  )
}
