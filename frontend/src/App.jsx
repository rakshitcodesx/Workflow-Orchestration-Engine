import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import WorkflowCommandBar from './components/WorkflowCommandBar';
import WorkflowInstances from './components/WorkflowInstances';
import ProgressIndicator from './components/ProgressIndicator';
import StepTimeline from './components/StepTimeline';
import GlassPanel from './components/GlassPanel';
import AquaMeshBackground from './components/AquaMeshBackground';
import { useWorkflowPolling } from './hooks/useWorkflowPolling';
import { liveApi, demoApi } from './services/api';
import { MOCK_INSTANCES } from './data/mockData';
import { AlertTriangle, Code, Terminal, Zap, Waves } from 'lucide-react';
import './styles/global.css';
import './styles/dashboard.css';

const LOCAL_STORAGE_KEY = 'pst_ad_165_tracked_instances';

export default function App() {
  // Mode state: live backend vs interactive demo mode
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('pst_ad_165_demo_mode') === 'true';
  });

  const [backendConnected, setBackendConnected] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Tracked instances for Live Mode (persisted in localStorage)
  const [trackedInstances, setTrackedInstances] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active instance selection
  const [activeInstanceId, setActiveInstanceId] = useState(() => {
    return isDemoMode
      ? MOCK_INSTANCES[1].instanceId // default to instance waiting for approval
      : trackedInstances[0]?.instanceId || null;
  });

  // Action states
  const [isStarting, setIsStarting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Polling hook
  const {
    instance,
    loading: instanceLoading,
    error: instanceError,
    isPolling,
    togglePause,
    refresh,
    pollingInterval,
    setPollingInterval,
    setInstance,
  } = useWorkflowPolling(activeInstanceId, isDemoMode, 2000);

  // Save tracked instances to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trackedInstances));
    } catch (e) {
      console.error('Failed to save tracked instances', e);
    }
  }, [trackedInstances]);

  // Persist demo mode choice
  useEffect(() => {
    localStorage.setItem('pst_ad_165_demo_mode', String(isDemoMode));
    if (isDemoMode && !activeInstanceId) {
      setActiveInstanceId(MOCK_INSTANCES[1].instanceId);
    }
  }, [isDemoMode, activeInstanceId]);

  // Backend health check probe
  const checkHealth = useCallback(async () => {
    if (isDemoMode) return;
    setCheckingHealth(true);
    const ok = await liveApi.checkHealth();
    setBackendConnected(ok);
    setCheckingHealth(false);
  }, [isDemoMode]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Keep tracked instances updated with latest fetched state
  useEffect(() => {
    if (instance && !isDemoMode) {
      setTrackedInstances((prev) => {
        const index = prev.findIndex((i) => i.instanceId === instance.instanceId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            instanceId: instance.instanceId,
            workflowId: instance.workflowId,
            status: instance.status,
            createdAt: instance.createdAt,
            updatedAt: instance.updatedAt,
          };
          return updated;
        } else {
          return [
            {
              instanceId: instance.instanceId,
              workflowId: instance.workflowId,
              status: instance.status,
              createdAt: instance.createdAt,
              updatedAt: instance.updatedAt,
            },
            ...prev,
          ];
        }
      });
    }
  }, [instance, isDemoMode]);

  // Handlers
  const handleStartWorkflow = async () => {
    setIsStarting(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      const res = await api.startWorkflow('PST_AD_165');
      const newId = res.instanceId;

      if (!isDemoMode) {
        setTrackedInstances((prev) => [
          {
            instanceId: newId,
            workflowId: 'PST_AD_165',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setActiveInstanceId(newId);
    } catch (err) {
      alert(`Failed to start workflow: ${err.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleRetryWorkflow = async () => {
    if (!activeInstanceId) return;
    setIsRetrying(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      await api.retryWorkflow(activeInstanceId);
      await refresh();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleApproveStep = async (stepId, decision) => {
    if (!activeInstanceId) return;
    setIsSubmittingDecision(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      await api.approveStep(activeInstanceId, stepId, decision);
      await refresh();
    } catch (err) {
      alert(`Approval decision failed: ${err.message}`);
      throw err;
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleTrackInstanceId = (id) => {
    if (!id) return;
    if (!isDemoMode) {
      if (!trackedInstances.some((i) => i.instanceId === id)) {
        setTrackedInstances((prev) => [
          {
            instanceId: id,
            workflowId: 'PST_AD_165',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }
    setActiveInstanceId(id);
  };

  const handleRemoveTrackedInstance = (id) => {
    setTrackedInstances((prev) => prev.filter((i) => i.instanceId !== id));
    if (activeInstanceId === id) {
      const remaining = trackedInstances.filter((i) => i.instanceId !== id);
      setActiveInstanceId(remaining.length > 0 ? remaining[0].instanceId : null);
    }
  };

  // Instances to display in the sidebar
  const displayedInstances = isDemoMode ? MOCK_INSTANCES : trackedInstances;

  return (
    <div className="app-container">
      {/* Fixed canvas background — must be first child so z-index stacking is correct */}
      <AquaMeshBackground />

      <Header
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        backendConnected={backendConnected}
        checkingHealth={checkingHealth}
        onCheckHealth={checkHealth}
      />

      <main className="dashboard-main">
        {/* Offline backend warning banner in Live Mode */}
        {!isDemoMode && !backendConnected && (
          <div className="backend-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <AlertTriangle size={18} color="#E11D48" />
              <span>
                <strong>Backend Offline:</strong> Unable to connect to Flask server on{' '}
                <code>http://127.0.0.1:5000</code>. Start with{' '}
                <code>python3 app.py</code> or switch to Demo Mode.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary btn-sm" onClick={checkHealth} disabled={checkingHealth}>
                Retry Connection
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsDemoMode(true)}>
                Switch to Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Demo Mode banner */}
        {isDemoMode && (
          <div className="backend-banner demo-active">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Zap size={18} color="#D97706" />
              <span>
                <strong>Demo Mode Active:</strong> Workflow execution, approval gates, and retries are simulated in-browser. Live backend calls are disabled.
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsDemoMode(false)}>
              Switch to Live Mode
            </button>
          </div>
        )}

        {/* Command Bar */}
        <WorkflowCommandBar
          instance={instance}
          onStartWorkflow={handleStartWorkflow}
          onRetryWorkflow={handleRetryWorkflow}
          isStarting={isStarting}
          isRetrying={isRetrying}
          onRefresh={refresh}
          isRefreshing={instanceLoading}
          isPolling={isPolling}
          togglePause={togglePause}
          pollingInterval={pollingInterval}
          setPollingInterval={setPollingInterval}
        />

        {/* Progress strip */}
        <ProgressIndicator instance={instance} />

        {/* Main 65/33 grid */}
        <div className="dashboard-grid">
          {/* LEFT — Workflow Instances table */}
          <WorkflowInstances
            instances={displayedInstances}
            activeInstanceId={activeInstanceId}
            onSelectInstance={setActiveInstanceId}
            onTrackInstanceId={handleTrackInstanceId}
            onRemoveTrackedInstance={handleRemoveTrackedInstance}
            isDemoMode={isDemoMode}
          />

          {/* RIGHT — Step Timeline inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <GlassPanel
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Waves size={15} color="var(--aqua-ocean)" />
                  <span>Step Execution Graph</span>
                  {instance && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      · {instance.workflowId}
                    </span>
                  )}
                </div>
              }
              actions={
                instance && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRawJson((prev) => !prev)}
                  >
                    <Code size={13} />
                    <span>{showRawJson ? 'Hide JSON' : 'Inspect JSON'}</span>
                  </button>
                )
              }
            >
              {instanceError && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(225,29,72,0.07)',
                    border: '1px solid rgba(225,29,72,0.22)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#9F1239',
                    marginBottom: 'var(--space-4)',
                    fontSize: 13,
                  }}
                >
                  <strong>API Error:</strong> {instanceError}
                </div>
              )}

              <StepTimeline
                instance={instance}
                onApproveStep={handleApproveStep}
                isSubmittingDecision={isSubmittingDecision}
              />
            </GlassPanel>

            {/* Raw JSON inspector */}
            {showRawJson && instance && (
              <GlassPanel
                subtle
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={14} color="var(--text-secondary)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      Raw State · state.json
                    </span>
                  </div>
                }
              >
                <pre
                  style={{
                    maxHeight: 320,
                    overflow: 'auto',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: '#243B53',
                    background: 'rgba(237,248,251,0.60)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(73,198,229,0.15)',
                  }}
                >
                  {JSON.stringify(instance, null, 2)}
                </pre>
              </GlassPanel>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
