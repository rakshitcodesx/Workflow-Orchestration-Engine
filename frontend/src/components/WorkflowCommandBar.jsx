import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  Copy,
  Check,
  Pause,
  RefreshCw,
  Database,
  Sparkles,
} from 'lucide-react';
import { abbreviateId } from '../utils/formatters';
import { canRetryWorkflow } from '../utils/status';

/**
 * WorkflowCommandBar — Aqua Glass Light Theme
 * Row 2: left = workflow selector + run button, right = WAL badge + controls
 * Responsive: wraps to two rows at narrow widths.
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
  setPollingInterval,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (!instance?.instanceId) return;
    navigator.clipboard.writeText(instance.instanceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isFailed = canRetryWorkflow(instance);

  return (
    <div
      className="glass-panel"
      style={{ padding: '14px 20px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* ── Left: workflow selector + run ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Workflow selector pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 13px',
              background: 'rgba(237,248,251,0.80)',
              border: '1px solid rgba(73,198,229,0.28)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--text-body)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Database size={13} color="var(--aqua-ocean)" />
            <span>PST_AD_165</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
                background: 'rgba(73,198,229,0.12)',
                color: '#2A8FA8',
                border: '1px solid rgba(73,198,229,0.22)',
                fontWeight: 700,
                letterSpacing: '0.03em',
              }}
            >
              v1.0.0
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={onStartWorkflow}
            disabled={isStarting}
            style={{ flexShrink: 0 }}
          >
            <Play size={13} fill="currentColor" />
            <span>{isStarting ? 'Starting…' : 'Run Workflow'}</span>
          </button>

          {isFailed && (
            <button
              className="btn btn-danger"
              onClick={onRetryWorkflow}
              disabled={isRetrying}
              title="Reset failed step and resume execution"
              style={{ flexShrink: 0 }}
            >
              <RotateCw size={12} className={isRetrying ? 'animate-spin-slow' : ''} />
              <span>{isRetrying ? 'Retrying…' : 'Retry'}</span>
            </button>
          )}

          {instance && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: 'rgba(237,248,251,0.70)',
                border: '1px solid rgba(73,198,229,0.20)',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID:</span>
              <code style={{ fontSize: 12, color: '#17283F', fontWeight: 700 }}>
                {abbreviateId(instance.instanceId, 10, 6)}
              </code>
              <button
                onClick={handleCopyId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 2,
                  color: copied ? '#00BD9D' : '#8FA5B6',
                }}
                title="Copy UUID"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: WAL badge + polling controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* WAL badge — text truncates on narrow screens */}
          <div
            className="wal-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              background: 'rgba(0,189,157,0.08)',
              border: '1px solid rgba(0,189,157,0.22)',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: '#065F46',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              flexShrink: 1,
              overflow: 'hidden',
            }}
          >
            <Sparkles size={12} color="#00BD9D" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Atomic WAL · Zero-Token-Waste Recovery
            </span>
          </div>

          {/* Poll interval */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, flexShrink: 0 }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Poll:</span>
            <select
              className="glass-input"
              style={{ padding: '4px 8px', fontSize: 12 }}
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
            >
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={0}>Off</option>
            </select>

            {pollingInterval > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={togglePause}
                title={isPolling ? 'Pause polling' : 'Resume polling'}
              >
                {isPolling ? <Pause size={11} /> : <Play size={11} />}
                <span>{isPolling ? 'Pause' : 'Resume'}</span>
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{ flexShrink: 0 }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin-slow' : ''} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
