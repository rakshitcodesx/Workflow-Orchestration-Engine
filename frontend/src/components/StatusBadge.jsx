import React from 'react';
import { getStatusMeta } from '../utils/status';

/**
 * StatusBadge — Blueprint Dark Theme
 * Solid opaque badges with status dot, no blur, hard drop shadow.
 * The coloured dot is rendered via CSS ::before on the badge class
 * so we keep the JSX lean.
 */
export default function StatusBadge({ status }) {
  const meta = getStatusMeta(status);

  const classMap = {
    running: 'bp-status-running',
    pending: 'bp-status-pending',
    succeeded: 'bp-status-succeeded',
    completed: 'bp-status-completed',
    failed: 'bp-status-failed',
    waiting_approval: 'bp-status-waiting',
  };

  const cls = classMap[status] || 'bp-status-pending';

  return (
    <span className={`bp-status-badge ${cls}`}>
      {meta.label.toUpperCase()}
    </span>
  );
}
