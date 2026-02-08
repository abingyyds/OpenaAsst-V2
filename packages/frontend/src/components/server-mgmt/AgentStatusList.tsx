import { Monitor } from 'lucide-react';

interface AgentInfo {
  name: string;
  connectedAt: string;
  lastHeartbeat: string;
}

interface AgentStatusListProps {
  agents: AgentInfo[];
}

export function AgentStatusList({ agents }: AgentStatusListProps) {
  return (
    <div className="px-4 py-3 border-b border-stone-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-ink-secondary">Online Agents</span>
        <span className="text-xs text-ink-muted">{agents.length}</span>
      </div>

      {agents.length === 0 ? (
        <p className="text-xs text-ink-muted">No agents connected</p>
      ) : (
        <div className="space-y-1.5">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <Monitor size={12} className="text-ink-muted shrink-0" />
              <span className="text-xs text-ink truncate flex-1">
                {agent.name}
              </span>
              <span className="text-[10px] text-ink-muted">
                {formatTime(agent.lastHeartbeat)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
