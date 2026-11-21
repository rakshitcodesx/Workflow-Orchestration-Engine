/**
 * Status definitions, color mappings, and domain predicates.
 */

export const WORKFLOW_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const STEP_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING_APPROVAL: 'waiting_approval',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

export const STATUS_CONFIG = {
  [WORKFLOW_STATUSES.PENDING]: {
    label: 'Pending',
    variant: 'pending',
    description: 'Queued and waiting for engine execution',
    badgeClass: 'status-badge-pending',
    iconName: 'Clock',
  },
  [WORKFLOW_STATUSES.RUNNING]: {
    label: 'Running',
    variant: 'running',
    description: 'Actively processing steps',
    badgeClass: 'status-badge-running',
    iconName: 'Activity',
  },
  [WORKFLOW_STATUSES.COMPLETED]: {
    label: 'Completed',
    variant: 'succeeded',
    description: 'All steps executed successfully',
    badgeClass: 'status-badge-succeeded',
    iconName: 'CheckCircle2',
  },
  [WORKFLOW_STATUSES.FAILED]: {
    label: 'Failed',
    variant: 'failed',
    description: 'Workflow execution halted due to failure or rejection',
    badgeClass: 'status-badge-failed',
    iconName: 'AlertTriangle',
  },
  [STEP_STATUSES.WAITING_APPROVAL]: {
    label: 'Waiting Approval',
    variant: 'waiting',
    description: 'Human approval gate reached; waiting for operator review',
    badgeClass: 'status-badge-waiting',
    iconName: 'ShieldAlert',
  },
  [STEP_STATUSES.SUCCEEDED]: {
    label: 'Succeeded',
    variant: 'succeeded',
    description: 'Step executed successfully (Zero-Token-Waste preserved)',
    badgeClass: 'status-badge-succeeded',
    iconName: 'CheckCircle2',
  },
};

export function getStatusMeta(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || 'Unknown',
      variant: 'pending',
      description: '',
      badgeClass: 'status-badge-pending',
      iconName: 'HelpCircle',
    }
  );
}

export function isTerminalWorkflow(status) {
  return status === WORKFLOW_STATUSES.COMPLETED || status === WORKFLOW_STATUSES.FAILED;
}

export function canRetryWorkflow(instance) {
  return instance?.status === WORKFLOW_STATUSES.FAILED;
}

export function hasWaitingApprovalStep(instance) {
  return instance?.steps?.some((s) => s.status === STEP_STATUSES.WAITING_APPROVAL) || false;
}

export function getActiveStep(instance) {
  if (!instance?.steps) return null;
  return (
    instance.steps.find((s) => s.status === STEP_STATUSES.RUNNING) ||
    instance.steps.find((s) => s.status === STEP_STATUSES.WAITING_APPROVAL) ||
    instance.steps.find((s) => s.status === STEP_STATUSES.PENDING) ||
    instance.steps[instance.steps.length - 1]
  );
}

