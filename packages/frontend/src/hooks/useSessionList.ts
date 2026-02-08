import { useState, useEffect, useCallback } from 'react';
import type { SessionRecord } from '../stores/db';
import * as sessionStore from '../stores/session-store';

export function useSessionList(type: SessionRecord['type'] = 'chat', deviceId?: string) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await sessionStore.listSessions(deviceId);
    setSessions(list.filter((s) => s.type === type));
  }, [type, deviceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (title: string) => {
    const id = await sessionStore.createSession(type, title, deviceId);
    await refresh();
    setActiveSessionId(id);
    return id;
  }, [type, deviceId, refresh]);

  const select = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  const remove = useCallback(async (id: string) => {
    await sessionStore.deleteSession(id);
    if (activeSessionId === id) setActiveSessionId(null);
    await refresh();
  }, [activeSessionId, refresh]);

  return { sessions, activeSessionId, create, select, remove, refresh };
}
