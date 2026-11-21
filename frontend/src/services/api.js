/**
 * Unified API Client for PST_AD_165 Workflow Orchestration Engine.
 * Supports both Live Mode (real Flask REST backend) and interactive Demo Mode.
 */

import { adaptWorkflowInstance } from './adapters';
import { MOCK_INSTANCES } from '../data/mockData';

// API base path — uses Vite proxy by default, or env override
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Handle API responses with proper JSON parsing and error handling.
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && data.error) ||
      (typeof data === 'string' && data) ||
      `HTTP error ${response.status}: ${response.statusText}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ============================================================================
// LIVE BACKEND API
// ============================================================================

export const liveApi = {
  /**
   * POST /workflows/start
   * Start a new workflow instance asynchronously.
   */
  async startWorkflow(workflowId = 'PST_AD_165') {
    const res = await fetch(`${API_BASE}/workflows/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId }),
    });
    return handleResponse(res);
  },

  /**
   * GET /workflows/<instance_id>
   * Fetch instance details and step statuses.
   */
  async getWorkflow(instanceId) {
    if (!instanceId) throw new Error('instanceId is required');
    const res = await fetch(`${API_BASE}/workflows/${instanceId}`);
    const data = await handleResponse(res);
    return adaptWorkflowInstance(data);
  },

  /**
   * POST /workflows/<instance_id>/approve/<step_id>
   * Approve or reject a waiting step.
   */
  async approveStep(instanceId, stepId, decision = 'approve') {
    if (!instanceId || !stepId) throw new Error('instanceId and stepId are required');
    const res = await fetch(`${API_BASE}/workflows/${instanceId}/approve/${stepId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    return handleResponse(res);
  },

  /**
   * POST /api/instances/<instance_id>/approve
   * Alternative flexible approval endpoint.
   */
  async approveInstance(instanceId, decision = 'approve', stepId = null) {
    if (!instanceId) throw new Error('instanceId is required');
    const body = { decision };
    if (stepId) body.stepId = stepId;

    const res = await fetch(`${API_BASE}/api/instances/${instanceId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  /**
   * POST /workflows/<instance_id>/retry
   * Retry a failed instance.
   */
  async retryWorkflow(instanceId) {
    if (!instanceId) throw new Error('instanceId is required');
    const res = await fetch(`${API_BASE}/workflows/${instanceId}/retry`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  /**
   * Test backend connectivity. Probes a quick endpoint.
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/workflows/health-check-probe`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      // A 404 or 200 means Flask is responding
      return res.status !== 502 && res.status !== 503;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// INTERACTIVE DEMO MODE STORE & API
// ============================================================================

class DemoApiStore {
  constructor() {
    this.instances = JSON.parse(JSON.stringify(MOCK_INSTANCES));
  }

  reset() {
    this.instances = JSON.parse(JSON.stringify(MOCK_INSTANCES));
  }

  async listInstances() {
    return this.instances.map((i) => adaptWorkflowInstance(i));
  }

  async getWorkflow(instanceId) {
    await new Promise((r) => setTimeout(r, 120));
    const inst = this.instances.find((i) => i.instanceId === instanceId);
    if (!inst) {
      const err = new Error('Instance not found.');
      err.status = 404;
      throw err;
    }
    return adaptWorkflowInstance(inst);
  }

  async startWorkflow(workflowId = 'PST_AD_165') {
    await new Promise((r) => setTimeout(r, 200));
    const instanceId = 'demo-' + Math.random().toString(36).substring(2, 10) + '-flow';
    const now = new Date().toISOString();
    const newInstance = {
      instanceId,
      workflowId,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      steps: [
        {
          stepId: 'step_001',
          name: 'Data Ingestion',
          status: 'running',
          attempts: 1,
          maxAttempts: 3,
          requiresApproval: false,
          lastError: null,
          startedAt: now,
          completedAt: null,
        },
        {
          stepId: 'step_002',
          name: 'AI Analysis',
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          requiresApproval: false,
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
        {
          stepId: 'step_003',
          name: 'Human Approval Gate',
          status: 'pending',
          attempts: 0,
          maxAttempts: 1,
          requiresApproval: true,
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
        {
          stepId: 'step_004',
          name: 'Result Persistence',
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          requiresApproval: false,
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
      ],
    };

    this.instances.unshift(newInstance);

    // Simulate step progression in demo mode
    setTimeout(() => {
      const target = this.instances.find((i) => i.instanceId === instanceId);
      if (target && target.steps[0].status === 'running') {
        target.steps[0].status = 'succeeded';
        target.steps[0].completedAt = new Date().toISOString();
        target.steps[1].status = 'running';
        target.steps[1].attempts = 1;
        target.steps[1].startedAt = new Date().toISOString();
        target.updatedAt = new Date().toISOString();
      }
    }, 3500);

    return { instanceId, status: 'pending' };
  }

  async approveStep(instanceId, stepId, decision = 'approve') {
    await new Promise((r) => setTimeout(r, 250));
    const inst = this.instances.find((i) => i.instanceId === instanceId);
    if (!inst) throw new Error('Instance not found.');
    const step = inst.steps.find((s) => s.stepId === stepId);
    if (!step) throw new Error('Step not found.');

    if (decision === 'approve') {
      step.status = 'succeeded';
      step.completedAt = new Date().toISOString();
      inst.status = 'running';
      inst.updatedAt = new Date().toISOString();

      // Advance to next step
      const nextStep = inst.steps.find((s) => s.status === 'pending');
      if (nextStep) {
        nextStep.status = 'running';
        nextStep.attempts = 1;
        nextStep.startedAt = new Date().toISOString();
      } else {
        inst.status = 'completed';
      }
      return { instanceId, stepId, status: 'resumed' };
    } else {
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
      step.lastError = 'Rejected by operator in demo mode';
      inst.status = 'failed';
      inst.updatedAt = new Date().toISOString();
      return { instanceId, stepId, status: 'rejected' };
    }
  }

  async retryWorkflow(instanceId) {
    await new Promise((r) => setTimeout(r, 250));
    const inst = this.instances.find((i) => i.instanceId === instanceId);
    if (!inst) throw new Error('Instance not found.');

    const failedStep = inst.steps.find((s) => s.status === 'failed');
    if (failedStep) {
      failedStep.status = 'running';
      failedStep.attempts = 1;
      failedStep.lastError = null;
      failedStep.startedAt = new Date().toISOString();
      failedStep.completedAt = null;
    }
    inst.status = 'running';
    inst.updatedAt = new Date().toISOString();
    return { instanceId, status: 'retrying' };
  }
}

export const demoApi = new DemoApiStore();

