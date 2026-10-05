import { useCallback, useEffect, useRef, useState } from 'react';
import { applySyncOperation, INITIAL_CLOUD_STATE } from '../data/initialData';
import { CloudSystemState, SyncOperation, SyncOperationType } from '../types/lounge';

const LOCAL_STATE_KEY = 'lms_cloud_state_cache_v1';
const OFFLINE_QUEUE_KEY = 'lms_offline_sync_queue_v1';
const DEVICE_ID_KEY = 'lms_device_id_v1';
const SIMULATED_OFFLINE_KEY = 'lms_simulated_offline_v1';
const BROADCAST_CHANNEL_NAME = 'lms_multi_device_realtime_sync';

function getOrCreateDeviceId(): string {
  try {
    const existing = sessionStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const randomNum = Math.floor(10 + Math.random() * 89);
    const newId = `Terminal-POS-${randomNum}`;
    sessionStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return 'Terminal-POS-01';
  }
}

function loadLocalCache(): CloudSystemState {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CloudSystemState;
      if (!parsed.settings) parsed.settings = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.settings));
      if (!parsed.users || parsed.users.length === 0) parsed.users = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.users));
      if (!parsed.activeUserId) parsed.activeUserId = INITIAL_CLOUD_STATE.activeUserId;
      if (!parsed.suppliers || parsed.suppliers.length === 0) parsed.suppliers = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.suppliers));
      if (!parsed.purchaseOrders || parsed.purchaseOrders.length === 0) parsed.purchaseOrders = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE.purchaseOrders));
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local state cache:', e);
  }
  return JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE));
}

function saveLocalCache(state: CloudSystemState): void {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save local state cache:', e);
  }
}

function loadOfflineQueue(): SyncOperation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      return JSON.parse(raw) as SyncOperation[];
    }
  } catch (e) {
    console.warn('Failed to load offline queue:', e);
  }
  return [];
}

function saveOfflineQueue(queue: SyncOperation[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save offline queue:', e);
  }
}

