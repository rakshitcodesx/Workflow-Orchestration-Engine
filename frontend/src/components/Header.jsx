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
        <div className="bp-hub-badge" title="Workflow Orchestration Engine">
          <svg
            width="42"
            height="32"
            viewBox="0 0 36 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="bp-logo-mark"
            aria-label="Workflow Engine Logo"
          >
            {/* Hard Offset Shadow for "W" and Circuit Traces */}
            <g transform="translate(1.5, 1.5)" opacity="0.95">
              <polyline
                points="3 6, 7.2 22, 11.2 12, 15.2 22, 19.4 6"
                stroke="#030508"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="17.3" cy="14" r="2.8" fill="#030508" />
              <path
                d="M 17.3 14 H 23.5 V 7 H 29.5"
                stroke="#030508"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path
                d="M 23.5 14 V 21 H 29.5"
                stroke="#030508"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <rect x="29.5" y="5" width="4.2" height="4.2" fill="#030508" />
              <rect x="29.5" y="19" width="4.2" height="4.2" fill="#030508" />
            </g>

            {/* Bold Cobalt Geometric "W" */}
            <polyline
              points="3 6, 7.2 22, 11.2 12, 15.2 22, 19.4 6"
              stroke="#1d63ff"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="3 6, 7.2 22, 11.2 12, 15.2 22, 19.4 6"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Circular node on the W */}
            <circle cx="17.3" cy="14" r="2.8" fill="#22d3ee" stroke="#070a0f" strokeWidth="1" />
            <circle cx="17.3" cy="14" r="1.1" fill="#070a0f" />

            {/* Bright Cyan Orthogonal Circuit Trace Paths */}
            <path
              d="M 17.3 14 H 23.5 V 7 H 29.5"
              stroke="#22d3ee"
              strokeWidth="1.8"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <path
              d="M 23.5 14 V 21 H 29.5"
              stroke="#22d3ee"
              strokeWidth="1.8"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />

            {/* Crisp Square Terminal Pads (#22d3ee stroke, dark fill) */}
            <rect
              x="29.5"
              y="5"
              width="4.2"
              height="4.2"
              fill="#070a0f"
              stroke="#22d3ee"
              strokeWidth="1.5"
            />
            <circle cx="31.6" cy="7.1" r="0.75" fill="#22d3ee" />

            <rect
              x="29.5"
              y="19"
              width="4.2"
              height="4.2"
              fill="#070a0f"
              stroke="#22d3ee"
              strokeWidth="1.5"
            />
            <circle cx="31.6" cy="21.1" r="0.75" fill="#22d3ee" />
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
