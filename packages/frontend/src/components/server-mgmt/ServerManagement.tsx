import { useState, useCallback } from 'react';
import { Monitor, Server } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import { DeviceList } from './DeviceList';
import { DeviceForm } from './DeviceForm';
import { DeviceWorkspace } from './DeviceWorkspace';
import { useHub } from '../../hooks/useHub';
import type { Device } from './DeviceList';

type ViewMode = 'idle' | 'workspace' | 'form';

export function ServerManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | undefined>(undefined);
  const { hub } = useHub();

  const handleSelectDevice = useCallback((device: Device) => {
    setSelectedDevice(device);
    setEditDevice(undefined);
    setViewMode('workspace');
  }, []);

  const handleAddDevice = useCallback(() => {
    setEditDevice(undefined);
    setViewMode('form');
  }, []);

  const handleSave = useCallback(
    async (data: Omit<Device, 'id' | 'connected'> & { password?: string; keyPath?: string }) => {
      try {
        const res = await fetch(`${API_BASE_URL}/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setViewMode('idle');
        }
      } catch {
        // silently fail
      }
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setViewMode(selectedDevice ? 'workspace' : 'idle');
  }, [selectedDevice]);

  return (
    <div className="flex flex-col h-full bg-page text-ink">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Monitor size={18} className="text-accent" />
          <span className="font-heading font-semibold text-sm">Server Management</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${hub.running ? 'bg-green-500' : 'bg-stone-300'}`} />
          <span className="text-xs text-ink-muted">
            Hub {hub.running ? `(${hub.agents.length} agents)` : 'offline'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Device list */}
        <div className="w-64 flex-shrink-0 border-r border-stone-200 overflow-hidden">
          <DeviceList
            onSelectDevice={handleSelectDevice}
            onAddDevice={handleAddDevice}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'form' && (
            <DeviceForm
              device={editDevice}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}

          {viewMode === 'workspace' && selectedDevice && (
            <DeviceWorkspace deviceId={selectedDevice.id} />
          )}

          {viewMode === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Server size={36} className="text-stone-300 mb-3" />
              <p className="text-sm text-ink-muted">
                Select a server to manage, or use <span className="font-semibold text-accent">Cluster</span> for AI group control.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
