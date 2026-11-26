import React from 'react';
import { Wifi, WifiOff, Zap, Server } from 'lucide-react';

/**
 * Header — Blueprint Dark Theme
 * Cobalt hub icon, flat ice-blue title, solid matte-black control buttons.
 * No subtitle. Single ? text button (no icon) to avoid double-render artifacts.
 */
export default function Header({ isDemoMode, setIsDemoMode, backendConnected, checkingHealth, onCheckHealth }) {
  const connDotColor = isDemoMode ? '#f59e0b' : backendConnected ? '#10b981' : '#ef4444';
  const connLabel    = isDemoMode ? 'Demo' : checkingHealth ? '…' : backendConnected ? 'Live' : 'Offline';

  return (
    <header className="bp-header">
      {/* Left: hub badge + title only — no subtitle */}
      <div className="bp-header-left">
        <div className="bp-hub-badge">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" fill="#ffffff" />
            <line x1="8" y1="1" x2="8" y2="5" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="8" y1="11" x2="8" y2="15" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="1" y1="8" x2="5" y2="8" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="11" y1="8" x2="15" y2="8" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="bp-header-title">Workflow Orchestration Engine</span>
      </div>

      {/* Right: controls */}
      <div className="bp-header-right">
        {/* ? Help — text only, no icon, to prevent double-? rendering */}
        <button
          className="bp-btn bp-btn-secondary"
          style={{ padding: '5px 11px', minWidth: 32, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}
          title="Help"
          aria-label="Help"
        >
          ?
        </button>

        {/* Live pill */}
        <button
          className="bp-btn bp-btn-secondary"
          onClick={() => { setIsDemoMode(false); if (!isDemoMode) onCheckHealth?.(); }}
          style={{
            background: !isDemoMode ? 'rgba(29,99,255,0.14)' : undefined,
            borderColor: !isDemoMode ? '#1d63ff' : undefined,
            color: !isDemoMode ? '#7babff' : undefined,
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connDotColor, flexShrink: 0, display: 'inline-block',
          }} />
          {!isDemoMode
            ? (backendConnected ? <Wifi size={12} /> : <WifiOff size={12} />)
            : <Server size={12} />}
          <span>{connLabel}</span>
        </button>

        {/* Demo button */}
        <button
          className="bp-btn bp-btn-secondary"
          onClick={() => setIsDemoMode(true)}
          style={{
            background: isDemoMode ? 'rgba(245,158,11,0.10)' : undefined,
            borderColor: isDemoMode ? '#f59e0b' : undefined,
            color: isDemoMode ? '#fde68a' : undefined,
          }}
        >
          <Zap size={12} />
          <span>Demo</span>
        </button>
      </div>
    </header>
  );
}
