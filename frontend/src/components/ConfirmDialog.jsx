import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';
import GlassPanel from './GlassPanel';

/**
 * ConfirmDialog — Aqua Glass Light Theme
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) onCancel();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const confirmClass =
    variant === 'success'
      ? 'btn-success'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-primary';

  const icon =
    variant === 'danger' ? (
      <AlertCircle size={22} color="#E11D48" />
    ) : variant === 'success' ? (
      <CheckCircle size={22} color="#00BD9D" />
    ) : (
      <HelpCircle size={22} color="#49C6E5" />
    );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(23,40,63,0.30)',
        backdropFilter: 'blur(10px)',
        padding: 'var(--space-4)',
      }}
      onClick={!loading ? onCancel : undefined}
    >
      <div
        style={{ width: '100%', maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        <GlassPanel
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon}
              <span style={{ color: 'var(--text-primary)' }}>{title}</span>
            </div>
          }
          actions={
            !loading && (
              <button className="btn-icon" onClick={onCancel} title="Close">
                <X size={18} />
              </button>
            )
          }
        >
          <p
            style={{
              color: 'var(--text-body)',
              fontSize: 14,
              lineHeight: 1.65,
              marginBottom: 24,
            }}
          >
            {description}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              className={`btn ${confirmClass}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
