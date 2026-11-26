import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import WorkflowCommandBar from './components/WorkflowCommandBar';
import WorkflowInstances from './components/WorkflowInstances';
import ProgressIndicator from './components/ProgressIndicator';
import StepTimeline from './components/StepTimeline';
import { useWorkflowPolling } from './hooks/useWorkflowPolling';
import { liveApi, demoApi } from './services/api';
import { MOCK_INSTANCES } from './data/mockData';
import { AlertTriangle, Zap, Code, Terminal, Plus, ArrowRight } from 'lucide-react';
import './styles/global.css';
import './styles/dashboard.css';

const LOCAL_STORAGE_KEY = 'pst_ad_165_tracked_instances';

export default function App() {
  /* ── Mode ── */
  const [isDemoMode, setIsDemoMode] = useState(
    () => localStorage.getItem('pst_ad_165_demo_mode') === 'true'
  );
  const [backendConnected, setBackendConnected]   = useState(false);
  const [checkingHealth,   setCheckingHealth]     = useState(false);

  /* ── Tracked instances (live mode) ── */
  const [trackedInstances, setTrackedInstances] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  /* ── Active instance ── */
  const [activeInstanceId, setActiveInstanceId] = useState(
    () => isDemoMode
      ? MOCK_INSTANCES[1].instanceId
      : (trackedInstances[0]?.instanceId || null)
  );

  /* ── UI action states ── */
  const [isStarting,          setIsStarting]          = useState(false);
  const [isRetrying,          setIsRetrying]          = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [showRawJson,         setShowRawJson]         = useState(false);

  /* ── Polling ── */
  const {
    instance, loading: instanceLoading, error: instanceError,
    isPolling, togglePause, refresh, pollingInterval, setPollingInterval, setInstance,
  } = useWorkflowPolling(activeInstanceId, isDemoMode, 2000);

  /* ── Persist tracked instances ── */
  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trackedInstances)); }
    catch (e) { console.error('Failed to save tracked instances', e); }
  }, [trackedInstances]);

  useEffect(() => {
    localStorage.setItem('pst_ad_165_demo_mode', String(isDemoMode));
    if (isDemoMode && !activeInstanceId) setActiveInstanceId(MOCK_INSTANCES[1].instanceId);
  }, [isDemoMode, activeInstanceId]);

  /* ── Health check ── */
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

  /* ── Sync tracked instances with latest poll ── */
  useEffect(() => {
    if (instance && !isDemoMode) {
      setTrackedInstances((prev) => {
        const index = prev.findIndex((i) => i.instanceId === instance.instanceId);
        const entry = {
          instanceId: instance.instanceId,
          workflowId: instance.workflowId,
          status:     instance.status,
          createdAt:  instance.createdAt,
          updatedAt:  instance.updatedAt,
        };
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = entry;
          return updated;
        }
        return [entry, ...prev];
      });
    }
  }, [instance, isDemoMode]);

  /* ── Handlers ── */
  const handleStartWorkflow = async () => {
    setIsStarting(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      const res = await api.startWorkflow('PST_AD_165');
      const newId = res.instanceId;
      if (!isDemoMode) {
        setTrackedInstances((prev) => [{
          instanceId: newId, workflowId: 'PST_AD_165', status: 'pending',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }, ...prev]);
      }
      setActiveInstanceId(newId);
    } catch (err) {
      alert(`Failed to start workflow: ${err.message}`);
    } finally { setIsStarting(false); }
  };

  const handleRetryWorkflow = async () => {
    if (!activeInstanceId) return;
    setIsRetrying(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      await api.retryWorkflow(activeInstanceId);
      await refresh();
    } catch (err) { alert(`Retry failed: ${err.message}`); }
    finally { setIsRetrying(false); }
  };

  const handleApproveStep = async (stepId, decision) => {
    if (!activeInstanceId) return;
    setIsSubmittingDecision(true);
    try {
      const api = isDemoMode ? demoApi : liveApi;
      await api.approveStep(activeInstanceId, stepId, decision);
      await refresh();
    } catch (err) { alert(`Approval decision failed: ${err.message}`); throw err; }
    finally { setIsSubmittingDecision(false); }
  };

  const handleTrackInstanceId = (id) => {
    if (!id) return;
    if (!isDemoMode && !trackedInstances.some((i) => i.instanceId === id)) {
      setTrackedInstances((prev) => [{
        instanceId: id, workflowId: 'PST_AD_165', status: 'pending',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }, ...prev]);
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

  const displayedInstances = isDemoMode ? MOCK_INSTANCES : trackedInstances;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Blueprint grid canvas (fixed behind everything) */}
      <div className="bp-canvas" />

      {/* Top coordinate ruler */}
      <div className="bp-ruler" style={{ zIndex: 60, position: 'relative' }}>
        <span className="bp-tick-accent">+ 000.0</span>
        <span>|</span>
        <span>SYS.GRID // 16:9</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 280.0</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 560.0</span>
        <span>|</span>
        <span>ARCH.REV.4</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 840.0</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 1120.0</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 1400.0</span>
        <span>|</span>
        <span className="bp-tick-accent">+ 1600.0</span>
      </div>

      {/* Header */}
      <Header
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        backendConnected={backendConnected}
        checkingHealth={checkingHealth}
        onCheckHealth={checkHealth}
      />

      {/* Main content */}
      <main className="bp-main">

        {/* Backend offline banner (live mode only) */}
        {!isDemoMode && !backendConnected && (
          <div className="bp-banner bp-banner-error">
            <div className="bp-banner-left">
              <AlertTriangle size={16} color="#ef4444" />
              <span>
                <strong>Backend Offline:</strong> Unable to connect to Flask on{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  http://127.0.0.1:5000
                </code>.
                Start with <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>python3 app.py</code> or switch to Demo Mode.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="bp-btn bp-btn-secondary bp-btn-sm" onClick={checkHealth} disabled={checkingHealth}>
                Retry
              </button>
              <button className="bp-btn bp-btn-primary bp-btn-sm" onClick={() => setIsDemoMode(true)}>
                Switch to Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="bp-banner">
            <div className="bp-banner-left">
              <Zap size={15} color="#f59e0b" />
              <span>
                <strong>Demo Mode Active:</strong> Workflow execution, approval gates, and retries are simulated in-browser. Live backend calls are disabled.
              </span>
            </div>
            <button className="bp-btn bp-btn-secondary bp-btn-sm" onClick={() => setIsDemoMode(false)}>
              Switch to Live Mode
            </button>
          </div>
        )}

        {/* Command bar */}
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

        {/* 4-column summary strip with Ripple #1 */}
        <ProgressIndicator instance={instance} />

        {/* EXECUTION_SPLIT divider */}
        <div className="bp-split-divider">
          <div className="bp-split-divider-line" />
          <span className="bp-split-divider-label">--[+ 02 // EXECUTION_SPLIT +]--</span>
          <div className="bp-split-divider-icon">
            <Plus size={11} color="#22d3ee" />
          </div>
          <div className="bp-split-divider-line" />
          <div style={{ display: 'flex', alignItems: 'center', color: '#22d3ee' }}>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Bottom 2-column split */}
        <div className="bp-bottom-grid">

          {/* LEFT: instances table with Ripple #2 */}
          <WorkflowInstances
            instances={displayedInstances}
            activeInstanceId={activeInstanceId}
            onSelectInstance={setActiveInstanceId}
            onTrackInstanceId={handleTrackInstanceId}
            onRemoveTrackedInstance={handleRemoveTrackedInstance}
            isDemoMode={isDemoMode}
          />

          {/* RIGHT: step execution graph with Ripple #3 */}
          <div className="bp-ripple-card">
            <div className="bp-ripple-bg-right" />
            <div className="bp-ripple-inner">
              {/* Card header */}
              <div className="bp-card-header">
                <div className="bp-card-header-left">
                  {/* Grid icon for step graph */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="4" height="4" stroke="#22d3ee" strokeWidth="1.3" />
                    <rect x="9" y="1" width="4" height="4" stroke="#22d3ee" strokeWidth="1.3" />
                    <rect x="1" y="9" width="4" height="4" stroke="#22d3ee" strokeWidth="1.3" />
                    <rect x="9" y="9" width="4" height="4" stroke="#22d3ee" strokeWidth="1.3" />
                    <line x1="7" y1="3" x2="9" y2="3" stroke="#22d3ee" strokeWidth="1" />
                    <line x1="5" y1="11" x2="9" y2="11" stroke="#22d3ee" strokeWidth="1" />
                    <line x1="3" y1="5" x2="3" y2="9" stroke="#22d3ee" strokeWidth="1" />
                    <line x1="11" y1="5" x2="11" y2="9" stroke="#22d3ee" strokeWidth="1" />
                  </svg>
                  <span className="bp-card-title">
                    Step Execution Graph
                    {instance && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          marginLeft: 6,
                        }}
                      >
                        · {instance.workflowId}
                      </span>
                    )}
                  </span>
                </div>
                {instance && (
                  <button
                    className="bp-btn bp-btn-secondary bp-btn-sm"
                    onClick={() => setShowRawJson((p) => !p)}
                  >
                    <Code size={12} />
                    {showRawJson ? 'Hide JSON' : 'Inspect JSON'}
                  </button>
                )}
              </div>

              {/* API error */}
              {instanceError && (
                <div
                  style={{
                    margin: '10px 12px',
                    padding: '8px 10px',
                    background: 'var(--error-container)',
                    border: '1.5px solid var(--error)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--error-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <strong>API Error:</strong> {instanceError}
                </div>
              )}

              {/* Step timeline */}
              <StepTimeline
                instance={instance}
                onApproveStep={handleApproveStep}
                isSubmittingDecision={isSubmittingDecision}
              />

              {/* Raw JSON inspector */}
              {showRawJson && instance && (
                <div style={{ padding: '0 10px 10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 2px 4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--outline)',
                      marginBottom: 6,
                    }}
                  >
                    <Terminal size={11} />
                    Raw State · state.json
                  </div>
                  <pre className="bp-json-inspector">
                    {JSON.stringify(instance, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom coordinate ruler */}
      <div className="bp-ruler bp-ruler-bottom" style={{ zIndex: 60, position: 'relative' }}>
        <span className="bp-tick-accent">[COORD Y:0900]</span>
        <span>|</span>
        <span>BLUEPRINT_LAYER_01 // NO_TRANSLUCENCY</span>
        <span>|</span>
        <span className="bp-tick-accent">[X:1600 Y:0900]</span>
      </div>
    </div>
  );
}
