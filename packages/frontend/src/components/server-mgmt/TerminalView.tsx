import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import * as sessionStore from '../../stores/session-store';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string;
}

interface TerminalViewProps {
  deviceId: string;
}

export function TerminalView({ deviceId }: TerminalViewProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineIdRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [lines]);

  // Load command history on mount / device change
  useEffect(() => {
    inputRef.current?.focus();
    sessionIdRef.current = null;
    sessionStore.getCommandHistory(deviceId, 50).then((history) => {
      const restored: TerminalLine[] = [];
      let id = 0;
      for (const h of history) {
        restored.push({ id: ++id, type: 'input', text: `$ ${h.command}` });
        if (h.stdout) restored.push({ id: ++id, type: 'output', text: h.stdout });
        if (h.stderr) restored.push({ id: ++id, type: 'error', text: h.stderr });
      }
      lineIdRef.current = id;
      setLines(restored);
    }).catch(() => {});
  }, [deviceId]);

  const addLine = (type: TerminalLine['type'], text: string) => {
    lineIdRef.current += 1;
    setLines((prev) => [...prev, { id: lineIdRef.current, type, text }]);
  };

  const executeCommand = async () => {
    const cmd = command.trim();
    if (!cmd || running) return;

    addLine('input', `$ ${cmd}`);
    setCommand('');
    setRunning(true);

    // Ensure we have a terminal session for persistence
    if (!sessionIdRef.current) {
      try {
        sessionIdRef.current = await sessionStore.createSession('terminal', `Terminal: ${deviceId}`, deviceId);
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/devices/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command: cmd }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.stdout) addLine('output', data.stdout);
        if (data.stderr) addLine('error', data.stderr);

        // Persist command to Dexie
        if (sessionIdRef.current) {
          sessionStore.saveCommand({
            sessionId: sessionIdRef.current,
            deviceId,
            command: cmd,
            stdout: data.stdout,
            stderr: data.stderr,
            exitCode: data.exitCode,
          }).catch(() => {});
        }
      } else {
        addLine('error', `Error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      addLine('error', `Connection failed: ${String(err)}`);
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200">
        <Terminal size={16} className="text-accent" />
        <span className="font-heading font-semibold text-sm text-ink">Terminal</span>
        <span className="text-xs text-ink-muted">({deviceId})</span>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-stone-900 p-4"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 ? (
          <div className="text-xs text-stone-500">
            Connected. Type a command below to get started.
          </div>
        ) : (
          <pre className="font-mono text-xs leading-5 whitespace-pre-wrap break-all">
            {lines.map((line) => (
              <div
                key={line.id}
                className={
                  line.type === 'input'
                    ? 'text-amber-400'
                    : line.type === 'error'
                      ? 'text-red-400'
                      : 'text-stone-200'
                }
              >
                {line.text}
              </div>
            ))}
          </pre>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-stone-700 bg-stone-800">
        <span className="text-xs text-accent font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          disabled={running}
          className="flex-1 bg-transparent text-sm text-stone-100 placeholder-stone-500 font-mono focus:outline-none"
        />
        <button
          onClick={executeCommand}
          disabled={running || !command.trim()}
          className="text-accent hover:text-accent-hover disabled:text-stone-600 transition-colors"
        >
          {running ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
