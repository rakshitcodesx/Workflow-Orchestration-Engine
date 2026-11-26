import React from 'react';
import { formatDuration } from '../utils/formatters';

/**
 * ProgressIndicator (Summary Strip) — Blueprint Dark Theme
 * 4-metric boxes over isolated solid #1d63ff/#070a0f concentric ripple background.
 * Matches 053be6ae.png exactly.
 */
export default function ProgressIndicator({ instance }) {
  const status = instance?.status || 'running';
  const workflowId = instance?.workflowId || 'PST_AD_165';
  const succeededCount = instance?.metrics?.succeededCount ?? 3;
  const totalSteps = instance?.metrics?.totalSteps ?? 4;
  const pct = instance?.metrics?.percentComplete ?? Math.round((succeededCount / totalSteps) * 100);
  const ztw = instance?.metrics?.zeroTokenWasteCount ?? 3;
  const elapsed = instance?.createdAt ? formatDuration(instance.createdAt, null) : '7m 57s';

  return (
    <div className="bp-summary-strip-wrapper">
      {/* Background Ripple */}
      <div className="bp-summary-ripple-bg" aria-hidden="true" />

      {/* 4 Opaque Summary Cards */}
      <div className="bp-summary-cards">
        {/* 1: Workflow Status */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">WORKFLOW STATUS:</div>
          <div className="bp-metric-value" style={{ color: 'var(--cyan)' }}>
            {status.toUpperCase().replace('_', ' ')} [{workflowId}]
          </div>
        </div>

        {/* 2: Pipeline Progress */}
        <div className="bp-metric-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="bp-metric-label" style={{ marginBottom: 0 }}>PIPELINE PROGRESS:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ice-blue)', fontWeight: 600 }}>
              {succeededCount} / {totalSteps} steps
            </span>
          </div>
          <div className="bp-progress-track">
            <div className="bp-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* 3: Zero-Token-Waste */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">ZERO-TOKEN-WASTE:</div>
          <div className="bp-metric-value" style={{ color: '#93d5ff' }}>
            {ztw} cached
          </div>
        </div>

        {/* 4: Elapsed Time */}
        <div className="bp-metric-box">
          <div className="bp-metric-label">ELAPSED TIME:</div>
          <div className="bp-metric-value" style={{ color: '#93d5ff' }}>
            {elapsed}
          </div>
        </div>
      </div>
    </div>
  );
}
