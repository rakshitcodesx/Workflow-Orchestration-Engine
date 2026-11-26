import React from 'react';
import { getStatusMeta } from '../utils/status';

/**
 * StatusBadge — Blueprint Dark Theme
 * Solid opaque badges, no blur, hard drop shadow.
 */
export default function StatusBadge({ status, size = 'md' }) {
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
