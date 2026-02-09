import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/config';

interface AgentInfo {
  name: string;
  connectedAt: string;
  lastHeartbeat: string;
}

interface HubState {
  running: boolean;
  port: number;
  agents: AgentInfo[];
}

export function useHub() {
  const [hub, setHub] = useState<HubState>({ running: false, port: 9527, agents: [] });
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/hub/status`);
      if (res.ok) setHub(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/hub/start`, { method: 'POST' });
      await fetchStatus();
    } finally { setLoading(false); }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/hub/stop`, { method: 'POST' });
      await fetchStatus();
    } finally { setLoading(false); }
  }, [fetchStatus]);

  const deploy = useCallback(async (deviceIds: string[]) => {
    const res = await fetch(`${API_BASE_URL}/hub/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceIds }),
    });
    return res.ok ? (await res.json()).results : [];
  }, []);

  const deployAll = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/hub/deploy/all`, { method: 'POST' });
    return res.ok ? (await res.json()).results : [];
  }, []);

  const broadcast = useCallback(async (command: string, targetNames?: string[]) => {
    const res = await fetch(`${API_BASE_URL}/hub/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, targetNames }),
    });
    return res.ok ? (await res.json()).results : [];
  }, []);

  const syncConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hub/sync-config`, {
        method: 'POST',
      });
      return res.ok ? await res.json() : { error: 'Failed to sync config' };
    } finally {
      setLoading(false);
    }
  }, []);

  return { hub, loading, start, stop, deploy, deployAll, broadcast, syncConfig, refresh: fetchStatus };
}
