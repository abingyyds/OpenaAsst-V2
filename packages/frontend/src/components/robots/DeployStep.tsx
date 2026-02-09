import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Info } from 'lucide-react';

interface DeployLog {
  step: string;
  status: 'running' | 'done' | 'error' | 'info' | 'warn' | 'output';
  message: string;
  detail?: string;
}

interface DeployStepProps {
  deviceId: string;
  name: string;
  config: any;
  onDone: (botId: string, success: boolean) => void;
}

const API = 'http://127.0.0.1:2026';

export function DeployStep({ deviceId, name, config, onDone }: DeployStepProps) {
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [result, setResult] = useState<{ botId: string; success: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const ctrl = new AbortController();
    startDeploy(deviceId, name, configRef.current, ctrl.signal, setLogs, (botId, ok) => {
      setResult({ botId, success: ok });
    });
    return () => ctrl.abort();
  }, [deviceId, name]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [logs]);

  // Separate step-level logs from verbose output for the progress bar
  const stepLogs = logs.filter((l) => l.status === 'running' || l.status === 'done' || l.status === 'error');
  const lastStep = stepLogs.length > 0 ? stepLogs[stepLogs.length - 1] : null;

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <h2 className="text-xl font-bold text-primary mb-1">
        {result ? (result.success ? 'Deploy Complete' : 'Deploy Failed') : 'Deploying OpenClaw'}
      </h2>
      <p className="text-sm text-muted mb-3">
        {result
          ? (result.success ? 'Your bot is now running.' : 'Check the logs below for details.')
          : lastStep ? `Step: ${lastStep.step}` : 'Initializing...'}
      </p>

      {/* Step progress indicators */}
      <StepProgress logs={stepLogs} />

      {/* Terminal-style log output */}
      <div ref={scrollRef}
        className="rounded-xl border border-border bg-stone-900 p-4 space-y-0.5 max-h-[400px] overflow-y-auto font-mono text-xs mt-3">
        {logs.length === 0 && !result && (
          <div className="flex items-center gap-2 text-stone-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Connecting to server...</span>
          </div>
        )}
        {logs.map((log, i) => (
          <LogRow key={i} log={log} />
        ))}
      </div>

      {result && (
        <button onClick={() => onDone(result.botId, result.success)}
          className="mt-4 w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover">
          {result.success ? 'Go to Bot List' : 'Back'}
        </button>
      )}
    </div>
  );
}

function LogRow({ log }: { log: DeployLog }) {
  if (log.status === 'output') {
    // Terminal command/output lines
    const isCmd = log.message.startsWith('$ ');
    return (
      <div className={`leading-5 ${isCmd ? 'text-green-400 mt-1' : 'text-stone-400'}`}>
        {log.message}
      </div>
    );
  }

  if (log.status === 'info') {
    return (
      <div className="flex items-center gap-1.5 text-blue-400 leading-5 mt-0.5">
        <Info size={12} className="shrink-0" />
        <span>{log.message}</span>
      </div>
    );
  }

  if (log.status === 'warn') {
    return (
      <div className="flex items-center gap-1.5 text-yellow-400 leading-5 mt-0.5">
        <AlertTriangle size={12} className="shrink-0" />
        <span>{log.message}</span>
      </div>
    );
  }

  // Step-level logs (running/done/error)
  const icon = log.status === 'done'
    ? <CheckCircle size={12} className="text-green-400 shrink-0" />
    : log.status === 'error'
      ? <XCircle size={12} className="text-red-400 shrink-0" />
      : <Loader2 size={12} className="text-blue-400 animate-spin shrink-0" />;

  const color = log.status === 'done' ? 'text-green-400'
    : log.status === 'error' ? 'text-red-400'
      : 'text-white';

  return (
    <div className={`flex items-center gap-1.5 leading-5 mt-1 font-semibold ${color}`}>
      {icon}
      <span>{log.message}</span>
    </div>
  );
}

const DEPLOY_STEPS = ['ssh', 'env', 'node', 'install', 'config', 'service', 'start', 'verify'];
const STEP_LABELS: Record<string, string> = {
  ssh: 'SSH', env: 'Env', node: 'Node', install: 'Install',
  config: 'Config', service: 'Service', start: 'Start', verify: 'Verify',
};

function StepProgress({ logs }: { logs: DeployLog[] }) {
  // Build a map of step -> latest status
  const stepStatus: Record<string, string> = {};
  for (const l of logs) {
    stepStatus[l.step] = l.status;
  }

  return (
    <div className="flex items-center gap-1">
      {DEPLOY_STEPS.map((s, i) => {
        const st = stepStatus[s];
        const bg = st === 'done' ? 'bg-green-500 text-white'
          : st === 'error' ? 'bg-red-500 text-white'
            : st === 'running' ? 'bg-accent text-white animate-pulse'
              : 'bg-stone-200 text-stone-400';
        return (
          <div key={s} className="flex items-center">
            <div className={`px-2 py-1 rounded text-[10px] font-semibold ${bg}`}>
              {STEP_LABELS[s] || s}
            </div>
            {i < DEPLOY_STEPS.length - 1 && (
              <div className={`w-3 h-px ${st === 'done' ? 'bg-green-400' : 'bg-stone-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

async function startDeploy(
  deviceId: string, name: string, config: any,
  signal: AbortSignal,
  onLog: (fn: (prev: DeployLog[]) => DeployLog[]) => void,
  onDone: (botId: string, success: boolean) => void,
) {
  try {
    const res = await fetch(`${API}/robots/deploy`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, name, config }),
    });
    if (!res.ok || !res.body) {
      onLog((p) => [...p, { step: 'init', status: 'error', message: 'Deploy request failed' }]);
      onDone('', false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.botId !== undefined) {
              onDone(data.botId, data.success);
            } else {
              onLog((p) => [...p, data]);
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch {
    onLog((p) => [...p, { step: 'init', status: 'error', message: 'Connection lost' }]);
    onDone('', false);
  }
}