export function useCloudSyncEngine() {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [state, setState] = useState<CloudSystemState>(() => loadLocalCache());
  const [offlineQueue, setOfflineQueue] = useState<SyncOperation[]>(() => loadOfflineQueue());
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulateOffline, setSimulateOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toISOString());

  const isEffectiveOnline = browserOnline && !simulateOffline;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const queueRef = useRef<SyncOperation[]>(offlineQueue);
  queueRef.current = offlineQueue;

  const isEffectiveOnlineRef = useRef<boolean>(isEffectiveOnline);
  isEffectiveOnlineRef.current = isEffectiveOnline;

  // Recompute optimistic local state from an authoritative cloud state + any still-pending offline ops
  const reconcileWithPendingQueue = useCallback(
    (cloudState: CloudSystemState, pendingOps: SyncOperation[]): CloudSystemState => {
      let merged = cloudState;
      for (const op of pendingOps) {
        if (!merged.appliedOperationIds.includes(op.id)) {
          merged = applySyncOperation(merged, op);
        }
      }
      return merged;
    },
    []
  );

  // Push pending queue & fetch latest cloud state
  const syncNow = useCallback(async () => {
    if (!isEffectiveOnlineRef.current) return false;

    setIsSyncing(true);
    try {
      const currentQueue = loadOfflineQueue();
      if (currentQueue.length > 0) {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            operations: currentQueue,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const serverState: CloudSystemState = data.state;
          saveOfflineQueue([]);
          setOfflineQueue([]);
          saveLocalCache(serverState);
          setState(serverState);
          setLastSyncedAt(data.serverTimestamp || new Date().toISOString());
          channelRef.current?.postMessage({
            type: 'CLOUD_STATE_UPDATED',
            state: serverState,
            sender: deviceId,
          });
          setIsSyncing(false);
          return true;
        }
      } else {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          const serverState: CloudSystemState = data.state;
          const merged = reconcileWithPendingQueue(serverState, loadOfflineQueue());
          saveLocalCache(merged);
          setState(merged);
          setLastSyncedAt(data.serverTimestamp || new Date().toISOString());
          setIsSyncing(false);
          return true;
        }
      }
    } catch {
      // Network unreachable; stay resilient on local state
    }
    setIsSyncing(false);
    return false;
  }, [deviceId, reconcileWithPendingQueue]);

  // Dispatch a mutation (works identically online and offline!)
  const dispatchOperation = useCallback(
    async (type: SyncOperationType, payload: any, description: string) => {
      const op: SyncOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        deviceId,
        type,
        description,
        payload,
      };

      // 1. Optimistically apply to local state immediately (0ms latency)
      setState((prev) => {
        const updated = applySyncOperation(prev, op);
        saveLocalCache(updated);
        return updated;
      });

      // 2. Append to persistent offline queue
      const nextQueue = [...loadOfflineQueue(), op];
      saveOfflineQueue(nextQueue);
      setOfflineQueue(nextQueue);

      // 3. If online, immediately synchronize with cloud backend
      if (isEffectiveOnlineRef.current) {
        setIsSyncing(true);
        try {
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              operations: nextQueue,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const serverState: CloudSystemState = data.state;
            saveOfflineQueue([]);
            setOfflineQueue([]);
            saveLocalCache(serverState);
            setState(serverState);
            setLastSyncedAt(data.serverTimestamp || new Date().toISOString());
            channelRef.current?.postMessage({
              type: 'CLOUD_STATE_UPDATED',
              state: serverState,
              sender: deviceId,
            });
          }
        } catch {
          // Remains safely in offlineQueue for automatic sync when restored
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [deviceId]
  );

  const toggleSimulateOffline = useCallback(
    (forceOffline?: boolean) => {
      const nextVal = typeof forceOffline === 'boolean' ? forceOffline : !simulateOffline;
      setSimulateOffline(nextVal);
      try {
        localStorage.setItem(SIMULATED_OFFLINE_KEY, String(nextVal));
      } catch {
        // ignore
      }
      if (!nextVal && browserOnline) {
        // Restored connection: flush offline queue immediately
        setTimeout(() => {
          isEffectiveOnlineRef.current = true;
          syncNow();
        }, 80);
      }
    },
    [simulateOffline, browserOnline, syncNow]
  );

  const resetDemoData = useCallback(async () => {
    saveOfflineQueue([]);
    setOfflineQueue([]);
    if (isEffectiveOnlineRef.current) {
      try {
        const res = await fetch('/api/reset-demo', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          saveLocalCache(data.state);
          setState(data.state);
          channelRef.current?.postMessage({
            type: 'CLOUD_STATE_UPDATED',
            state: data.state,
            sender: deviceId,
          });
          return;
        }
      } catch {
        // fallback below
      }
    }
    const fresh = JSON.parse(JSON.stringify(INITIAL_CLOUD_STATE));
    saveLocalCache(fresh);
    setState(fresh);
  }, [deviceId]);

  // Listen to browser online/offline events & multi-tab BroadcastChannel
  useEffect(() => {
    const onOnline = () => {
      setBrowserOnline(true);
      if (!simulateOffline) {
        isEffectiveOnlineRef.current = true;
        syncNow();
      }
    };
    const onOffline = () => setBrowserOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'CLOUD_STATE_UPDATED' &&
          event.data?.sender !== deviceId &&
          isEffectiveOnlineRef.current
        ) {
          const incomingState = event.data.state as CloudSystemState;
          const merged = reconcileWithPendingQueue(incomingState, loadOfflineQueue());
          saveLocalCache(merged);
          setState(merged);
          setLastSyncedAt(new Date().toISOString());
        }
      };
      channelRef.current = bc;
    }

    // Initial sync and periodic poll for multi-device updates
    syncNow();
    const interval = setInterval(() => {
      if (isEffectiveOnlineRef.current) {
        syncNow();
      }
    }, 8000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      channelRef.current?.close();
      clearInterval(interval);
    };
  }, [deviceId, reconcileWithPendingQueue, simulateOffline, syncNow]);

  const switchActiveUser = useCallback((userId: string) => {
    setState((prev) => {
      const next = { ...prev, activeUserId: userId };
      saveLocalCache(next);
      return next;
    });
  }, []);

  return {
    state,
    deviceId,
    isOnline: isEffectiveOnline,
    simulateOffline,
    offlineQueue,
    isSyncing,
    lastSyncedAt,
    dispatchOperation,
    syncNow,
    toggleSimulateOffline,
    resetDemoData,
    switchActiveUser,
  };
}
