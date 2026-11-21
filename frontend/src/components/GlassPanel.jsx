import React from 'react';

/**
 * GlassPanel — Deep Cool Aqua Glass Theme wrapper
 * No warm/cream tones. Strictly cool cyan, navy, slate.
 */
export default function GlassPanel({
  children,
  header,
  actions,
  footer,
  glow = null,
  subtle = false,
  className = '',
  style = {},
}) {
  const baseClass = subtle ? 'glass-panel-subtle' : 'glass-panel';

  return (
    <div
      className={`${baseClass} ${className}`.trim()}
      style={style}
    >
      {(header || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(73,198,229,0.30)',
            background: 'rgba(8, 38, 58, 0.88)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }}
        >
          {header && (
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: '#E2F4FA',
                letterSpacing: '-0.01em',
              }}
            >
              {header}
            </div>
          )}
          {actions && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>
          )}
        </div>
      )}

      <div style={{ padding: 'var(--space-5)' }}>{children}</div>

      {footer && (
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid rgba(73,198,229,0.24)',
            background: 'rgba(6, 30, 46, 0.88)',
            fontSize: 12,
            color: '#6499B2',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
