import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { formatDuration } from '../utils/formatters';
import { STEP_STATUSES } from '../utils/status';

/**
 * StepTimeline — Aqua Glass Light Theme
 * Vertical aqua connector, minimal nodes, approval/retry inline.
 */
export default function StepTimeline({ instance, onApproveStep, isSubmittingDecision }) {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    stepId: null,
    stepName: '',
    decision: 'approve',
  });
  const [expandedErrors, setExpandedErrors] = useState({});

  if (!instance?.steps) {
    return (
      <div
        style={{
          padding: '48px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Select a workflow instance from the table to inspect its step graph.
      </div>
    );
  }

  const steps = instance.steps;

  const openConfirm = (stepId, stepName, decision) =>
    setConfirmModal({ isOpen: true, stepId, stepName, decision });

  const handleConfirm = async () => {
    if (!confirmModal.stepId) return;
    try {
      await onApproveStep(confirmModal.stepId, confirmModal.decision);
      setConfirmModal({ isOpen: false, stepId: null, stepName: '', decision: 'approve' });
    } catch {}
  };

  const toggleError = (id) =>
    setExpandedErrors((p) => ({ ...p, [id]: !p[id] }));

  /* ── Node circle color by status ── */
  const nodeStyle = (step) => {
    const { status } = step;
    if (status === 'succeeded')
      return { bg: 'rgba(0,189,157,0.14)', border: '#00BD9D', color: '#065F46' };
    if (status === 'running')
      return { bg: 'rgba(14,165,233,0.14)', border: '#49C6E5', color: '#0369A1' };
    if (status === 'waiting_approval')
      return { bg: 'rgba(217,119,6,0.12)', border: '#D97706', color: '#92400E' };
    if (status === 'failed')
      return { bg: 'rgba(225,29,72,0.10)', border: '#E11D48', color: '#9F1239' };
    return { bg: 'rgba(73,198,229,0.07)', border: 'rgba(73,198,229,0.30)', color: '#657D91' };
  };

  /* ── Connector color ── */
  const connectorColor = (step) => {
    if (step.status === 'succeeded') return '#00BD9D';
    if (step.status === 'running')   return '#49C6E5';
    return 'rgba(73,198,229,0.22)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, idx) => {
        const isWaiting   = step.status === STEP_STATUSES.WAITING_APPROVAL;
        const isRunning   = step.status === STEP_STATUSES.RUNNING;
        const isSucceeded = step.status === STEP_STATUSES.SUCCEEDED;
        const isFailed    = step.status === STEP_STATUSES.FAILED;
        const isLast      = idx === steps.length - 1;
        const ns          = nodeStyle(step);
        const isErrOpen   = expandedErrors[step.stepId] ?? Boolean(step.lastError);

        return (
          <div key={step.stepId} style={{ display: 'flex', gap: 0 }}>
            {/* ── Left column: node + connector ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                width: 44,
              }}
            >
              {/* Step node circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: ns.bg,
                  border: `2px solid ${ns.border}`,
                  color: ns.color,
                  fontWeight: 800,
                  fontSize: 13,
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)',
                  boxShadow: isRunning
                    ? '0 0 12px rgba(73,198,229,0.40)'
                    : isWaiting
                    ? '0 0 12px rgba(217,119,6,0.35)'
                    : 'none',
                }}
                className={
                  isRunning ? 'animate-glow-running' : isWaiting ? 'animate-glow-waiting' : ''
                }
              >
                {isSucceeded ? (
                  <CheckCircle2 size={16} />
                ) : isRunning ? (
                  <Activity size={16} className="animate-spin-slow" />
                ) : isWaiting ? (
                  <ShieldAlert size={16} />
                ) : isFailed ? (
                  <AlertTriangle size={16} />
                ) : (
                  idx + 1
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 20,
                    background: connectorColor(step),
                    borderRadius: 1,
                    margin: '4px 0',
                    transition: 'background var(--transition-normal)',
                  }}
                />
              )}
            </div>

            {/* ── Right column: step card ── */}
            <div
              style={{
                flex: 1,
                marginLeft: 12,
                marginBottom: isLast ? 0 : 12,
              }}
            >
              <div
                className="glass-card"
                style={{
                  border: isWaiting
                    ? '1px solid rgba(217,119,6,0.30)'
                    : isRunning
                    ? '1px solid rgba(73,198,229,0.35)'
                    : isFailed
                    ? '1px solid rgba(225,29,72,0.25)'
                    : '1px solid rgba(255,255,255,0.78)',
                  background: isWaiting
                    ? 'rgba(255,251,245,0.80)'
                    : isRunning
                    ? 'rgba(240,250,255,0.80)'
                    : 'rgba(255,251,250,0.72)',
                }}
              >
                {/* Row: title / id / metrics / badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {step.name}
                      </span>
                      <code
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(73,198,229,0.08)',
                          color: '#2A8FA8',
                          border: '1px solid rgba(73,198,229,0.18)',
                          fontWeight: 600,
                        }}
                      >
                        {step.stepId}
                      </code>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {step.requiresApproval
                        ? '⊙ Human-in-the-Loop review gate'
                        : '⊡ Automated agent step'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Attempts */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(73,198,229,0.07)',
                        border: '1px solid rgba(73,198,229,0.18)',
                        color: '#657D91',
                      }}
                    >
                      {step.attempts}/{step.maxAttempts}
                    </span>
                    {/* Duration */}
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: '#8FA5B6',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <Clock size={12} />
                      {formatDuration(step.startedAt, step.completedAt)}
                    </span>
                    <StatusBadge status={step.status} size="sm" />
                  </div>
                </div>

                {/* Zero-Token-Waste tag */}
                {isSucceeded && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      color: '#065F46',
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(0,189,157,0.14)',
                    }}
                  >
                    <Sparkles size={12} color="#00BD9D" />
                    Zero-Token-Waste — durable, will not re-execute on crash recovery.
                  </div>
                )}

                {/* Approval Gate */}
                {isWaiting && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: 'rgba(255,245,220,0.60)',
                      border: '1px solid rgba(217,119,6,0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldAlert size={22} color="#D97706" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#78350F' }}>
                          Human Operator Approval Required
                        </div>
                        <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                          Engine paused — review upstream analysis before authorising persistence.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => openConfirm(step.stepId, step.name, 'reject')}
                        disabled={isSubmittingDecision}
                      >
                        <X size={13} /> Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => openConfirm(step.stepId, step.name, 'approve')}
                        disabled={isSubmittingDecision}
                      >
                        <Check size={13} /> Approve & Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Error accordion */}
                {step.lastError && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,245,247,0.70)',
                      border: '1px solid rgba(225,29,72,0.20)',
                    }}
                  >
                    <div
                      onClick={() => toggleError(step.stepId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#9F1239',
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} color="#E11D48" />
                        Last error: {step.lastError.split('(')[0].trim()}
                      </div>
                      {isErrOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    {isErrOpen && (
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 10,
                          background: 'rgba(255,235,238,0.60)',
                          borderRadius: 6,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: '#BE123C',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {step.lastError}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.decision === 'approve'
            ? 'Approve Workflow Step'
            : 'Reject Workflow Step'
        }
        description={
          confirmModal.decision === 'approve'
            ? `Approve "${confirmModal.stepName}" (${confirmModal.stepId})? The workflow will resume immediately.`
            : `Reject "${confirmModal.stepName}" (${confirmModal.stepId})? The workflow instance will be marked failed.`
        }
        confirmLabel={
          confirmModal.decision === 'approve' ? 'Approve Step' : 'Reject Step'
        }
        variant={confirmModal.decision === 'approve' ? 'success' : 'danger'}
        loading={isSubmittingDecision}
        onConfirm={handleConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            stepId: null,
            stepName: '',
            decision: 'approve',
          })
        }
      />
    </div>
  );
}
