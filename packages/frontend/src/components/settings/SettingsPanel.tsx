import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import { MCPConfig } from './MCPConfig';

interface SettingsData {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
}

interface SettingsPanelProps {
  open?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'openasst-settings';

interface ProviderConfig {
  label: string;
  defaultBaseUrl: string;
  models: string[];
}

const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-0-20250514',
      'claude-haiku-4-5-20250514',
    ],
  },
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-chat-v3-0324',
      'meta-llama/llama-4-maverick',
    ],
  },
  custom: {
    label: 'Custom (OpenAI Compatible)',
    defaultBaseUrl: '',
    models: [],
  },
};

type TabId = 'general' | 'mcp' | 'integrations';

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { apiKey: '', baseUrl: '', model: PROVIDERS.anthropic.models[0], provider: 'anthropic' };
}

function saveSettings(data: SettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function SettingsPanel(_props: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // Load from backend on mount (backend is source of truth for API key)
  useState(() => {
    fetch(`${API_BASE_URL}/settings`).then(r => r.json()).then(data => {
      if (data.settings?.apiKey) {
        setSettings(prev => ({
          ...prev,
          apiKey: data.settings.apiKey,
          baseUrl: data.settings.baseUrl || prev.baseUrl,
          model: data.settings.model || prev.model,
          provider: data.settings.provider || prev.provider,
        }));
      }
    }).catch(() => {});
  });

  const handleSave = async () => {
    saveSettings(settings);
    // Sync to backend so APIProvider can read it
    try {
      await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl || PROVIDERS[settings.provider]?.defaultBaseUrl || '',
          model: settings.model,
          provider: settings.provider,
        }),
      });
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'mcp', label: 'MCP' },
    { id: 'integrations', label: 'Integrations' },
  ];

  return (
    <div className="flex flex-col h-full bg-page text-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-accent" />
          <span className="font-heading font-semibold text-sm">Settings</span>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg
            bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <GeneralTab settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'mcp' && (
          <div className="px-6 py-5">
            <MCPConfig />
          </div>
        )}
        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  General Tab                                                        */
/* ------------------------------------------------------------------ */

