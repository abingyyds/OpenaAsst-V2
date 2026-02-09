import { useState } from 'react';
import { Save, X, KeyRound, Lock } from 'lucide-react';
import type { Device, ConnectionType } from './DeviceList';

interface DeviceFormProps {
  device?: Device;
  onSave: (data: Omit<Device, 'id' | 'connected'> & { password?: string; keyPath?: string }) => void;
  onCancel: () => void;
}

const CONNECTION_TYPES: { value: ConnectionType; label: string }[] = [
  { value: 'ssh', label: 'SSH' },
  { value: 'local', label: 'Local' },
  { value: 'docker', label: 'Docker' },
  { value: 'docker-remote', label: 'Docker Remote API' },
  { value: 'kubernetes', label: 'Kubernetes' },
  { value: 'wsl', label: 'WSL' },
];

export function DeviceForm({ device, onSave, onCancel }: DeviceFormProps) {
  const [connectionType, setConnectionType] = useState<ConnectionType>(device?.connectionType ?? 'ssh');
  const [label, setLabel] = useState(device?.label ?? '');
  const [host, setHost] = useState(device?.host ?? '');
  const [port, setPort] = useState(device?.port ?? 22);
  const [username, setUsername] = useState(device?.username ?? '');
  const [authType, setAuthType] = useState<'password' | 'key'>(device?.authType ?? 'password');
  const [password, setPassword] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [group, setGroup] = useState(device?.group ?? '');
  // Docker
  const [containerName, setContainerName] = useState(device?.containerName ?? '');
  // Docker Remote API
  const [dockerApiHost, setDockerApiHost] = useState(device?.dockerApiHost ?? '');
  const [dockerApiPort, setDockerApiPort] = useState(device?.dockerApiPort ?? 2375);
  const [dockerApiProtocol, setDockerApiProtocol] = useState<'http' | 'https'>(device?.dockerApiProtocol ?? 'http');
  // Kubernetes
  const [podName, setPodName] = useState(device?.podName ?? '');
  const [namespace, setNamespace] = useState(device?.namespace ?? 'default');
  const [k8sContainerName, setK8sContainerName] = useState(device?.k8sContainerName ?? '');
  // WSL
  const [distributionName, setDistributionName] = useState(device?.distributionName ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base: any = {
      label,
      connectionType,
      group: group || undefined,
    };

    if (connectionType === 'ssh') {
      Object.assign(base, { host, port, username, authType });
      if (authType === 'password') base.password = password;
      else base.keyPath = keyPath;
    } else if (connectionType === 'docker') {
      Object.assign(base, { containerName });
    } else if (connectionType === 'docker-remote') {
      Object.assign(base, { dockerApiHost, dockerApiPort, dockerApiProtocol, containerName });
    } else if (connectionType === 'kubernetes') {
      Object.assign(base, { podName, namespace, k8sContainerName: k8sContainerName || undefined });
    } else if (connectionType === 'wsl') {
      Object.assign(base, { distributionName: distributionName || undefined });
    }
    // 'local' needs no extra fields

    onSave(base);
  };

  const inputClass =
    'w-full bg-surface border border-stone-300 rounded px-3 py-2 text-sm text-ink ' +
    'placeholder-ink-muted focus:outline-none focus:border-accent transition-colors';

  const labelClass = 'block text-xs text-ink-secondary mb-1';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <span className="font-heading font-semibold text-sm text-ink">
          {device ? 'Edit Device' : 'Add Device'}
        </span>
        <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Connection Type */}
        <div>
          <label className={labelClass}>Connection Type</label>
          <div className="flex flex-wrap gap-1.5">
            {CONNECTION_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setConnectionType(ct.value)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  connectionType === ct.value
                    ? 'bg-accent text-white'
                    : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label className={labelClass}>Label</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="My Server" className={inputClass} required />
        </div>

        {/* SSH fields */}
        {connectionType === 'ssh' && (
          <SSHFields
            host={host} setHost={setHost} port={port} setPort={setPort}
            username={username} setUsername={setUsername}
            authType={authType} setAuthType={setAuthType}
            password={password} setPassword={setPassword}
            keyPath={keyPath} setKeyPath={setKeyPath}
            inputClass={inputClass} labelClass={labelClass}
          />
        )}

        {/* Docker fields */}
        {connectionType === 'docker' && (
          <div>
            <label className={labelClass}>Container Name</label>
            <input type="text" value={containerName} onChange={(e) => setContainerName(e.target.value)}
              placeholder="my-container" className={inputClass} required />
          </div>
        )}

        {/* Docker Remote API fields */}
        {connectionType === 'docker-remote' && (
          <DockerRemoteFields
            dockerApiHost={dockerApiHost} setDockerApiHost={setDockerApiHost}
            dockerApiPort={dockerApiPort} setDockerApiPort={setDockerApiPort}
            dockerApiProtocol={dockerApiProtocol} setDockerApiProtocol={setDockerApiProtocol}
            containerName={containerName} setContainerName={setContainerName}
            inputClass={inputClass} labelClass={labelClass}
          />
        )}

        {/* Kubernetes fields */}
        {connectionType === 'kubernetes' && (
          <KubernetesFields
            podName={podName} setPodName={setPodName}
            namespace={namespace} setNamespace={setNamespace}
            k8sContainerName={k8sContainerName} setK8sContainerName={setK8sContainerName}
            inputClass={inputClass} labelClass={labelClass}
          />
        )}

        {/* WSL fields */}
        {connectionType === 'wsl' && (
          <div>
            <label className={labelClass}>Distribution Name (optional)</label>
            <input type="text" value={distributionName} onChange={(e) => setDistributionName(e.target.value)}
              placeholder="Ubuntu" className={inputClass} />
          </div>
        )}

        {/* Local — no extra fields */}
        {connectionType === 'local' && (
          <p className="text-xs text-ink-muted">Runs commands on the local machine. No additional configuration needed.</p>
        )}

        {/* Group */}
        <div>
          <label className={labelClass}>Group (optional)</label>
          <input type="text" value={group} onChange={(e) => setGroup(e.target.value)}
            placeholder="production" className={inputClass} />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-stone-200">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs text-ink-secondary bg-stone-200 hover:bg-stone-300 transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white bg-accent hover:bg-accent-hover transition-colors">
          <Save size={12} /> Save
        </button>
      </div>
    </form>
  );
}

