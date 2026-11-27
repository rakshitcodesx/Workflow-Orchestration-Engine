import React, { useState } from 'react';
import { Search, Trash2, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { abbreviateId, formatRelativeTime } from '../utils/formatters';

/**
 * WorkflowInstances — Blueprint Dark Theme
 * Left Ripple Container (Demo Workflows (4))
 * Technical Specification Compliance:
 *  - 18px 20px padding with cobalt/black repeating-radial-gradient ripples
 *  - Inner container: #0d131d, 1.5px solid #475b7d, 4px 4px 0px #030508 shadow
 *  - Table stretches down to full height
 */
export default function WorkflowInstances({
  instances,
  activeInstanceId,
  onSelectInstance,
  onTrackInstanceId,
  onRemoveTrackedInstance,
  isDemoMode,
}) {
  const [inputVal, setInputVal]   = useState('');
  const [filterStatus, setFilter] = useState('all');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onTrackInstanceId(inputVal.trim());
    setInputVal('');
  };

  const filtered = instances.filter(
    (i) => filterStatus === 'all' || i.status === filterStatus
  );

  const rowProgress = (inst) => {
    if (!inst.steps) return null;
    const total = inst.steps.length;
    const done  = inst.steps.filter((s) => s.status === 'succeeded').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const hasActiveWorkflow = instances.some(
    (i) => i.status === 'running' || i.status === 'pending'
  );

  return (
    <div className={`bp-ripple-card-left${hasActiveWorkflow ? ' bp-ripple-active' : ''}`}>
      <div className="bp-ripple-inner-left">
        {/* Top Header & Filter Block */}
        <div className="bp-instances-header-block">
          {/* Card header */}
          <div className="bp-card-header">
            <div className="bp-card-header-left">
              <h2 className="bp-card-title">
                {isDemoMode ? `Demo Workflows (${instances.length})` : `Workflow Instances (${instances.length})`}
              </h2>
            </div>

            {isDemoMode && <span className="bp-queue-badge">QUEUE_ACTIVE</span>}
          </div>

          {/* Filter pills & search */}
          <div className="bp-filter-bar">
            <div className="bp-filter-pills-group">
              {['all', 'running', 'completed', 'failed'].map((st) => (
                <button
                  key={st}
                  className={`bp-filter-pill${filterStatus === st ? ' active' : ''}`}
                  onClick={() => setFilter(st)}
                >
                  {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            {/* UUID lookup on the right of the filter bar */}
            <form onSubmit={handleSubmit} className="bp-filter-search-form">
              <input
                type="text"
                className="bp-input bp-filter-search-input"
                placeholder="Lookup UUID..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="bp-table-wrapper">
          {filtered.length === 0 ? (
            <div className="bp-table-empty">
              {isDemoMode
                ? 'No matching demo instances.'
                : 'No instances yet. Run a workflow or enter a UUID above.'}
            </div>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>UUID</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Time</th>
                  {!isDemoMode && <th style={{ width: 28 }} />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const isActive = inst.instanceId === activeInstanceId;
                  const pct = rowProgress(inst);
                  return (
                    <tr
                      key={inst.instanceId}
                      className={isActive ? 'row-active' : ''}
                      onClick={() => onSelectInstance(inst.instanceId)}
                    >
                      <td>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: isActive ? '#93d5ff' : '#8899b4',
                            fontWeight: isActive ? 700 : 400,
                          }}
                        >
                          {abbreviateId(inst.instanceId, 8, 6)}
                        </code>
                      </td>
                      <td><StatusBadge status={inst.status} /></td>
                      <td style={{ minWidth: 85 }}>
                        {pct !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                background: 'rgba(29,99,255,0.18)',
                                borderRadius: 2,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background:
                                    inst.status === 'completed'
                                      ? '#10b981'
                                      : inst.status === 'failed'
                                      ? '#ef4444'
                                      : '#1d63ff',
                                  borderRadius: 2,
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10,
                                color: '#4f637a',
                                width: 28,
                                textAlign: 'right',
                              }}
                            >
                              {pct}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#4f637a', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            color: '#4f637a',
                          }}
                        >
                          <Clock size={10} />
                          {formatRelativeTime(inst.createdAt || inst.updatedAt)}
                        </div>
                      </td>
                      {!isDemoMode && (
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveTrackedInstance?.(inst.instanceId); }}
                            style={{ color: '#4f637a', padding: 3, display: 'flex' }}
                            title="Untrack"
                          >
                            <Trash2 size={12} />
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
    </div>
  );
}