function GeneralTab({
  settings,
  setSettings,
}: {
  settings: SettingsData;
  setSettings: React.Dispatch<React.SetStateAction<SettingsData>>;
}) {
  const provider = PROVIDERS[settings.provider] || PROVIDERS.custom;
  const [fetchedModels, setFetchedModels] = useState<{ id: string; name: string }[]>([]);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [tested, setTested] = useState(false);

  const handleProviderChange = (p: string) => {
    const cfg = PROVIDERS[p];
    setSettings((s) => ({
      ...s,
      provider: p,
      baseUrl: cfg?.defaultBaseUrl || '',
      model: cfg?.models[0] || '',
    }));
    setFetchedModels([]); setTested(false); setTestError('');
  };

  const testApi = async () => {
    setTesting(true); setTestError(''); setFetchedModels([]);
    const isAnthropic = settings.provider === 'anthropic' ||
      settings.baseUrl.includes('anthropic');
    const api = isAnthropic ? 'anthropic-messages' : 'openai-completions';
    try {
      const res = await fetch(`${API_BASE_URL}/robots/test-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api, baseUrl: settings.baseUrl || provider.defaultBaseUrl, apiKey: settings.apiKey }),
      });
      const data = await res.json();
      if (data.ok && data.models?.length) {
        setFetchedModels(data.models);
        setTested(true);
        if (!settings.model || !data.models.some((m: any) => m.id === settings.model)) {
          setSettings((s) => ({ ...s, model: data.models[0].id }));
        }
      } else {
        setTestError(data.error || 'No models returned');
      }
    } catch (e: any) {
      setTestError(e.message || 'Connection failed');
    }
    setTesting(false);
  };

  const models = fetchedModels.length > 0
    ? fetchedModels.map(m => m.id)
    : provider.models;

  return (
    <div className="px-6 py-5 space-y-4">
      <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
        Model Configuration
      </h3>

      {/* Provider selector */}
      <div>
        <label className="block text-xs text-ink-muted mb-1">Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full bg-surface border border-stone-300 rounded-lg
            px-3 py-2 text-sm text-ink
            focus:outline-none focus:border-accent appearance-none cursor-pointer"
        >
          {Object.entries(PROVIDERS).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <Field
        label="API Key"
        type="password"
        value={settings.apiKey}
        placeholder="sk-..."
        onChange={(v) => setSettings((s) => ({ ...s, apiKey: v }))}
      />

      {/* Base URL */}
      <Field
        label="Base URL"
        value={settings.baseUrl}
        placeholder={provider.defaultBaseUrl || 'https://your-api-endpoint.com/v1'}
        onChange={(v) => setSettings((s) => ({ ...s, baseUrl: v }))}
      />

      {/* Test connection button */}
      <button onClick={testApi} disabled={!settings.apiKey || testing}
        className="w-full py-2 rounded-lg border border-accent text-accent text-sm font-semibold
          hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors
          flex items-center justify-center gap-2">
        {testing && <Loader2 size={14} className="animate-spin" />}
        {testing ? 'Testing...' : tested ? 'Re-test Connection' : 'Test Connection & Fetch Models'}
      </button>

      {testError && (
        <p className="text-xs text-red-500 -mt-2">{testError}</p>
      )}
      {tested && !testError && (
        <p className="text-xs text-green-600 -mt-2">Connected — {fetchedModels.length} models found</p>
      )}

      {/* Model selector */}
      <div>
        <label className="block text-xs text-ink-muted mb-1">Model</label>
        {models.length > 0 ? (
          <div className="space-y-2">
            <select
              value={models.includes(settings.model) ? settings.model : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  setSettings((s) => ({ ...s, model: e.target.value }));
                }
              }}
              className="w-full bg-surface border border-stone-300 rounded-lg
                px-3 py-2 text-sm text-ink
                focus:outline-none focus:border-accent appearance-none cursor-pointer"
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {!models.includes(settings.model) && (
              <input
                type="text"
                value={settings.model}
                placeholder="Enter custom model name"
                onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                className="w-full bg-surface border border-stone-300 rounded-lg
                  px-3 py-2 text-sm text-ink placeholder-ink-muted
                  focus:outline-none focus:border-accent"
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            value={settings.model}
            placeholder="Enter model name (e.g. gpt-4o)"
            onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
            className="w-full bg-surface border border-stone-300 rounded-lg
              px-3 py-2 text-sm text-ink placeholder-ink-muted
              focus:outline-none focus:border-accent"
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integrations Tab                                                    */
/* ------------------------------------------------------------------ */

const INTEGRATIONS_KEY = 'openasst-integrations';

function loadIntegrations() {
  try {
    const raw = localStorage.getItem(INTEGRATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { tavilyKey: '', serperKey: '' };
}

function IntegrationsTab() {
  const [data, setData] = useState(loadIntegrations);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [intSaved, setIntSaved] = useState(false);
  const [ghStatus, setGhStatus] = useState<{ configured: boolean; repo?: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/knowledge/sync/status`)
      .then((r) => r.json())
      .then((d) => setGhStatus(d))
      .catch(() => setGhStatus({ configured: false }));
  }, []);

  const handleSaveIntegrations = () => {
    localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(data));
    setIntSaved(true);
    setTimeout(() => setIntSaved(false), 2000);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.error) {
        setSyncResult(`Error: ${json.error}`);
      } else {
        setSyncResult(`Synced ${json.synced} categories to GitHub`);
      }
    } catch {
      setSyncResult('Failed to sync');
    }
    setSyncing(false);
  };

  return (
    <div className="px-6 py-5 space-y-6">
      {/* GitHub */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
          GitHub Knowledge Sync
        </h3>
        <div className="rounded-lg border border-stone-300 bg-surface px-4 py-3 text-sm">
          {ghStatus === null ? (
            <span className="text-ink-muted">Checking configuration...</span>
          ) : ghStatus.configured ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-700 font-medium">GitHub configured</span>
              </div>
              <p className="text-ink-muted text-xs">Repo: {ghStatus.repo}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-stone-400" />
                <span className="text-ink-muted font-medium">GitHub not configured</span>
              </div>
              <p className="text-ink-muted text-xs">
                Set <code className="bg-stone-200 px-1 rounded">GITHUB_TOKEN</code> and{' '}
                <code className="bg-stone-200 px-1 rounded">GITHUB_REPO</code> environment
                variables on the server to enable sync.
              </p>
            </div>
          )}
        </div>
        <button onClick={handleSync} disabled={syncing || !ghStatus?.configured}
          className="w-full py-2 rounded-lg border border-accent text-accent text-sm font-semibold
            hover:bg-accent/5 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
          {syncing && <Loader2 size={14} className="animate-spin" />}
          {syncing ? 'Syncing...' : 'Sync Knowledge to GitHub'}
        </button>
        {syncResult && (
          <p className={`text-xs ${syncResult.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
            {syncResult}
          </p>
        )}
      </div>

      {/* Search APIs */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
          Search APIs (Optional)
        </h3>
        <Field label="Tavily API Key" type="password" value={data.tavilyKey}
          placeholder="tvly-..." onChange={(v) => setData({ ...data, tavilyKey: v })} />
        <Field label="Serper API Key" type="password" value={data.serperKey}
          placeholder="..." onChange={(v) => setData({ ...data, serperKey: v })} />
      </div>

      <button onClick={handleSaveIntegrations}
        className="w-full py-2 rounded-lg bg-accent text-white text-sm font-semibold
          hover:bg-accent-hover transition-colors">
        {intSaved ? 'Saved!' : 'Save Integration Settings'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable input field                                               */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-stone-300 rounded-lg
          px-3 py-2 text-sm text-ink placeholder-ink-muted
          focus:outline-none focus:border-accent"
      />
    </div>
  );
}
