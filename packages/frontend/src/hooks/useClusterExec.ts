import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../lib/config';

export interface ClusterEvent {
  id: number;
  type:
    | 'start'
    | 'iteration_start'
    | 'reasoning'
    | 'command_start'
    | 'command_output'
    | 'verification'
    | 'complete'
    | 'error';
  data: Record<string, unknown>;
  timestamp: number;
}

export function useClusterExec() {
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);

  const execute = useCallback(async (task: string, targetNames: string[]) => {
    setIsRunning(true);
    setEvents([]);
    idRef.current = 0;

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch(`${API_BASE_URL}/hub/ai-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, targetNames }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            const evt: ClusterEvent = {
              id: ++idRef.current,
              type: parsed.type,
              data: parsed.data,
              timestamp: Date.now(),
            };
            setEvents((prev) => [...prev, evt]);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setEvents((prev) => [
        ...prev,
        {
          id: ++idRef.current,
          type: 'error',
          data: { message: msg },
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    idRef.current = 0;
  }, []);

  return { events, isRunning, execute, stop, clear };
}
