import React from 'react';
import { Sparkles, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDuration, formatRelativeTime } from '../utils/formatters';

/**
 * ProgressIndicator — Aqua Glass Light Theme
 * Compact metric strip above the main grid.
 */
export default function ProgressIndicator({ instance }) {
  if (!instance) return null;

  const { metrics, status, createdAt, updatedAt } = instance;
  const isCompleted = status === 'completed';
  const isFailed    = status === 'failed';

  const progressColor = isCompleted
    ? 'linear-gradient(90deg, #00BD9D, #54DEFD)'
    : isFailed
    ? 'linear-gradient(90deg, #E11D48, #F43F5E)'
    : 'linear-gradient(90deg, #49C6E5 0%, #00BD9D 100%)';

  return (
    <div
      className="glass-panel"
      style={{ padding: '16px 20px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 20,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        {/* Status */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 5 }}>
            Workflow Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={status} />
            <code style={{ fontSize: 11, color: '#8FA5B6' }}>[{instance.workflowId}]</code>
          </div>
        </div>

        {/* Pipeline */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 5 }}>
            Pipeline Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.succeededCount}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              / {metrics.totalSteps} steps
            </span>
          </div>
        </div>

        {/* Zero-Token-Waste */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 5 }}>
            Zero-Token-Waste
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="#00BD9D" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>
              {metrics.zeroTokenWasteCount} cached
            </span>
          </div>
        </div>

        {/* Elapsed */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 5 }}>
            Elapsed Time
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} color="#8FA5B6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>
              {formatDuration(createdAt, isCompleted || isFailed ? updatedAt : null)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
          <span>Execution completion</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.percentComplete}%
          </span>
        </div>
        <div
          style={{
            height: 7,
            background: 'rgba(73,198,229,0.12)',
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid rgba(73,198,229,0.15)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${metrics.percentComplete}%`,
              background: progressColor,
              borderRadius: 999,
              transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: isCompleted ? '0 0 8px rgba(0,189,157,0.50)' : '0 0 8px rgba(73,198,229,0.40)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
