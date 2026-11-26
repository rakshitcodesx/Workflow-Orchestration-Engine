import React from 'react';

/**
 * ConfirmDialog — Blueprint Dark Theme
 * Opaque surface-container modal with hard drop shadow, no blur.
 */
export default function ConfirmDialog({ isOpen, title, description, confirmLabel, variant = 'primary', loading, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const confirmClass =
    variant === 'success' ? 'bp-btn bp-btn-success' :
    variant === 'danger'  ? 'bp-btn bp-btn-danger'  :
    'bp-btn bp-btn-primary';

  return (
    <div className="bp-dialog-overlay" onClick={onCancel}>
      <div className="bp-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="bp-dialog-title">{title}</div>
        <div className="bp-dialog-desc">{description}</div>
        <div className="bp-dialog-btns">
          <button className="bp-btn bp-btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
