import { useState } from 'react';
import { Save, X, KeyRound, Lock } from 'lucide-react';
import type { Device } from './DeviceList';

interface DeviceFormProps {
  device?: Device;
  onSave: (data: Omit<Device, 'id' | 'connected'> & { password?: string; keyPath?: string }) => void;
  onCancel: () => void;
}

export function DeviceForm({ device, onSave, onCancel }: DeviceFormProps) {
  const [label, setLabel] = useState(device?.label ?? '');
  const [host, setHost] = useState(device?.host ?? '');
  const [port, setPort] = useState(device?.port ?? 22);
  const [username, setUsername] = useState(device?.username ?? '');
  const [authType, setAuthType] = useState<'password' | 'key'>(device?.authType ?? 'password');
  const [password, setPassword] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [group, setGroup] = useState(device?.group ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label,
      host,
      port,
      username,
      authType,
      group: group || undefined,
      ...(authType === 'password' ? { password } : { keyPath }),
    });
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
        <button
          type="button"
          onClick={onCancel}
          className="text-ink-muted hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Label */}
        <div>
          <label className={labelClass}>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My Server"
            className={inputClass}
            required
          />
        </div>

        {/* Host and Port */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.100"
              className={inputClass}
              required
            />
          </div>
          <div className="w-24">
            <label className={labelClass}>Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className={inputClass}
              min={1}
              max={65535}
              required
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className={labelClass}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="root"
            className={inputClass}
            required
          />
        </div>

        {/* Auth Type */}
        <div>
          <label className={labelClass}>Authentication</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthType('password')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                authType === 'password'
                  ? 'bg-accent text-white'
                  : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
              }`}
            >
              <Lock size={12} />
              Password
            </button>
            <button
              type="button"
              onClick={() => setAuthType('key')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                authType === 'key'
                  ? 'bg-accent text-white'
                  : 'bg-stone-200 text-ink-secondary hover:bg-stone-300'
              }`}
            >
              <KeyRound size={12} />
              SSH Key
            </button>
          </div>
        </div>

        {/* Password or Key Path */}
        {authType === 'password' ? (
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>Key Path</label>
            <input
              type="text"
              value={keyPath}
              onChange={(e) => setKeyPath(e.target.value)}
              placeholder="~/.ssh/id_rsa"
              className={inputClass}
            />
          </div>
        )}

        {/* Group */}
        <div>
          <label className={labelClass}>Group (optional)</label>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="production"
            className={inputClass}
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-stone-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-xs text-ink-secondary bg-stone-200 hover:bg-stone-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white bg-accent hover:bg-accent-hover transition-colors"
        >
          <Save size={12} />
          Save
        </button>
      </div>
    </form>
  );
}
