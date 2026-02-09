import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Play, Square, Copy, CheckCircle } from 'lucide-react';
import type { DeployedBot } from './types';

interface BotManageProps {
  bot: DeployedBot;
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
}

const API = 'http://127.0.0.1:2026';

type Tab = 'overview' | 'channels' | 'config';

export function BotManage({ bot, onBack, onStart, onStop }: BotManageProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [liveStatus, setLiveStatus] = useState(bot.status);
  const [copied, setCopied] = useState(false);

  const accessUrl = `http://${bot.host}:${bot.gatewayPort || 18789}`;

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API}/robots/${bot.id}/status`);
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data.status);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { refreshStatus(); }, [bot.id]);

  const copyUrl = () => {
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-tertiary">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-primary truncate">{bot.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className={`w-2 h-2 rounded-full ${liveStatus === 'running' ? 'bg-green-500' : 'bg-stone-400'}`} />
            <span className="capitalize">{liveStatus}</span>
            <span>{bot.host}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={refreshStatus} className="p-2 rounded-lg text-secondary hover:bg-tertiary" title="Refresh">
            <RefreshCw size={16} />
          </button>
          {liveStatus === 'running' ? (
            <button onClick={onStop} className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Stop</button>
          ) : (
            <button onClick={onStart} className="px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50">Start</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-6 pt-3">
        {(['overview', 'channels', 'config'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize ${
              tab === t ? 'bg-white border border-b-0 border-border text-primary' : 'text-muted hover:text-primary'
            }`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border-t border-border">
        {tab === 'overview' && <OverviewTab bot={bot} liveStatus={liveStatus} accessUrl={accessUrl} copied={copied} onCopy={copyUrl} />}
        {tab === 'channels' && <ChannelsTab bot={bot} />}
        {tab === 'config' && <ConfigTab bot={bot} />}
      </div>
    </div>
  );
}

function OverviewTab({ bot, liveStatus, accessUrl, copied, onCopy }: {
  bot: DeployedBot; liveStatus: string; accessUrl: string; copied: boolean; onCopy: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <InfoRow label="Status" value={liveStatus} />
      <InfoRow label="Host" value={bot.host} />
      <InfoRow label="Gateway Port" value={String(bot.gatewayPort || 18789)} />
      <InfoRow label="Primary Model" value={bot.primaryModel} />
      <InfoRow label="Created" value={new Date(bot.createdAt).toLocaleString()} />

      <div className="pt-2">
        <label className="block text-xs font-medium text-secondary mb-1">Access Link</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-border text-sm truncate">
            {accessUrl}
          </code>
          <button onClick={onCopy} className="p-2 rounded-lg hover:bg-tertiary" title="Copy">
            {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-muted" />}
          </button>
          <a href={accessUrl} target="_blank" rel="noreferrer"
            className="p-2 rounded-lg hover:bg-tertiary" title="Open">
            <ExternalLink size={16} className="text-accent" />
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-sm font-medium text-primary capitalize">{value}</span>
    </div>
  );
}

function ChannelsTab({ bot }: { bot: DeployedBot }) {
  const entries: { type: string; dmPolicy?: string }[] = [];
  if (Array.isArray(bot.channels)) {
    for (const c of bot.channels) { if (c.enabled) entries.push(c); }
  } else if (bot.channels && typeof bot.channels === 'object') {
    for (const [type, cfg] of Object.entries(bot.channels as Record<string, any>)) {
      entries.push({ type, dmPolicy: cfg.dmPolicy });
    }
  }
  if (entries.length === 0) {
    return <p className="text-sm text-muted py-8 text-center">No channels configured</p>;
  }
  return (
    <div className="max-w-lg space-y-3">
      {entries.map((ch) => (
        <div key={ch.type} className="flex items-center justify-between p-3 rounded-xl border border-border">
          <div>
            <span className="font-semibold text-sm text-primary capitalize">{ch.type}</span>
            <p className="text-xs text-muted">DM Policy: {ch.dmPolicy}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
        </div>
      ))}
    </div>
  );
}

function ConfigTab({ bot }: { bot: DeployedBot }) {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const cfg = {
      providers: bot.providers,
      channels: bot.channels,
      primaryModel: bot.primaryModel,
      gatewayPort: bot.gatewayPort,
    };
    setConfig(JSON.stringify(cfg, null, 2));
    setLoading(false);
  }, [bot]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const parsed = JSON.parse(config);
      const res = await fetch(`${API}/robots/${bot.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: parsed }),
      });
      setMsg(res.ok ? 'Config saved' : 'Save failed');
    } catch {
      setMsg('Invalid JSON');
    }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  return (
    <div className="max-w-lg space-y-3">
      <textarea value={config} onChange={(e) => setConfig(e.target.value)}
        rows={16}
        className="w-full px-3 py-2 rounded-lg border border-border bg-stone-50 text-sm font-mono focus:outline-none focus:border-accent" />
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-40">
          {saving ? 'Saving...' : 'Save Config'}
        </button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}