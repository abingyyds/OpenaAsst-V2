import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader } from 'lucide-react';

interface DeployResult {
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  message?: string;
}

interface DeployPanelProps {
  onDeploy: (deviceIds: string[]) => Promise<DeployResult[]>;
  onDeployAll: () => Promise<DeployResult[]>;
}

export function DeployPanel({ onDeploy, onDeployAll }: DeployPanelProps) {
  const [results, setResults] = useState<DeployResult[]>([]);
  const [deploying, setDeploying] = useState(false);

  const handleDeployAll = async () => {
    if (deploying) return;
    setDeploying(true);
    setResults([]);
    try {
      const res = await onDeployAll();
      setResults(res);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-ink-secondary" />
          <span className="text-xs font-semibold text-ink-secondary">
            Agent Deploy
          </span>
        </div>
        <button
          onClick={handleDeployAll}
          disabled={deploying}
          className="px-2 py-1 text-xs rounded-lg bg-accent-light text-accent hover:bg-orange-100 disabled:opacity-50"
        >
          {deploying ? 'Deploying...' : 'Deploy All'}
        </button>
      </div>

      <p className="text-[10px] text-ink-muted mb-2">
        Install OpenAsst agent on remote servers for cluster control.
      </p>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {results.map((r, i) => (
            <DeployResultItem key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeployResultItem({ result }: { result: DeployResult }) {
  const icon =
    result.status === 'success' ? (
      <CheckCircle size={12} className="text-green-600" />
    ) : result.status === 'failed' ? (
      <XCircle size={12} className="text-red-600" />
    ) : (
      <Loader size={12} className="text-accent animate-spin" />
    );

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface text-xs">
      {icon}
      <span className="text-ink truncate flex-1">{result.deviceName}</span>
      <span className="text-[10px] text-ink-muted">{result.status}</span>
    </div>
  );
}
