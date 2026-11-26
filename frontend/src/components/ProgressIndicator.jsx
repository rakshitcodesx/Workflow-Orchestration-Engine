import React from 'react';
import { formatDuration, formatRelativeTime } from '../utils/formatters';

/**
 * ProgressIndicator (Summary Strip) — Blueprint Dark Theme
 * 4-metric boxes over isolated solid #1d63ff/#070a0f concentric ripple background.
 */
export default function ProgressIndicator({ instance }) {
  if (!instance) {
    return (
      <div className="bp-summary-strip-wrapper">
        <div className="bp-summary-ripple-bg" />
        <div className="bp-summary-cards">
          {['WORKFLOW STATUS', 'PIPELINE PROGRESS', 'ZERO-TOKEN-WASTE', 'ELAPSED TIME'].map((label) => (
            <div key={label} className="bp-metric-box">
              <div className="bp-metric-label">{label}</div>
              <div className="bp-metric-value" style={{ color: '#4f637a', fontSize: 13 }}>—</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { status, workflowId, steps, metrics, createdAt } = instance;
  const pct = metrics?.percentComplete ?? 0;
  const succeededCount = metrics?.succeededCount ?? 0;
  const totalSteps = metrics?.totalSteps ?? 0;
  const ztw = metrics?.zeroTokenWasteCount ?? 0;
  const elapsed = formatDuration(createdAt, null);

  const statusColorMap = {
    running: '#7babff',
    completed: '#6ee7b7',
    failed: '#fecaca',
    pending: '#8899b4',
    waiting_approval: '#fde68a',
  };
  const statusColor = statusColorMap[status] || '#8899b4';

  return (
    <div className="bp-summary-strip-wrapper">
      <div className="bp-summary-ripple-bg" />
      <div className="bp-summary-cards">
        {/* 1: Workflow Status */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">WORKFLOW STATUS</div>
          <div className="bp-metric-value" style={{ color: statusColor, fontSize: 13 }}>
            {status.toUpperCase().replace('_', ' ')}
          </div>
          <div className="bp-metric-sub">[{workflowId}]</div>
        </div>

        {/* 2: Pipeline Progress */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">PIPELINE PROGRESS</div>
          <div className="bp-metric-value">{succeededCount} / {totalSteps} steps</div>
          <div className="bp-progress-track">
            <div className="bp-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* 3: Zero-Token-Waste */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">ZERO-TOKEN-WASTE</div>
          <div className="bp-metric-value">{ztw} cached</div>
          <div className="bp-metric-sub">skip-on-recovery</div>
        </div>

        {/* 4: Elapsed Time */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">ELAPSED TIME</div>
          <div className="bp-metric-value">{elapsed}</div>
        </div>
      </div>
    </div>
  );
}
