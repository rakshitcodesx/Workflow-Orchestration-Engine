import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import WorkflowCommandBar from './components/WorkflowCommandBar';
import WorkflowInstances from './components/WorkflowInstances';
import ProgressIndicator from './components/ProgressIndicator';
import StepTimeline from './components/StepTimeline';
import { useWorkflowPolling } from './hooks/useWorkflowPolling';
import { liveApi, demoApi } from './services/api';
import { MOCK_INSTANCES } from './data/mockData';
import { AlertTriangle, Code, Terminal } from 'lucide-react';
import './styles/global.css';
import './styles/dashboard.css';

const LOCAL_STORAGE_KEY = 'pst_ad_165_tracked_instances';

export default function App() {
  /* ── Mode: default to Demo mode (true) ── */
  const [isDemoMode, setIsDemoMode] = useState(
    () => localStorage.getItem('pst_ad_165_demo_mode') !== 'false'
  );
  const [backendConnected, setBackendConnected] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  /* ── Tracked instances (live mode) ── */
  const [trackedInstances, setTrackedInstances] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  /* ── Active instance ── */
  const [activeInstanceId, setActiveInstanceId] = useState(
    () => (isDemoMode ? MOCK_INSTANCES[1].instanceId : trackedInstances[0]?.instanceId || null)
  );

  /* ── UI action states ── */
  const [isStarting, setIsStarting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  /* ── Polling hook ── */
  const {
    instance,
    loading: instanceLoading,
    error: instanceError,
    isPolling,
    togglePause,
    refresh,
    pollingInterval,
    setPollingInterval,
  } = useWorkflowPolling(activeInstanceId, isDemoMode, 2000);

  /* ── Persistence ── */
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trackedInstances));
    } catch (e) {
      console.error('Failed to save tracked instances', e);
    }
  }, [trackedInstances]);

  useEffect(() => {
    localStorage.setItem('pst_ad_165_demo_mode', String(isDemoMode));
    if (isDemoMode && !activeInstanceId) {
      setActiveInstanceId(MOCK_INSTANCES[1].instanceId);
    }
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

  /* ── Handlers ── */
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
    if (!isDemoMode && !trackedInstances.some((i) => i.instanceId === id)) {
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
    <div className="bp-page-wrapper">
      {/* ── Fixed Blueprint Canvas Grid ── */}
      <div className="bp-canvas" aria-hidden="true" />

      {/* ── 4 Right-Angle Corner Brackets & Accents Pinned at 12px ── */}
      <div className="bp-corner-accent bp-corner-tl" aria-hidden="true">
        <div className="bp-corner-bracket-tl" />
        <div className="bp-corner-arrow-down">↓</div>
      </div>
      <div className="bp-corner-accent bp-corner-tr" aria-hidden="true">
        <div className="bp-corner-bracket-tr" />
        <div className="bp-corner-hatch">///</div>
      </div>
      <div className="bp-corner-accent bp-corner-bl" aria-hidden="true">
        <div className="bp-corner-bracket-bl" />
      </div>
      <div className="bp-corner-accent bp-corner-br" aria-hidden="true">
        <div className="bp-corner-bracket-br" />
        <div className="bp-corner-star">✦</div>
      </div>

      {/* ── Centered Blueprint Container (max-width: 1600px) ── */}
      <div className="bp-container">
        {/* 1. Top Coordinate Ruler */}
        <div className="bp-ruler" aria-hidden="true">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="bp-tick-accent">+ 000.0</span>
            <span>|</span>
            <span>SYS.GRID // 16:9</span>
            <span>|</span>
            <span className="bp-tick-accent">+ 280.0</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="bp-tick-accent">+ 560.0</span>
            <span>|</span>
            <span>ARCH.REV.4</span>
            <span>|</span>
            <span className="bp-tick-accent">+ 840.0</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="bp-tick-accent">+ 1120.0</span>
            <span>|</span>
            <span className="bp-tick-accent">+ 1400.0</span>
            <span>|</span>
            <span className="bp-tick-accent">+ 1600.0</span>
          </div>
        </div>

        {/* 2. Top Header Bar */}
        <Header
          isDemoMode={isDemoMode}
          setIsDemoMode={setIsDemoMode}
          backendConnected={backendConnected}
          checkingHealth={checkingHealth}
          onCheckHealth={checkHealth}
        />

        {/* 3. Mode Alert Banner (ALWAYS rendered in Demo Mode) */}
        {isDemoMode ? (
          <div className="bp-banner">
            <div className="bp-banner-left">
              <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span>
                Demo Mode Active: Workflow execution, approval gates, and retries are simulated in-browser. Live backend calls are disabled.
              </span>
            </div>
            <button
              className="bp-btn bp-btn-secondary bp-banner-btn"
              onClick={() => setIsDemoMode(false)}
            >
              Switch to Live Mode
            </button>
          </div>
        ) : !backendConnected ? (
          <div className="bp-banner bp-banner-error">
            <div className="bp-banner-left">
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>
                <strong>Backend Offline:</strong> Unable to connect to Flask on{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>http://127.0.0.1:5000</code>.
                Start with <code style={{ fontFamily: 'var(--font-mono)' }}>python3 app.py</code> or switch to Demo Mode.
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
        ) : null}

        {/* 4. Workflow Command Bar */}
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

        {/* 5. 4-Column Summary Strip With Thick Isolated Cobalt/Black Ripples */}
        <ProgressIndicator instance={instance} />

        {/* 6. Execution Split Divider */}
        <div className="bp-split-divider" aria-hidden="true">
          <div className="bp-split-divider-left">
            <span className="bp-split-hatch">///</span>
            <span className="bp-split-divider-label">--[+ 02 // EXECUTION_SPLIT +]--</span>
          </div>
          <div className="bp-split-divider-line" />
          <div className="bp-split-center-tick">+</div>
          <div className="bp-split-divider-line" />
          <div className="bp-split-divider-accents">
            <span className="bp-split-accent-plus">+</span>
            <span className="bp-split-accent-arrow">―→</span>
          </div>
        </div>

        {/* 7. Bottom 2-Column Split */}
        <div className="bp-bottom-grid">
          {/* Left: Demo Workflows (4) with Isolated Cobalt/Black Ripple Container */}
          <WorkflowInstances
            instances={displayedInstances}
            activeInstanceId={activeInstanceId}
            onSelectInstance={setActiveInstanceId}
            onTrackInstanceId={handleTrackInstanceId}
            onRemoveTrackedInstance={handleRemoveTrackedInstance}
            isDemoMode={isDemoMode}
          />

          {/* Right: Step Execution Graph · PST_AD_165 with Isolated Cobalt/Black Ripple Container */}
          <div className="bp-ripple-card-right">
            <div className="bp-ripple-inner-right">
              {/* Card Header */}
              <div className="bp-card-header">
                <div className="bp-card-header-left">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#22d3ee" strokeWidth="1.5">
                    <rect x="2" y="2" width="4" height="4" rx="0.5" />
                    <rect x="10" y="2" width="4" height="4" rx="0.5" />
                    <rect x="2" y="10" width="4" height="4" rx="0.5" />
                    <rect x="10" y="10" width="4" height="4" rx="0.5" />
                    <line x1="6" y1="4" x2="10" y2="4" />
                    <line x1="4" y1="6" x2="4" y2="10" />
                  </svg>
                  <span className="bp-card-title">
                    Step Execution Graph · PST_AD_165
                  </span>
                </div>

                {instance && (
                  <button
                    className="bp-btn bp-btn-secondary bp-btn-sm"
                    onClick={() => setShowRawJson((p) => !p)}
                    title="Inspect JSON state"
                  >
                    <Code size={12} />
                    <span>{showRawJson ? 'Hide JSON' : '<> Inspect JSON'}</span>
                  </button>
                )}
              </div>

              {/* API error alert if any (Live mode only to prevent layout jump in demo) */}
              {!isDemoMode && instanceError && (
                <div className="bp-api-error">
                  <strong>API Error:</strong> {instanceError}
                </div>
              )}

              {/* Step timeline with nodes and connectors */}
              <StepTimeline
                instance={instance}
                onApproveStep={handleApproveStep}
                isSubmittingDecision={isSubmittingDecision}
              />

              {/* Raw JSON State Inspector */}
              {showRawJson && instance && (
                <div style={{ padding: '0 8px 8px' }}>
                  <div className="bp-json-header">
                    <Terminal size={11} />
                    <span>Raw State · state.json</span>
                  </div>
                  <pre className="bp-json-inspector">
                    {JSON.stringify(instance, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 8. Bottom Coordinate Ruler */}
        <div className="bp-ruler bp-ruler-bottom" aria-hidden="true">
          <span className="bp-tick-accent">[COORD Y:0900]</span>
          <span>BLUEPRINT_LAYER_01 // NO_TRANSLUCENCY</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="bp-tick-accent">[X:1600 Y:0900]</span>
            <span className="bp-bottom-star">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
