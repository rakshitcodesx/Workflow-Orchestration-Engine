import React from 'react';

/**
 * GlassPanel — Aqua Glass Light Theme wrapper
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
            borderBottom: '1px solid rgba(73,198,229,0.16)',
            background: 'rgba(173, 232, 240, 0.28)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }}
        >
          {header && (
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--text-primary)',
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
            borderTop: '1px solid rgba(73,198,229,0.14)',
            background: 'rgba(173, 232, 240, 0.20)',
            fontSize: 12,
            color: 'var(--text-muted)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
