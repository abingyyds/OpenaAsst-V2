import { useState, useEffect } from 'react';
import { Settings, Save, X } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import { MCPConfig } from './MCPConfig';

interface SettingsData {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
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

type TabId = 'general' | 'mcp';

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

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'mcp', label: 'MCP' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-page border border-stone-200 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2 text-ink">
            <Settings size={18} />
            <span className="font-heading font-semibold">Settings</span>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
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

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <GeneralTab settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'mcp' && (
            <div className="px-6 py-5">
              <MCPConfig />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-ink-secondary hover:text-ink
              border border-stone-300 hover:border-stone-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
              bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
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
  const models = provider.models;

  const handleProviderChange = (p: string) => {
    const cfg = PROVIDERS[p];
    setSettings((s) => ({
      ...s,
      provider: p,
      baseUrl: cfg?.defaultBaseUrl || '',
      model: cfg?.models[0] || '',
    }));
  };

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
