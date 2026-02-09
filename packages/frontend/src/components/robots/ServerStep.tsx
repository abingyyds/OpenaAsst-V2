import { useState, useEffect, useCallback } from 'react';
import { Server, CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface ServerInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
}

interface ServerStepProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  botName: string;
  onBotNameChange: (name: string) => void;
}

const API = 'http://127.0.0.1:2026';

export function ServerStep({ selectedId, onSelect, botName, onBotNameChange }: ServerStepProps) {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API}/robots/servers/list`)
      .then((r) => r.json())
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const testConnection = useCallback(async (id: string) => {
    setTestStatus((s) => ({ ...s, [id]: 'testing' }));
    setTestError((s) => ({ ...s, [id]: '' }));
    try {
      const res = await fetch(`${API}/devices/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestStatus((s) => ({ ...s, [id]: 'ok' }));
      } else {
        setTestStatus((s) => ({ ...s, [id]: 'fail' }));
        setTestError((s) => ({ ...s, [id]: data.error || 'Connection failed' }));
      }
    } catch {
      setTestStatus((s) => ({ ...s, [id]: 'fail' }));
      setTestError((s) => ({ ...s, [id]: 'Request failed' }));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (servers.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-lg mx-auto pt-4">
      <h2 className="text-xl font-bold text-primary mb-1">
        Select Server
      </h2>
      <p className="text-sm text-muted mb-4">
        Choose a server to deploy OpenClaw on
      </p>
      <div className="mb-4">
        <label className="block text-xs font-medium text-secondary mb-1">Bot Name</label>
        <input value={botName} onChange={(e) => onBotNameChange(e.target.value)}
          placeholder="My Bot"
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent" />
      </div>
      <div className="space-y-2">
        {servers.map((s) => (
          <ServerRow
            key={s.id}
            server={s}
            selected={selectedId === s.id}
            onSelect={() => onSelect(s.id)}
            status={testStatus[s.id] || 'idle'}
            error={testError[s.id] || ''}
            onTest={() => testConnection(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ServerRow({ server, selected, onSelect, status, error, onTest }: {
  server: ServerInfo; selected: boolean; onSelect: () => void;
  status: 'idle' | 'testing' | 'ok' | 'fail'; error: string; onTest: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 transition-all ${
      selected ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
    }`}>
      <button onClick={onSelect} className="w-full flex items-center gap-3 p-3 text-left">
        <Server size={18} className={selected ? 'text-accent' : 'text-muted'} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-primary text-sm">{server.name}</span>
          <p className="text-xs text-muted truncate">
            {server.username}@{server.host}:{server.port}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'ok' && <Wifi size={16} className="text-green-500" />}
          {status === 'fail' && <WifiOff size={16} className="text-red-500" />}
          {selected && <CheckCircle size={18} className="text-accent" />}
        </div>
      </button>
      {selected && (
        <div className="px-3 pb-3 pt-0">
          <button onClick={(e) => { e.stopPropagation(); onTest(); }}
            disabled={status === 'testing'}
            className="w-full py-1.5 rounded-lg border border-accent text-accent text-xs font-semibold
              hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors
              flex items-center justify-center gap-1.5">
            {status === 'testing' && <Loader2 size={12} className="animate-spin" />}
            {status === 'testing' ? 'Testing...'
              : status === 'ok' ? 'Connected'
              : status === 'fail' ? 'Retry Test'
              : 'Test SSH Connection'}
          </button>
          {status === 'ok' && (
            <p className="text-xs text-green-600 mt-1 text-center">SSH connection OK</p>
          )}
          {status === 'fail' && error && (
            <p className="text-xs text-red-500 mt-1 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <XCircle size={48} className="mx-auto mb-3 text-muted opacity-40" />
      <p className="text-lg font-medium text-primary">No servers found</p>
      <p className="text-sm text-muted mt-1">
        Add a server in the Servers page first
      </p>
    </div>
  );
}
