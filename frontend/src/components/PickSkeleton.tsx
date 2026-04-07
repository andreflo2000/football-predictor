export default function PickSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.4 }
          50% { opacity: 0.8 }
          100% { opacity: 0.4 }
        }
        .sk { background: rgba(255,255,255,0.07); border-radius: 6px; animation: shimmer 1.5s infinite; }
      `}</style>
      <div className="flex justify-between mb-3">
        <div className="sk" style={{ width: '120px', height: '10px' }} />
        <div className="sk" style={{ width: '60px', height: '10px' }} />
      </div>
      <div className="flex justify-between mb-3">
        <div className="sk" style={{ width: '100px', height: '20px' }} />
        <div className="sk" style={{ width: '24px', height: '20px' }} />
        <div className="sk" style={{ width: '100px', height: '20px' }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[0,1,2].map(i => <div key={i} className="sk" style={{ height: '52px', borderRadius: '10px' }} />)}
      </div>
      <div className="sk" style={{ height: '44px', borderRadius: '12px' }} />
    </div>
  )
}
