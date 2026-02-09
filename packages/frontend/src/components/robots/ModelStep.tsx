import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ModelProvider } from './types';

interface ModelStepProps {
  providers: ModelProvider[];
  primaryModel: string;
  onChange: (providers: ModelProvider[], primary: string) => void;
}

const presets = [
  { id: 'anthropic', name: 'Anthropic', api: 'anthropic-messages' as const, baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  { id: 'ccoder', name: 'cCoder.me', api: 'anthropic-messages' as const, baseUrl: 'https://ccoder.me/', model: 'claude-sonnet-4-20250514' },
  { id: 'kimi', name: 'Kimi', api: 'openai-completions' as const, baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2.5' },
  { id: 'custom', name: 'Custom', api: 'openai-completions' as const, baseUrl: '', model: '' },
];

export function ModelStep({ providers, primaryModel, onChange }: ModelStepProps) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="max-w-lg mx-auto pt-4">
      <h2 className="text-xl font-bold text-primary mb-1">
        Configure Models
      </h2>
      <p className="text-sm text-muted mb-4">
        Add AI model providers for your bot
      </p>

      <ProviderList
        providers={providers}
        primaryModel={primaryModel}
        onChange={onChange}
      />

      {!adding ? (
        <AddButton onClick={() => setAdding(true)} />
      ) : (
        <AddProviderForm
          onAdd={(p) => {
            const next = [...providers, p];
            const pm = primaryModel || `${p.id}/${p.models[0]?.id || ''}`;
            onChange(next, pm);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function ProviderList({ providers, primaryModel, onChange }: {
  providers: ModelProvider[]; primaryModel: string;
  onChange: (p: ModelProvider[], pm: string) => void;
}) {
  if (providers.length === 0) return null;
  const remove = (idx: number) => {
    const next = providers.filter((_, i) => i !== idx);
    onChange(next, primaryModel);
  };
  return (
    <div className="space-y-2 mb-4">
      {providers.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-primary">{p.name}</span>
            <p className="text-xs text-muted truncate">{p.baseUrl}</p>
            <p className="text-xs text-muted">{p.models.map(m => m.id).join(', ')}</p>
          </div>
          <button onClick={() => remove(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition-colors">
      <Plus size={16} />
      <span className="text-sm font-medium">Add Provider</span>
    </button>
  );
}

function AddProviderForm({ onAdd, onCancel }: {
  onAdd: (p: ModelProvider) => void; onCancel: () => void;
}) {
  const [preset, setPreset] = useState(presets[0].id);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(presets[0].baseUrl);
  const [model, setModel] = useState(presets[0].model);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [tested, setTested] = useState(false);

  const handlePreset = (id: string) => {
    setPreset(id);
    const p = presets.find((x) => x.id === id);
    if (p) { setBaseUrl(p.baseUrl); setModel(p.model); }
    setModels([]); setTested(false); setTestError('');
  };

  const testApi = async () => {
    setTesting(true); setTestError(''); setModels([]);
    const p = presets.find((x) => x.id === preset)!;
    try {
      const res = await fetch('http://127.0.0.1:2026/robots/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api: p.api, baseUrl, apiKey }),
      });
      const data = await res.json();
      if (data.ok && data.models?.length) {
        setModels(data.models);
        setTested(true);
        if (!model || !data.models.some((m: any) => m.id === model)) {
          setModel(data.models[0].id);
        }
      } else {
        setTestError(data.error || 'No models returned');
      }
    } catch (e: any) {
      setTestError(e.message || 'Connection failed');
    }
    setTesting(false);
  };

  const submit = () => {
    const p = presets.find((x) => x.id === preset)!;
    onAdd({
      id: preset, name: p.name, baseUrl, apiKey,
      api: p.api,
      models: [{ id: model, name: model, contextWindow: 200000, maxTokens: 8192 }],
    });
  };

  return (
    <div className="rounded-xl border border-accent p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Provider</label>
        <select value={preset} onChange={(e) => handlePreset(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm">
          {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">API Key</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..." className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Base URL</label>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm" />
      </div>

      {/* Test button */}
      <button onClick={testApi} disabled={!apiKey || !baseUrl || testing}
        className="w-full py-2 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {testing ? 'Testing...' : tested ? 'Re-test Connection' : 'Test Connection & Fetch Models'}
      </button>

      {testError && (
        <p className="text-xs text-red-500 -mt-1">{testError}</p>
      )}

      {/* Model selector */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Model</label>
        {models.length > 0 ? (
          <select value={model} onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm">
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        ) : (
          <input value={model} onChange={(e) => setModel(e.target.value)}
            placeholder={tested ? 'No models found' : 'Test connection to load models'}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm" />
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="px-4 py-1.5 text-sm text-secondary hover:text-primary">Cancel</button>
        <button onClick={submit} disabled={!apiKey || !model}
          className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-40">
          Add
        </button>
      </div>
    </div>
  );
}