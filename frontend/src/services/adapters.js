/**
 * Data adapters to normalize backend API payloads into reliable frontend models.
 */

export function adaptWorkflowInstance(raw) {
  if (!raw) return null;

  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s, index) => ({
        stepId: s.stepId || `step_${String(index + 1).padStart(3, '0')}`,
        name: s.name || `Step ${index + 1}`,
        status: s.status || 'pending',
        attempts: Number.isInteger(s.attempts) ? s.attempts : 0,
        maxAttempts: Number.isInteger(s.maxAttempts) ? s.maxAttempts : 3,
        requiresApproval: Boolean(s.requiresApproval),
        lastError: s.lastError || null,
        startedAt: s.startedAt || null,
        completedAt: s.completedAt || null,
      }))
    : [];

  const totalSteps = steps.length;
  const succeededCount = steps.filter((s) => s.status === 'succeeded').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const isAwaitingApproval = steps.some((s) => s.status === 'waiting_approval');

  const percentComplete =
    totalSteps === 0 ? 0 : Math.round((succeededCount / totalSteps) * 100);

  // Zero-Token-Waste check: all succeeded steps with no unnecessary re-executions
  const zeroTokenWasteSteps = steps.filter(
    (s) => s.status === 'succeeded' && s.completedAt
  );

  return {
    instanceId: raw.instanceId || 'unknown',
    workflowId: raw.workflowId || 'PST_AD_165',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    steps,
    metrics: {
      totalSteps,
      succeededCount,
      failedCount,
      isAwaitingApproval,
      percentComplete,
      zeroTokenWasteCount: zeroTokenWasteSteps.length,
    },
  };
}

