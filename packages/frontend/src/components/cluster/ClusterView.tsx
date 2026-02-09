import { useState, useEffect, useCallback } from 'react';
import { useHub } from '../../hooks/useHub';
import { useClusterExec } from '../../hooks/useClusterExec';
import { ClusterDeviceList } from './ClusterDeviceList';
import { AiTaskPanel } from './AiTaskPanel';
import { HubControls } from './HubControls';
import { API_BASE_URL } from '../../lib/config';

interface RegisteredDevice {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  group?: string;
}

export function ClusterView() {
  const { hub, loading, start, stop: stopHub, deploy, deployAll, syncConfig } = useHub();
  const { events, isRunning, execute, stop: stopExec, clear } = useClusterExec();
  const [selected, setSelected] = useState<string[]>([]);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleExecute = (task: string) => {
    execute(task, selected);
  };

  return (
    <div className="flex h-full">
      {/* Left panel: Hub controls + device list */}
      <div className="w-[260px] flex-shrink-0 border-r border-stone-200 flex flex-col">
        <HubControls
          running={hub.running}
          loading={loading}
          agentCount={hub.agents.length}
          onStart={start}
          onStop={stopHub}
          onDeployAll={deployAll}
          onSyncConfig={syncConfig}
        />
        <ClusterDeviceList
          agents={hub.agents}
          devices={devices}
          hubRunning={hub.running}
          selected={selected}
          onSelectionChange={setSelected}
        />
      </div>

      {/* Right panel: AI task + execution stream */}
      <div className="flex-1 flex flex-col min-w-0">
        <AiTaskPanel
          events={events}
          isRunning={isRunning}
          selectedCount={selected.length}
          onExecute={handleExecute}
          onStop={stopExec}
          onClear={clear}
        />
      </div>
    </div>
  );
}
