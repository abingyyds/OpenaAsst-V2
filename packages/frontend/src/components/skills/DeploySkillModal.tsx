import { useState, useEffect } from 'react';
import { X, Rocket, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { Skill } from '../../hooks/useSkills';
import type { DeployResult } from '../../hooks/useSkills';
import { API_BASE_URL } from '../../lib/config';

interface Device {
  id: string;
  label: string;
  connectionType?: string;
}

interface DeploySkillModalProps {
  skill: Skill;
  onClose: () => void;
  onDeploy: (skillId: string, deviceIds: string[], command?: string, params?: Record<string, string>) => Promise<DeployResult>;
}

export function DeploySkillModal({ skill, onClose, onDeploy }: DeploySkillModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedCommand, setSelectedCommand] = useState(skill.commands[0]?.name || '');
  const [params, setParams] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const [results, setResults] = useState<DeployResult | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/devices`)
      .then((r) => r.json())
      .then((data) => setDevices(data.devices || []))
      .catch(() => {});
  }, []);

  const cmd = skill.commands.find((c) => c.name === selectedCommand);

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleDeploy = async () => {
    if (selectedDevices.length === 0) return;
    setDeploying(true);
    setResults(null);
    const r = await onDeploy(skill.id, selectedDevices, selectedCommand, params);
    setResults(r);
    setDeploying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-page rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <span className="font-heading font-semibold text-sm">
            Deploy: {skill.name}
          </span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <DeviceSelector devices={devices} selected={selectedDevices} onToggle={toggleDevice} />
          <CommandSelector skill={skill} selected={selectedCommand} onChange={setSelectedCommand} />
          <ParamInputs cmd={cmd} params={params} setParams={setParams} />
          <ResultsDisplay results={results} devices={devices} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-200">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs bg-stone-200 text-ink-secondary hover:bg-stone-300 transition-colors">
            Close
          </button>
          <button onClick={handleDeploy}
            disabled={deploying || selectedDevices.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors">
            {deploying ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
            {deploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function DeviceSelector({ devices, selected, onToggle }: {
  devices: Device[]; selected: string[]; onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-ink-muted mb-2">Target Devices</h4>
      {devices.length === 0 ? (
        <p className="text-xs text-ink-muted">No devices configured</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {devices.map((d) => (
            <button key={d.id} onClick={() => onToggle(d.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                selected.includes(d.id)
                  ? 'bg-accent text-white'
                  : 'bg-stone-100 text-ink-muted hover:bg-stone-200'
              }`}>
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandSelector({ skill, selected, onChange }: {
  skill: Skill; selected: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-ink-muted mb-2">Command</h4>
      <select value={selected} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-stone-300 rounded-lg px-3 py-2 text-sm text-ink
          focus:outline-none focus:border-accent appearance-none cursor-pointer">
        {skill.commands.map((cmd) => (
          <option key={cmd.name} value={cmd.name}>{cmd.name} — {cmd.description}</option>
        ))}
      </select>
    </div>
  );
}

function ParamInputs({ cmd, params, setParams }: {
  cmd: any; params: Record<string, string>; setParams: (p: Record<string, string>) => void;
}) {
  if (!cmd?.params?.length) return null;
  return (
    <div>
      <h4 className="text-xs font-medium text-ink-muted mb-2">Parameters</h4>
      <div className="space-y-2">
        {cmd.params.map((p: any) => (
          <div key={p.name}>
            <label className="block text-[10px] text-ink-muted mb-0.5">
              {p.name}{p.required ? ' *' : ''} — {p.description}
            </label>
            <input type="text"
              value={params[p.name] || p.default || ''}
              onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
              placeholder={p.default || ''}
              className="w-full bg-surface border border-stone-300 rounded px-3 py-1.5 text-sm text-ink
                placeholder-ink-muted focus:outline-none focus:border-accent" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsDisplay({ results, devices }: {
  results: DeployResult | null; devices: Device[];
}) {
  if (!results) return null;
  return (
    <div>
      <h4 className="text-xs font-medium text-ink-muted mb-2">Results</h4>
      <div className="space-y-2">
        {Object.entries(results).map(([deviceId, r]) => {
          const dev = devices.find((d) => d.id === deviceId);
          return (
            <div key={deviceId} className="border border-stone-200 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                {r.success
                  ? <CheckCircle size={12} className="text-green-500" />
                  : <XCircle size={12} className="text-red-500" />}
                <span className="text-xs font-medium text-ink">{dev?.label || deviceId}</span>
              </div>
              {r.outputs.map((o, i) => (
                <div key={i} className="text-[10px] font-mono bg-stone-50 rounded p-1.5 mt-1 whitespace-pre-wrap text-ink-muted">
                  <span className="text-ink-secondary">$ {o.command}</span>
                  {o.stdout && <div>{o.stdout}</div>}
                  {o.stderr && <div className="text-red-500">{o.stderr}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
