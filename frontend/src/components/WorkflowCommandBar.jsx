import React from 'react';
import { Play, RotateCcw, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { abbreviateId } from '../utils/formatters';

/**
 * WorkflowCommandBar — Blueprint Dark Theme
 * Opaque surface-container bar, cobalt "Run Workflow" button, UUID pill, WAL badge, poll controls.
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
      {/* Workflow ID label */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#93d5ff',
          fontWeight: 600,
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
        }}
      >
        PST_AD_165 v1.0.0
      </span>

      {/* Run Workflow */}
      <button
        className="bp-btn bp-btn-primary"
        onClick={onStartWorkflow}
        disabled={isStarting}
      >
        <Play size={12} />
        {isStarting ? 'Starting…' : 'Run Workflow'}
      </button>

      {/* Active instance UUID */}
      {instance && (
        <span className="bp-cmdbar-id-label">
          ID: {abbreviateId(instance.instanceId, 8, 6)}
        </span>
      )}

      {/* WAL badge */}
      <span className="bp-cmdbar-wal-badge">⊕ Atomic WAL · Zero-Token-Waste Recovery</span>

      {/* Right: poll controls */}
      <div className="bp-cmdbar-right">
        <span className="bp-poll-label">Poll: {pollingInterval / 1000}s</span>

        <button
          className="bp-btn bp-btn-secondary bp-btn-sm"
          onClick={togglePause}
          title={isPolling ? 'Pause polling' : 'Resume polling'}
        >
          {isPolling ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
          <span>{isPolling ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          className="bp-btn bp-btn-secondary bp-btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin-slow' : ''} />
          <span>Refresh</span>
        </button>

        {canRetry && (
          <button
            className="bp-btn bp-btn-danger bp-btn-sm"
            onClick={onRetryWorkflow}
            disabled={isRetrying}
          >
            <RotateCcw size={12} />
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
