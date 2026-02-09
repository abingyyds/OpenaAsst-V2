import { useState } from 'react';
import { Server, CheckSquare, Square, Wifi, WifiOff } from 'lucide-react';

interface Agent {
  name: string;
  connectedAt: string;
  lastHeartbeat: string;
}

interface RegisteredDevice {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  group?: string;
}

interface ClusterDeviceListProps {
  agents: Agent[];
  devices: RegisteredDevice[];
  hubRunning: boolean;
  selected: string[];
  onSelectionChange: (names: string[]) => void;
}

export function ClusterDeviceList({
  agents,
  devices,
  hubRunning,
  selected,
  onSelectionChange,
}: ClusterDeviceListProps) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Build merged list: registered devices + any agents not in devices
  const onlineNames = new Set(agents.map((a) => a.name));
  const merged: { name: string; host?: string; online: boolean }[] = [];

  for (const d of devices) {
    merged.push({ name: d.label, host: d.host, online: onlineNames.has(d.label) });
  }
  // Add agents that aren't in registered devices
  for (const a of agents) {
    if (!merged.some((m) => m.name === a.name)) {
      merged.push({ name: a.name, online: true });
    }
  }

  const totalCount = merged.length;
  const onlineCount = merged.filter((m) => m.online).length;

  const toggleOne = (name: string) => {
    if (selected.includes(name)) {
      onSelectionChange(selected.filter((n) => n !== name));
    } else {
      onSelectionChange([...selected, name]);
    }
  };

  const toggleAll = () => {
    if (selected.length === merged.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(merged.map((m) => m.name));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink">Servers</span>
          <span className="text-[10px] text-ink-muted">
            ({onlineCount} online / {totalCount} total)
          </span>
        </div>
        {totalCount > 0 && (
          <button
            onClick={toggleAll}
            className="text-[10px] text-accent hover:underline"
          >
            {selected.length === merged.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <NoDevices />
        ) : (
          <div className="py-1">
            {merged.map((item) => {
              const isSelected = selected.includes(item.name);
              const isHovered = hoveredName === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => toggleOne(item.name)}
                  onMouseEnter={() => setHoveredName(item.name)}
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
                  <Server size={14} className={`shrink-0 ${item.online ? 'text-ink-muted' : 'text-stone-300'}`} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-xs truncate ${item.online ? 'text-ink' : 'text-ink-muted'}`}>
                      {item.name}
                    </span>
                    {item.host && (
                      <span className="text-[10px] text-ink-muted truncate">{item.host}</span>
                    )}
                  </div>
                  {item.online ? (
                    <Wifi size={10} className="text-green-500 shrink-0" />
                  ) : (
                    <WifiOff size={10} className="text-stone-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: selection count */}
      {totalCount > 0 && (
        <div className="px-3 py-2 border-t border-stone-200 text-[10px] text-ink-muted">
          {selected.length} of {totalCount} selected
        </div>
      )}
    </div>
  );
}

function NoDevices() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <Server size={24} className="text-stone-300 mb-2" />
      <p className="text-xs text-ink-muted">
        No servers registered. Add servers in the Devices page first.
      </p>
    </div>
  );
}
