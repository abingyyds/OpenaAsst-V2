import { useState } from 'react';
import { useHub } from '../../hooks/useHub';
import { useClusterExec } from '../../hooks/useClusterExec';
import { ClusterDeviceList } from './ClusterDeviceList';
import { AiTaskPanel } from './AiTaskPanel';
import { HubControls } from './HubControls';

export function ClusterView() {
  const { hub, loading, start, stop: stopHub, deploy, deployAll } = useHub();
  const { events, isRunning, execute, stop: stopExec, clear } = useClusterExec();
  const [selected, setSelected] = useState<string[]>([]);

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
        />
        <ClusterDeviceList
          agents={hub.agents}
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
