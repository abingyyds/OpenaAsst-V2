import { useState, useCallback, useRef } from 'react';
import type { AgentMessage, TaskPlan } from '@openasst/types';
import { API_BASE_URL } from '../lib/config';
import { parseSSELine } from '../lib/sse-parser';
import { nanoid } from 'nanoid';
import * as sessionStore from '../stores/session-store';
import type { SessionRecord } from '../stores/db';

export type ChatPhase = 'idle' | 'planning' | 'awaiting_approval' | 'executing';

export interface ChatMessageUI {
  id: string;
  type: AgentMessage['type'];
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
  plan?: TaskPlan;
}

interface UseChatOptions {
  sessionType?: SessionRecord['type'];
  deviceId?: string;
  workDir?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const { sessionType = 'chat', deviceId, workDir } = options;
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<ChatPhase>('idle');
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Persist a message to Dexie if we have a chat session
  const persistMessage = useCallback(
    (msg: ChatMessageUI, sessId: string | null) => {
      if (!sessId) return;
      sessionStore.saveMessage(sessId, {
        sessionId: sessId,
        taskId: '',
        type: msg.type,
        role: msg.type === 'text' && !msg.toolName ? 'assistant' : undefined,
        content: msg.content,
        toolName: msg.toolName,
        toolInput: msg.toolInput ? JSON.stringify(msg.toolInput) : undefined,
        toolOutput: msg.toolOutput,
        isError: msg.isError,
      }).catch(() => {});
    },
    [],
  );

  const sendMessage = useCallback(async (prompt: string) => {
    setIsRunning(true);
    setCurrentPrompt(prompt);
    const taskId = nanoid();

    // Ensure we have a chat session
    let sessId = chatSessionId;
    if (!sessId) {
      const title = prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '');
      sessId = await sessionStore.createSession(sessionType, title, deviceId);
      setChatSessionId(sessId);
    }

    // Add user message
    const userMsg: ChatMessageUI = {
      id: nanoid(),
      type: 'text',
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Persist user message
    if (sessId) {
      sessionStore.saveMessage(sessId, {
        sessionId: sessId,
        taskId,
        type: 'text',
        role: 'user',
        content: prompt,
      }).catch(() => {});
    }

    // Build conversation history for context
    const conversation = messages
      .filter((m) => m.type === 'text' && m.content)
      .map((m, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content!,
      }));

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const body: Record<string, unknown> = { prompt, taskId, conversation };
      if (workDir) body.workDir = workDir;
      if (deviceId) body.deviceId = deviceId;

      const res = await fetch(`${API_BASE_URL}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

      await processStream(res, taskId, sessId);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : String(err);
      const errMsgUI: ChatMessageUI = { id: nanoid(), type: 'error', content: errMsg };
      setMessages((prev) => [...prev, errMsgUI]);
      persistMessage(errMsgUI, sessId);
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [chatSessionId, messages, sessionType, deviceId, workDir, persistMessage]);

  const processStream = useCallback(
    async (res: Response, _taskId: string, sessId?: string | null) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const msg = parseSSELine(line);
          if (!msg) continue;
          handleMessage(msg, sessId);
        }
      }
    },
    [],
  );

  const handleMessage = useCallback((msg: AgentMessage, sessId?: string | null) => {
    let uiMsg: ChatMessageUI | null = null;

    switch (msg.type) {
      case 'session':
        setSessionId(msg.sessionId || null);
        return;
      case 'text':
        uiMsg = { id: nanoid(), type: 'text', content: msg.content };
        break;
      case 'tool_use':
        uiMsg = {
          id: msg.toolUseId || nanoid(),
          type: 'tool_use',
          toolName: msg.toolName,
          toolInput: msg.toolInput,
        };
        break;
      case 'tool_result':
        uiMsg = {
          id: nanoid(),
          type: 'tool_result',
          toolOutput: msg.toolOutput,
          isError: msg.isError,
        };
        break;
      case 'error':
        uiMsg = { id: nanoid(), type: 'error', content: msg.content };
        break;
      case 'result':
      case 'done':
        return;
      case 'plan':
        if (msg.plan) {
          setCurrentPlan(msg.plan);
          setPhase('awaiting_approval');
          uiMsg = { id: nanoid(), type: 'plan', plan: msg.plan };
        }
        break;
      case 'direct_answer':
        uiMsg = { id: nanoid(), type: 'text', content: msg.content };
        break;
    }

    if (uiMsg) {
      setMessages((prev) => [...prev, uiMsg!]);
      persistMessage(uiMsg, sessId ?? null);
    }
  }, [persistMessage]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (sessionId) {
      fetch(`${API_BASE_URL}/agent/stop/${sessionId}`, {
        method: 'POST',
      }).catch(() => {});
    }
    setIsRunning(false);
  }, [sessionId]);

  const clear = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setChatSessionId(null);
    setCurrentPlan(null);
    setPhase('idle');
    setCurrentPrompt('');
  }, []);

  const approvePlan = useCallback(async () => {
    if (!currentPlan) return;
    setIsRunning(true);
    setPhase('executing');
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch(`${API_BASE_URL}/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlan.id,
          prompt: currentPrompt,
          taskId: nanoid(),
        }),
        signal: abortController.signal,
      });
      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);
      await processStream(res, '', chatSessionId);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), type: 'error', content: errMsg },
      ]);
    } finally {
      setIsRunning(false);
      setPhase('idle');
      setCurrentPlan(null);
      abortRef.current = null;
    }
  }, [currentPlan, currentPrompt, processStream]);

  const rejectPlan = useCallback(() => {
    setCurrentPlan(null);
    setPhase('idle');
    setIsRunning(false);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setChatSessionId(id);
    setCurrentPlan(null);
    setPhase('idle');
    setCurrentPrompt('');
    try {
      const records = await sessionStore.getSessionMessages(id);
      const restored: ChatMessageUI[] = records.map((r) => ({
        id: String(r.id ?? nanoid()),
        type: (r.type || 'text') as ChatMessageUI['type'],
        content: r.content,
        toolName: r.toolName,
        toolInput: r.toolInput ? JSON.parse(r.toolInput) : undefined,
        toolOutput: r.toolOutput,
        isError: r.isError,
      }));
      setMessages(restored);
    } catch {
      setMessages([]);
    }
  }, []);

  return {
    messages, isRunning, phase, currentPlan, chatSessionId,
    sendMessage, stop, clear, approvePlan, rejectPlan, loadSession,
  };
}
