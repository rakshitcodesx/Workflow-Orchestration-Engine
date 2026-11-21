import React, { useState } from 'react';
import { Search, Trash2, Clock, Layers } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { abbreviateId, formatRelativeTime } from '../utils/formatters';

/**
 * WorkflowInstances — Aqua Glass Light Theme
 * Styled as a frosted glass table with teal accents.
 */
export default function WorkflowInstances({
  instances,
  activeInstanceId,
  onSelectInstance,
  onTrackInstanceId,
  onRemoveTrackedInstance,
  isDemoMode,
}) {
  const [inputVal, setInputVal]     = useState('');
  const [filterStatus, setFilter]   = useState('all');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onTrackInstanceId(inputVal.trim());
    setInputVal('');
  };

  const filtered = instances.filter(
    (i) => filterStatus === 'all' || i.status === filterStatus
  );

  /* Progress per row (succededCount / totalSteps) */
  const rowProgress = (inst) => {
    if (!inst.steps) return null;
    const total = inst.steps.length;
    const done  = inst.steps.filter((s) => s.status === 'succeeded').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <div
      className="glass-panel"
      style={{ overflow: 'hidden' }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(73,198,229,0.16)',
          background: 'rgba(173, 232, 240, 0.28)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Layers size={15} color="var(--aqua-ocean)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {isDemoMode ? 'Demo Workflows' : 'Workflow Instances'}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 7px',
              borderRadius: 999,
              background: 'rgba(73,198,229,0.10)',
              color: '#2A8FA8',
              fontWeight: 700,
              border: '1px solid rgba(73,198,229,0.22)',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            {filtered.length}
          </span>
        </div>

        {/* UUID lookup */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <input
            type="text"
            className="glass-input"
            placeholder="Lookup UUID…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{ fontSize: 12, width: 160 }}
          />
          <button
            type="submit"
            className="btn btn-secondary btn-sm"
            disabled={!inputVal.trim()}
          >
            <Search size={12} />
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '8px 20px',
          borderBottom: '1px solid rgba(73,198,229,0.12)',
          background: 'rgba(173, 232, 240, 0.15)',
        }}
      >
        {['all', 'running', 'completed', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'capitalize',
              letterSpacing: '0.03em',
              background: filterStatus === st
                ? 'linear-gradient(135deg,#49C6E5,#3BB8D8)'
                : 'transparent',
              color: filterStatus === st ? '#fff' : '#657D91',
              boxShadow: filterStatus === st ? '0 2px 8px rgba(73,198,229,0.30)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            {isDemoMode
              ? 'No matching demo instances.'
              : 'No instances yet. Run a workflow or enter a UUID above.'}
          </div>
        ) : (
          <table className="wf-table">
            <colgroup>
              <col className="col-id" />
              <col className="col-status" />
              <col className="col-progress" />
              <col className="col-time" />
              {!isDemoMode && <col className="col-actions" />}
            </colgroup>
            <thead>
              <tr>
                <th>Instance ID</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Created</th>
                {!isDemoMode && <th style={{ width: 32 }} />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => {
                const isActive = inst.instanceId === activeInstanceId;
                const pct      = rowProgress(inst);
                return (
                  <tr
                    key={inst.instanceId}
                    className={isActive ? 'row-active' : ''}
                    onClick={() => onSelectInstance(inst.instanceId)}
                  >
                    {/* ID */}
                    <td>
                      <code
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isActive ? '#17283F' : '#243B53',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {abbreviateId(inst.instanceId, 10, 6)}
                      </code>
                    </td>

                    {/* Status badge */}
                    <td>
                      <StatusBadge status={inst.status} size="sm" />
                    </td>

                    {/* Thin teal progress bar */}
                    <td style={{ minWidth: 100 }}>
                      {pct !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 5,
                              background: 'rgba(73,198,229,0.12)',
                              borderRadius: 999,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background:
                                  inst.status === 'completed'
                                    ? '#00BD9D'
                                    : inst.status === 'failed'
                                    ? '#E11D48'
                                    : 'linear-gradient(90deg,#49C6E5,#00BD9D)',
                                borderRadius: 999,
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'var(--font-mono)',
                              color: '#657D91',
                              width: 28,
                              textAlign: 'right',
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Clock size={11} />
                        {formatRelativeTime(inst.createdAt || inst.updatedAt)}
                      </div>
                    </td>

                    {/* Remove (live mode only) */}
                    {!isDemoMode && (
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTrackedInstance?.(inst.instanceId);
                          }}
                          className="btn-icon"
                          style={{ padding: 4, color: '#B4C5D2' }}
                          title="Untrack"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
