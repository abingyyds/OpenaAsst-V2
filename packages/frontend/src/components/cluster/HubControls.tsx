import { Power, PowerOff, Upload, Loader2, RefreshCw } from 'lucide-react';

interface HubControlsProps {
  running: boolean;
  loading: boolean;
  agentCount: number;
  onStart: () => void;
  onStop: () => void;
  onDeployAll: () => void;
  onSyncConfig: () => void;
}

export function HubControls({
  running,
  loading,
  agentCount,
  onStart,
  onStop,
  onDeployAll,
  onSyncConfig,
}: HubControlsProps) {
  return (
    <div className="px-3 py-3 border-b border-stone-200">
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              running ? 'bg-green-500' : 'bg-stone-300'
            }`}
          />
          <span className="text-xs font-semibold text-ink">
            Hub {running ? 'Online' : 'Offline'}
          </span>
        </div>
        {running && (
          <span className="text-[10px] text-ink-muted">
            {agentCount} agent{agentCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        {running ? (
          <button
            onClick={onStop}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5
              px-2 py-1.5 rounded-lg text-xs font-medium
              border border-stone-200 text-ink-secondary
              hover:bg-stone-100 transition-colors
              disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <PowerOff size={12} />
            )}
            Stop Hub
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5
              px-2 py-1.5 rounded-lg text-xs font-medium
              bg-accent text-white hover:bg-accent/90
              transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Power size={12} />
            )}
            Start Hub
          </button>
        )}

        {running && (
          <button
            onClick={onDeployAll}
            disabled={loading}
            className="flex items-center justify-center gap-1.5
              px-2 py-1.5 rounded-lg text-xs font-medium
              border border-stone-200 text-ink-secondary
              hover:bg-stone-100 transition-colors
              disabled:opacity-50"
            title="Deploy agent to all devices"
          >
            <Upload size={12} />
            Deploy
          </button>
        )}

        {running && agentCount > 0 && (
          <button
            onClick={onSyncConfig}
            disabled={loading}
            className="flex items-center justify-center gap-1.5
              px-2 py-1.5 rounded-lg text-xs font-medium
              border border-stone-200 text-ink-secondary
              hover:bg-stone-100 transition-colors
              disabled:opacity-50"
            title="Sync API config to all connected agents"
          >
            <RefreshCw size={12} />
            Sync Config
          </button>
        )}
      </div>
    </div>
  );
}