/* ---- SSH Fields ---- */
function SSHFields({ host, setHost, port, setPort, username, setUsername, authType, setAuthType, password, setPassword, keyPath, setKeyPath, inputClass, labelClass }: any) {
  return (
    <>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>Host</label>
          <input type="text" value={host} onChange={(e: any) => setHost(e.target.value)}
            placeholder="192.168.1.100" className={inputClass} required />
        </div>
        <div className="w-24">
          <label className={labelClass}>Port</label>
          <input type="number" value={port} onChange={(e: any) => setPort(Number(e.target.value))}
            className={inputClass} min={1} max={65535} required />
        </div>
      </div>
      <div>
        <label className={labelClass}>Username</label>
        <input type="text" value={username} onChange={(e: any) => setUsername(e.target.value)}
          placeholder="root" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Authentication</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAuthType('password')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              authType === 'password' ? 'bg-accent text-white' : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
            }`}>
            <Lock size={12} /> Password
          </button>
          <button type="button" onClick={() => setAuthType('key')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              authType === 'key' ? 'bg-accent text-white' : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
            }`}>
            <KeyRound size={12} /> SSH Key
          </button>
        </div>
      </div>
      {authType === 'password' ? (
        <div>
          <label className={labelClass}>Password</label>
          <input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)}
            placeholder="Enter password" className={inputClass} />
        </div>
      ) : (
        <div>
          <label className={labelClass}>Key Path</label>
          <input type="text" value={keyPath} onChange={(e: any) => setKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa" className={inputClass} />
        </div>
      )}
    </>
  );
}

/* ---- Docker Remote API Fields ---- */
function DockerRemoteFields({ dockerApiHost, setDockerApiHost, dockerApiPort, setDockerApiPort, dockerApiProtocol, setDockerApiProtocol, containerName, setContainerName, inputClass, labelClass }: any) {
  return (
    <>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>Docker API Host</label>
          <input type="text" value={dockerApiHost} onChange={(e: any) => setDockerApiHost(e.target.value)}
            placeholder="192.168.1.100" className={inputClass} required />
        </div>
        <div className="w-24">
          <label className={labelClass}>Port</label>
          <input type="number" value={dockerApiPort} onChange={(e: any) => setDockerApiPort(Number(e.target.value))}
            className={inputClass} min={1} max={65535} required />
        </div>
      </div>
      <div>
        <label className={labelClass}>Protocol</label>
        <div className="flex gap-2">
          {(['http', 'https'] as const).map((p) => (
            <button key={p} type="button" onClick={() => setDockerApiProtocol(p)}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                dockerApiProtocol === p ? 'bg-accent text-white' : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
              }`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Container Name</label>
        <input type="text" value={containerName} onChange={(e: any) => setContainerName(e.target.value)}
          placeholder="my-container" className={inputClass} required />
      </div>
    </>
  );
}

/* ---- Kubernetes Fields ---- */
function KubernetesFields({ podName, setPodName, namespace, setNamespace, k8sContainerName, setK8sContainerName, inputClass, labelClass }: any) {
  return (
    <>
      <div>
        <label className={labelClass}>Pod Name</label>
        <input type="text" value={podName} onChange={(e: any) => setPodName(e.target.value)}
          placeholder="my-pod" className={inputClass} required />
      </div>
      <div>
        <label className={labelClass}>Namespace</label>
        <input type="text" value={namespace} onChange={(e: any) => setNamespace(e.target.value)}
          placeholder="default" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Container Name (optional)</label>
        <input type="text" value={k8sContainerName} onChange={(e: any) => setK8sContainerName(e.target.value)}
          placeholder="Leave empty for default" className={inputClass} />
      </div>
    </>
  );
}
