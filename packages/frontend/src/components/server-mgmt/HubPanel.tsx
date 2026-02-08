import { useHub } from '../../hooks/useHub';
import { Wifi, WifiOff, Radio } from 'lucide-react';
import { AgentStatusList } from './AgentStatusList';
import { BatchExecutor } from './BatchExecutor';
import { DeployPanel } from './DeployPanel';

export function HubPanel() {
  const { hub, loading, start, stop, deploy, deployAll, broadcast } = useHub();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hub Status Header */}
      <div className="px-4 py-3 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-accent" />
            <span className="font-heading font-semibold text-sm">Hub Control</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hub.running ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-ink-muted">
              {hub.running ? `Port ${hub.port}` : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {hub.running ? (
            <button
              onClick={stop}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              <WifiOff size={12} />
              Stop Hub
            </button>
          ) : (
            <button
              onClick={start}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
            >
              <Wifi size={12} />
              Start Hub
            </button>
          )}
        </div>
      </div>

      {/* Agents */}
      <AgentStatusList agents={hub.agents} />

      {/* Batch Executor */}
      <BatchExecutor onBroadcast={broadcast} disabled={!hub.running} />

      {/* Deploy */}
      <DeployPanel onDeploy={deploy} onDeployAll={deployAll} />
    </div>
  );
}
