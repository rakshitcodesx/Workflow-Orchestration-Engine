import React from 'react';
import { Play, RotateCcw, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { abbreviateId } from '../utils/formatters';

/**
 * WorkflowCommandBar — Blueprint Dark Theme
 * Opaque surface container, cobalt "Run Workflow", active UUID pill, WAL badge, polling controls.
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
  const displayId = instance?.instanceId
    ? abbreviateId(instance.instanceId, 8, 6)
    : '3d88ef56-1...9a3201';

  return (
    <div className="bp-cmdbar">
      {/* 1. Workflow Version Tag */}
      <div className="bp-cmdbar-tag">
        <span>PST_AD_165</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>v1.0.0</span>
      </div>

      {/* 2. Run Workflow Button */}
      <button
        className="bp-btn bp-btn-primary"
        onClick={onStartWorkflow}
        disabled={isStarting}
        title="Trigger new workflow run"
      >
        <Play size={12} fill="#ffffff" />
        <span>{isStarting ? 'Starting…' : 'Run Workflow'}</span>
      </button>

      {/* 3. Active instance UUID badge */}
      <div className="bp-cmdbar-id-label">
        <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>ID:</span>
        <span style={{ color: '#93d5ff', fontWeight: 600 }}>{displayId}</span>
      </div>

      {/* 4. Atomic WAL & Zero-Token-Waste Recovery Badge */}
      <div className="bp-cmdbar-wal-badge">
        <span style={{ color: 'var(--cyan)', marginRight: 4 }}>⊕</span>
        <span>Atomic WAL · Zero-Token-Waste Recovery</span>
      </div>

      {/* 5. Right: Polling & Refresh Controls */}
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
