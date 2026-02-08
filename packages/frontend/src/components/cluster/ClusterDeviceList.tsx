import { useState } from 'react';
import { Server, CheckSquare, Square, Wifi, WifiOff } from 'lucide-react';

interface Agent {
  name: string;
  connectedAt: string;
  lastHeartbeat: string;
}

interface ClusterDeviceListProps {
  agents: Agent[];
  hubRunning: boolean;
  selected: string[];
  onSelectionChange: (names: string[]) => void;
}

export function ClusterDeviceList({
  agents,
  hubRunning,
  selected,
  onSelectionChange,
}: ClusterDeviceListProps) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const toggleOne = (name: string) => {
    if (selected.includes(name)) {
      onSelectionChange(selected.filter((n) => n !== name));
    } else {
      onSelectionChange([...selected, name]);
    }
  };

  const toggleAll = () => {
    if (selected.length === agents.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(agents.map((a) => a.name));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink">Servers</span>
          <span className="text-[10px] text-ink-muted">
            ({agents.length} online)
          </span>
        </div>
        {agents.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-[10px] text-accent hover:underline"
          >
            {selected.length === agents.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {!hubRunning ? (
          <HubOffline />
        ) : agents.length === 0 ? (
          <NoAgents />
        ) : (
          <div className="py-1">
            {agents.map((agent) => {
              const isSelected = selected.includes(agent.name);
              const isHovered = hoveredName === agent.name;
              return (
                <button
                  key={agent.name}
                  onClick={() => toggleOne(agent.name)}
                  onMouseEnter={() => setHoveredName(agent.name)}
                  onMouseLeave={() => setHoveredName(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-accent/10'
                      : isHovered
                        ? 'bg-stone-100'
                        : ''
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare size={14} className="text-accent shrink-0" />
                  ) : (
                    <Square size={14} className="text-stone-400 shrink-0" />
                  )}
                  <Server size={14} className="text-ink-muted shrink-0" />
                  <span className="text-xs text-ink truncate flex-1">
                    {agent.name}
                  </span>
                  <Wifi size={10} className="text-green-500 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: selection count */}
      {agents.length > 0 && (
        <div className="px-3 py-2 border-t border-stone-200 text-[10px] text-ink-muted">
          {selected.length} of {agents.length} selected
        </div>
      )}
    </div>
  );
}

function HubOffline() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <WifiOff size={24} className="text-stone-300 mb-2" />
      <p className="text-xs text-ink-muted">
        Hub is offline. Start the hub to see connected servers.
      </p>
    </div>
  );
}

function NoAgents() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <Server size={24} className="text-stone-300 mb-2" />
      <p className="text-xs text-ink-muted">
        No agents connected. Deploy agents to your servers first.
      </p>
    </div>
  );
}
