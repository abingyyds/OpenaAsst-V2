import { useState, useEffect } from 'react';
import { Server, Plus, Plug, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

export type ConnectionType = 'ssh' | 'local' | 'docker' | 'docker-remote' | 'kubernetes' | 'wsl';

export interface Device {
  id: string;
  label: string;
  connectionType: ConnectionType;
  host: string;
  port: number;
  username: string;
  group?: string;
  authType: 'password' | 'key';
  connected?: boolean;
  // Docker
  containerName?: string;
  // Docker Remote API
  dockerApiHost?: string;
  dockerApiPort?: number;
  dockerApiProtocol?: 'http' | 'https';
  // Kubernetes
  podName?: string;
  namespace?: string;
  k8sContainerName?: string;
  // WSL
  distributionName?: string;
}

interface DeviceListProps {
  onSelectDevice: (device: Device) => void;
  onAddDevice: () => void;
}

export function DeviceList({ onSelectDevice, onAddDevice }: DeviceListProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectResult, setConnectResult] = useState<{ id: string; ok: boolean; error?: string } | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : data.devices || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSelect = (device: Device) => {
    setSelectedId(device.id);
    onSelectDevice(device);
  };

  const handleConnect = async (device: Device) => {
    setConnectingId(device.id);
    setConnectResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/devices/${device.id}/connect`, {
        method: 'POST',
      });
      const data = res.ok ? await res.json() : null;
      const ok = data?.success === true;
      setConnectResult({ id: device.id, ok, error: data?.error });
      if (ok) fetchDevices();
      setTimeout(() => setConnectResult(null), 5000);
    } catch {
      setConnectResult({ id: device.id, ok: false, error: 'Network error' });
      setTimeout(() => setConnectResult(null), 5000);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDelete = async (device: Device) => {
    try {
      const res = await fetch(`${API_BASE_URL}/devices/${device.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedId === device.id) setSelectedId(null);
        fetchDevices();
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-accent" />
          <span className="font-heading font-semibold text-sm text-ink">Devices</span>
        </div>
        <button
          onClick={onAddDevice}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-ink-muted">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-ink-muted">
            No devices configured
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              onClick={() => handleSelect(device)}
              className={`px-4 py-2.5 cursor-pointer border-b border-stone-100 transition-colors ${
                selectedId === device.id
                  ? 'bg-accent-light text-ink'
                  : 'text-ink-secondary hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">
                  {device.label}
                </span>
                <span className="flex-shrink-0 ml-2">
                  {device.connected ? (
                    <Wifi size={12} className="text-green-500" />
                  ) : (
                    <WifiOff size={12} className="text-stone-400" />
                  )}
                </span>
              </div>
              <div className="text-xs text-ink-muted mb-2">
                {device.connectionType === 'local' ? 'localhost' :
                 device.connectionType === 'docker' ? `docker: ${device.containerName || '?'}` :
                 device.connectionType === 'docker-remote' ? `docker-remote: ${device.dockerApiHost || '?'}` :
                 device.connectionType === 'kubernetes' ? `k8s: ${device.podName || '?'}${device.namespace ? `/${device.namespace}` : ''}` :
                 device.connectionType === 'wsl' ? `wsl: ${device.distributionName || 'default'}` :
                 `${device.username}@${device.host}:${device.port}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnect(device);
                  }}
                  disabled={connectingId === device.id}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
                    connectResult?.id === device.id
                      ? connectResult.ok
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                      : connectingId === device.id
                        ? 'bg-stone-200 text-ink-muted cursor-wait'
                        : 'bg-stone-200 hover:bg-stone-300 text-ink-secondary hover:text-ink'
                  }`}
                >
                  {connectingId === device.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Plug size={10} />
                  )}
                  {connectingId === device.id
                    ? 'Connecting...'
                    : connectResult?.id === device.id
                      ? connectResult.ok ? 'Connected' : 'Failed'
                      : 'Connect'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(device);
                  }}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-stone-200 hover:bg-red-50 text-ink-secondary hover:text-red-600 transition-colors"
                >
                  <Trash2 size={10} />
                  Delete
                </button>
              </div>
              {connectResult?.id === device.id && !connectResult.ok && connectResult.error && (
                <div className="mt-1.5 text-[10px] text-red-600 bg-red-50 rounded px-2 py-1 break-all">
                  {connectResult.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
