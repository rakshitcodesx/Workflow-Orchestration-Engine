import React from 'react';

/**
 * GlassPanel — stub kept for import compatibility with App.jsx.
 * Renders a simple blueprint-themed opaque container.
 */
export default function GlassPanel({ children, header, actions, subtle }) {
  return (
    <div
      style={{
        background: subtle ? 'var(--surface)' : 'var(--surface-container)',
        border: '1.5px solid var(--outline)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {(header || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--surface-container)',
            borderBottom: '1px solid var(--outline)',
            gap: 8,
          }}
        >
          <div style={{ fontFamily: 'var(--font-headline)', fontSize: 13, color: 'var(--text-primary)' }}>
            {header}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
