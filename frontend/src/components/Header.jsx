import React from 'react';

/**
 * Header — Blueprint Dark Theme
 * Technical Specification Compliance:
 *  - Left: Solid cobalt (#1d63ff) hub badge with white network graph SVG
 *  - Title: Flat ice-blue (#93d5ff) 38px "Workflow Orchestration Engine" (Alata font, no gradient)
 *  - Right: Exactly 3 solid matte-black (#070a0f) buttons: "??", "Live", "Demo"
 */
export default function Header({ isDemoMode, setIsDemoMode, backendConnected, checkingHealth, onCheckHealth }) {
  return (
    <header className="bp-header">
      {/* ── Left: Hub Badge + Large Title ── */}
      <div className="bp-header-left">
        <div className="bp-hub-badge" title="Workflow Hub">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" fill="#ffffff" />
            <circle cx="12" cy="3" r="2" fill="#ffffff" />
            <circle cx="20.5" cy="9" r="2" fill="#ffffff" />
            <circle cx="18" cy="19" r="2" fill="#ffffff" />
            <circle cx="6" cy="19" r="2" fill="#ffffff" />
            <circle cx="3.5" cy="9" r="2" fill="#ffffff" />
            <line x1="12" y1="9" x2="12" y2="5" />
            <line x1="14.5" y1="10.5" x2="18.5" y2="9.5" />
            <line x1="13.5" y1="14" x2="16.5" y2="17.5" />
            <line x1="10.5" y1="14" x2="7.5" y2="17.5" />
            <line x1="9.5" y1="10.5" x2="5.5" y2="9.5" />
          </svg>
        </div>

        <h1 className="bp-header-title">Workflow Orchestration Engine</h1>
      </div>

      {/* ── Right: Exactly 3 Matte-Black Buttons ── */}
      <div className="bp-header-right">
        {/* Angled hatch accents above buttons */}
        <div className="bp-header-hatch" aria-hidden="true">///</div>

        {/* 1. Help button: '??' */}
        <button
          className="bp-btn bp-btn-secondary bp-header-btn"
          title="Help & Documentation"
          aria-label="Help"
          style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}
        >
          ??
        </button>

        {/* 2. Live pill button with status dot */}
        <button
          className={`bp-btn bp-btn-secondary bp-header-btn${!isDemoMode ? ' bp-header-btn-active-live' : ''}`}
          onClick={() => {
            setIsDemoMode(false);
            onCheckHealth?.();
          }}
          title="Live Backend Connection"
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: !isDemoMode && backendConnected ? '#10b981' : isDemoMode ? '#10b981' : '#ef4444',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span>Live</span>
        </button>

        {/* 3. Demo button */}
        <button
          className={`bp-btn bp-btn-secondary bp-header-btn${isDemoMode ? ' bp-header-btn-active-demo' : ''}`}
          onClick={() => setIsDemoMode(true)}
          title="Simulated Demo Mode"
        >
          <span>Demo</span>
        </button>
      </div>
    </header>
  );
}
