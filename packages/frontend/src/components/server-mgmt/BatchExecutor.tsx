import { useState } from 'react';
import { Terminal, Play } from 'lucide-react';

interface BatchExecutorProps {
  onBroadcast: (command: string, targetNames?: string[]) => Promise<unknown[]>;
  disabled: boolean;
}

interface BroadcastResult {
  deviceName: string;
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export function BatchExecutor({ onBroadcast, disabled }: BatchExecutorProps) {
  const [command, setCommand] = useState('');
  const [results, setResults] = useState<BroadcastResult[]>([]);
  const [running, setRunning] = useState(false);

  const handleExecute = async () => {
    if (!command.trim() || running) return;
    setRunning(true);
    setResults([]);
    try {
      const res = await onBroadcast(command.trim());
      setResults(res as BroadcastResult[]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-stone-200">
      <div className="flex items-center gap-2 mb-2">
        <Terminal size={14} className="text-ink-secondary" />
        <span className="text-xs font-semibold text-ink-secondary">
          Batch Execute
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          placeholder={disabled ? 'Start hub first' : 'Command to broadcast...'}
          disabled={disabled || running}
          className="flex-1 px-2 py-1.5 text-xs bg-surface border border-stone-300 rounded-lg text-ink placeholder-ink-muted disabled:opacity-50 focus:outline-none focus:border-accent"
        />
        <button
          onClick={handleExecute}
          disabled={disabled || running || !command.trim()}
          className="px-2 py-1.5 rounded-lg bg-accent text-white text-xs disabled:opacity-50 hover:bg-accent-hover"
        >
          <Play size={12} />
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <ResultItem key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultItem({ result }: { result: BroadcastResult }) {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-surface text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${
          result.success ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-ink font-medium">{result.deviceName}</span>
        <span className="text-ink-muted ml-auto">exit: {result.exitCode}</span>
      </div>
      {result.output && (
        <pre className="text-ink-secondary whitespace-pre-wrap break-all text-[10px] mt-1">
          {result.output.slice(0, 500)}
        </pre>
      )}
    </div>
  );
}
