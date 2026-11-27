import React, { useState } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, ShieldAlert,
  Sparkles, Check, X, Activity,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { formatDuration } from '../utils/formatters';
import { STEP_STATUSES } from '../utils/status';

/**
 * StepTimeline — Blueprint Dark Theme
 * Vertical node+connector chain, opaque step cards with hard shadows.
 * Approval, error, Zero-Token-Waste, WAL connector badges all preserved.
 */
export default function StepTimeline({ instance, onApproveStep, isSubmittingDecision }) {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, stepId: null, stepName: '', decision: 'approve',
  });
  const [expandedErrors, setExpandedErrors] = useState({});

  if (!instance?.steps) {
    return (
      <div className="bp-empty-state">
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

  const nodeClass = (status) => {
    if (status === 'succeeded')       return 'bp-step-node bp-step-node-succeeded';
    if (status === 'running')         return 'bp-step-node bp-step-node-running';
    if (status === 'waiting_approval') return 'bp-step-node bp-step-node-waiting';
    if (status === 'failed')          return 'bp-step-node bp-step-node-failed';
    return 'bp-step-node bp-step-node-pending';
  };

  const cardClass = (status) => {
    if (status === 'running')          return 'bp-step-card bp-step-card-running';
    if (status === 'waiting_approval') return 'bp-step-card bp-step-card-waiting';
    if (status === 'failed')           return 'bp-step-card bp-step-card-failed';
    if (status === 'succeeded')        return 'bp-step-card bp-step-card-succeeded';
    return 'bp-step-card';
  };

  const connectorClass = (status) => {
    if (status === 'succeeded') return 'bp-step-connector bp-step-connector-succeeded';
    if (status === 'running')   return 'bp-step-connector bp-step-connector-running';
    return 'bp-step-connector bp-step-connector-default';
  };

  return (
    <div className="bp-steps-wrapper">
      {steps.map((step, idx) => {
        const isWaiting   = step.status === STEP_STATUSES.WAITING_APPROVAL;
        const isRunning   = step.status === STEP_STATUSES.RUNNING;
        const isSucceeded = step.status === STEP_STATUSES.SUCCEEDED;
        const isFailed    = step.status === STEP_STATUSES.FAILED;
        const isLast      = idx === steps.length - 1;
        const isErrOpen   = expandedErrors[step.stepId] ?? Boolean(step.lastError);
        const showWalBadge = !isLast && (isSucceeded || isRunning);

        // Connector colour class based on upstream step status
        const connectorClass = isSucceeded ? 'succeeded' : isRunning ? 'running' : '';

        return (
          <React.Fragment key={step.stepId}>
            <div className={cardClass(step.status)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Node icon inside card on left */}
                <div
                  className={`${nodeClass(step.status)}${isRunning ? ' animate-pulse-cobalt' : ''}${isWaiting ? ' animate-pulse-warning' : ''}`}
                >
                  {isSucceeded ? (
                    <CheckCircle2 size={13} />
                  ) : isRunning ? (
                    <Activity size={13} className="animate-spin-slow" />
                  ) : isWaiting ? (
                    <ShieldAlert size={13} />
                  ) : isFailed ? (
                    <AlertTriangle size={13} />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title row */}
                  <div className="bp-step-title-row">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="bp-step-name">{step.name}</span>
                        <span className="bp-step-id-tag">{step.stepId}</span>
                      </div>
                      <div className="bp-step-sub">
                        {step.requiresApproval ? '⊙ Human-in-the-Loop review gate' : '⊡ Automated agent step'}
                      </div>
                    </div>
                    <div className="bp-step-meta-row">
                      <span className="bp-step-attempts">{step.attempts}/{step.maxAttempts}</span>
                      <span className="bp-step-dur">
                        <Clock size={10} style={{ display: 'inline', marginRight: 2 }} />
                        {formatDuration(step.startedAt, step.completedAt)}
                      </span>
                      <StatusBadge status={step.status} />
                    </div>
                  </div>

                  {/* Zero-Token-Waste note */}
                  {isSucceeded && (
                    <div className="bp-ztw-note">
                      <Sparkles size={11} />
                      Zero-Token-Waste — durable, will not re-execute on crash recovery.
                    </div>
                  )}

                  {/* Approval gate */}
                  {isWaiting && (
                    <div className="bp-approval-box">
                      <div className="bp-approval-label">
                        <ShieldAlert size={13} style={{ display: 'inline', marginRight: 5 }} />
                        Human Operator Approval Required
                      </div>
                      <div className="bp-approval-desc">
                        Engine paused — review upstream analysis before authorising persistence.
                      </div>
                      <div className="bp-approval-btns">
                        <button
                          className="bp-btn bp-btn-danger bp-btn-sm"
                          onClick={() => openConfirm(step.stepId, step.name, 'reject')}
                          disabled={isSubmittingDecision}
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          className="bp-btn bp-btn-success bp-btn-sm"
                          onClick={() => openConfirm(step.stepId, step.name, 'approve')}
                          disabled={isSubmittingDecision}
                        >
                          <Check size={12} /> Approve & Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error box with header and detail container */}
                  {step.lastError && (
                    <div className="bp-error-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 11 }}>
                        <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span>Last error: {step.lastError}</span>
                      </div>
                      <div className="bp-error-detail-box">
                        {step.lastError}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector rail + WAL_CHECKPOINT_OK badge between steps */}
            {!isLast && (
              <div className="bp-wal-badge">
                <div className="bp-wal-rail-line" />
                {showWalBadge ? (
                  <span className="bp-wal-badge-inner">↓ WAL_CHECKPOINT_OK</span>
                ) : (
                  <div className={`bp-step-connector-rail`}>
                    <div className={`bp-step-connector-line ${connectorClass}`} />
                    <div className={`bp-step-connector-arrow ${connectorClass}`} />
                    <div className={`bp-step-connector-line ${connectorClass}`} />
                  </div>
                )}
                <div className="bp-wal-rail-line" />
              </div>
            )}
          </React.Fragment>
        );
      })}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.decision === 'approve' ? 'Approve Workflow Step' : 'Reject Workflow Step'}
        description={
          confirmModal.decision === 'approve'
            ? `Approve "${confirmModal.stepName}" (${confirmModal.stepId})? The workflow will resume immediately.`
            : `Reject "${confirmModal.stepName}" (${confirmModal.stepId})? The workflow instance will be marked failed.`
        }
        confirmLabel={confirmModal.decision === 'approve' ? 'Approve Step' : 'Reject Step'}
        variant={confirmModal.decision === 'approve' ? 'success' : 'danger'}
        loading={isSubmittingDecision}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, stepId: null, stepName: '', decision: 'approve' })}
      />
    </div>
  );
}
