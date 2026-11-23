import React from 'react';
import { Wifi, WifiOff, Zap, Server } from 'lucide-react';

/**
 * Header — Aqua Glass Light Theme
 * Responsive: collapses gracefully at ≤500px.
 */
export default function Header({
  isDemoMode,
  setIsDemoMode,
  backendConnected,
  checkingHealth,
  onCheckHealth,
}) {
  const [narrow, setNarrow] = React.useState(() => window.innerWidth <= 500);
  React.useEffect(() => {
    const handler = () => setNarrow(window.innerWidth <= 500);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const connDotColor = isDemoMode ? '#D97706' : backendConnected ? '#00BD9D' : '#E11D48';
  const connLabel = isDemoMode ? 'Demo' : checkingHealth ? '…' : backendConnected ? 'Live' : 'Offline';

  return (
    <header className="dashboard-header">

      {/* ── Left: brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
        {/* Title */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {narrow ? (
            <span
              className="header-title-short"
              style={{
                display: 'block',
                fontWeight: 800, fontSize: 13,
                letterSpacing: '-0.03em', color: '#F0FAFF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              Orchestration Engine
            </span>
          ) : (
            <span
              className="header-title-full"
              style={{
                display: 'block',
                fontWeight: 800, fontSize: 16,
                letterSpacing: '-0.03em', color: '#F0FAFF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              Workflow Orchestration Engine
            </span>
          )}
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 5 : 10, flexShrink: 0, marginLeft: narrow ? 6 : 8 }}>

        {/* Connectivity status pill — hidden on narrow, shown on wide */}
        {!narrow && (
          <div
            onClick={!isDemoMode ? onCheckHealth : undefined}
            title={isDemoMode ? 'Demo Mode' : backendConnected ? 'Flask :5000 connected' : 'Backend offline — click retry'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              borderRadius: 999,
              background: 'rgba(205,238,247,0.88)',
              border: `1px solid ${isDemoMode ? 'rgba(217,119,6,0.36)' : backendConnected ? 'rgba(0,189,157,0.40)' : 'rgba(225,29,72,0.33)'}`,
              cursor: !isDemoMode ? 'pointer' : 'default',
              fontSize: 12, fontWeight: 600,
              color: isDemoMode ? '#7A3600' : backendConnected ? '#044F38' : '#891030',
              backdropFilter: 'blur(12px)',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: connDotColor, boxShadow: `0 0 6px ${connDotColor}`, flexShrink: 0 }} />
            {isDemoMode ? <Zap size={12} /> : backendConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{connLabel}</span>
          </div>
        )}

        {/* Live / Demo toggle */}
        <div style={{
          display: 'flex', background: 'rgba(185,230,243,0.92)',
          padding: 3, borderRadius: 10, border: '1px solid rgba(73,198,229,0.34)',
          gap: 2, backdropFilter: 'blur(12px)', flexShrink: 0,
        }}>
          <button
            onClick={() => setIsDemoMode(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: narrow ? '5px 7px' : '5px 10px',
              borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: !isDemoMode ? 'linear-gradient(135deg,#49C6E5,#3BB8D8)' : 'transparent',
              color: !isDemoMode ? '#031420' : '#90C4D8',
              boxShadow: !isDemoMode ? '0 2px 8px rgba(73,198,229,0.35)' : 'none',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            <Server size={11} />
            {!narrow && <span>Live</span>}
          </button>
          <button
            onClick={() => setIsDemoMode(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: narrow ? '5px 7px' : '5px 10px',
              borderRadius: 7, fontSize: 12, fontWeight: 700,
              background: isDemoMode ? 'rgba(217,119,6,0.14)' : 'transparent',
              color: isDemoMode ? '#FCD34D' : '#90C4D8',
              border: isDemoMode ? '1px solid rgba(217,119,6,0.28)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            <Zap size={11} />
            {!narrow && <span>Demo</span>}
            {narrow && <span>Demo</span>}
          </button>
        </div>
      </div>

    </header>
  );
}
