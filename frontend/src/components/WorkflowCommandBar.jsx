import React from 'react';
import { Play, RotateCcw, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';

/**
 * WorkflowCommandBar — Blueprint Dark Theme
 * Technical Specification Compliance:
 *  - Left: cobalt Run Workflow button, Atomic WAL badge
 *  - Right: Poll: 2s badge, matte-black Pause, matte-black Refresh
 */
export default function WorkflowCommandBar({
  instance,
  onStartWorkflow,
  onRetryWorkflow,
  isStarting,
  isRetrying,
  onRefresh,
  isRefreshing,
  isPolling,
  togglePause,
  pollingInterval,
}) {
  const canRetry = instance?.status === 'failed';

  return (
    <div className="bp-cmdbar">
      {/* ── Left Group ── */}
      <div className="bp-cmdbar-left">
        {/* Run Workflow Button */}
        <button
          className="bp-btn bp-btn-primary"
          onClick={onStartWorkflow}
          disabled={isStarting}
          title="Trigger new workflow run"
        >
          <Play size={12} fill="#ffffff" />
          <span>{isStarting ? 'Starting…' : 'Run Workflow'}</span>
        </button>

        {/* Atomic WAL & Zero-Token-Waste Recovery Badge */}
        <div className="bp-cmdbar-wal-badge">
          <span style={{ color: '#22d3ee', marginRight: 5, fontSize: 13, lineHeight: 1 }}>✳</span>
          <span>Atomic WAL · Zero-Token-Waste Recovery</span>
        </div>
      </div>

      {/* ── Right Group ── */}
      <div className="bp-cmdbar-right">
        <span className="bp-poll-label">Poll: {pollingInterval / 1000}s</span>

        <button
          className="bp-btn bp-btn-secondary bp-btn-sm"
          onClick={togglePause}
          title={isPolling ? 'Pause background polling' : 'Resume polling'}
        >
          {isPolling ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
          <span>{isPolling ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          className="bp-btn bp-btn-secondary bp-btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Manual refresh"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin-slow' : ''} />
          <span>Refresh</span>
        </button>

        {canRetry && (
          <button
            className="bp-btn bp-btn-danger bp-btn-sm"
            onClick={onRetryWorkflow}
            disabled={isRetrying}
            title="Retry failed instance"
          >
            <RotateCcw size={12} />
            <span>{isRetrying ? 'Retrying…' : 'Retry'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
