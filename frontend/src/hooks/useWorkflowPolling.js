import { useState, useEffect, useCallback, useRef } from 'react';
import { liveApi, demoApi } from '../services/api';
import { isTerminalWorkflow } from '../utils/status';

/**
 * Custom hook to poll workflow instance state at configurable intervals.
 *
 * @param {string} instanceId Current workflow instance ID
 * @param {boolean} isDemoMode Whether Demo Mode is active
 * @param {number} defaultInterval Polling interval in ms (default: 2000)
 */
export function useWorkflowPolling(instanceId, isDemoMode = false, defaultInterval = 2000) {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(defaultInterval);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState(null);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);

  // Fetch workflow state
  const fetchInstance = useCallback(
    async (isManualRefresh = false) => {
      if (!instanceId) {
        setInstance(null);
        return;
      }

      if (isManualRefresh) {
        setLoading(true);
      }

      try {
        const api = isDemoMode ? demoApi : liveApi;
        const data = await api.getWorkflow(instanceId);

        if (isMountedRef.current) {
          setInstance(data);
          setError(null);
          setLastPolledAt(new Date());
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message || 'Failed to fetch workflow state.');
        }
      } finally {
        if (isMountedRef.current && isManualRefresh) {
          setLoading(false);
        }
      }
    },
    [instanceId, isDemoMode]
  );

  // Initial load when instanceId or isDemoMode changes
  useEffect(() => {
    isMountedRef.current = true;
    if (instanceId) {
      setLoading(true);
      fetchInstance(true);
    }
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [instanceId, isDemoMode, fetchInstance]);

  // Polling loop
  useEffect(() => {
    if (!instanceId || isPollingPaused || pollingInterval <= 0) {
      return;
    }

    // Auto-pause if workflow is in terminal state
    if (instance && isTerminalWorkflow(instance.status)) {
      return;
    }

    const schedulePoll = () => {
      pollTimerRef.current = setTimeout(async () => {
        await fetchInstance(false);
        if (isMountedRef.current) {
          schedulePoll();
        }
      }, pollingInterval);
    };

    schedulePoll();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [instanceId, pollingInterval, isPollingPaused, instance?.status, fetchInstance]);

  const togglePause = useCallback(() => {
    setIsPollingPaused((prev) => !prev);
  }, []);

  const refresh = useCallback(() => {
    return fetchInstance(true);
  }, [fetchInstance]);

  return {
    instance,
    loading,
    error,
    isPolling: !isPollingPaused && pollingInterval > 0 && (!instance || !isTerminalWorkflow(instance.status)),
    isPollingPaused,
    pollingInterval,
    setPollingInterval,
    togglePause,
    refresh,
    lastPolledAt,
    setInstance,
  };
}

