import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Bot, RefreshCw } from 'lucide-react';
import type { DeployedBot } from './types';
import { DeployWizard } from './DeployWizard';
import { BotCard } from './BotCard';
import { BotManage } from './BotManage';

const API = 'http://127.0.0.1:2026/robots';

type PageView = 'list' | 'deploy' | 'manage';

export function RobotStoreView() {
  const [view, setView] = useState<PageView>('list');
  const [bots, setBots] = useState<DeployedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (res.ok) setBots(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Poll real status for each bot via SSH
  const refreshStatuses = useCallback(async () => {
    setBots((prev) => {
      if (prev.length === 0) return prev;
      // Fire status checks in background, update state as results come in
      for (const bot of prev) {
        if (bot.status === 'deploying') continue;
        fetch(`${API}/${bot.id}/status`)
          .then((r) => r.json())
          .then((data) => {
            if (data.status && data.status !== 'unknown') {
              setBots((cur) =>
                cur.map((b) => b.id === bot.id ? { ...b, status: data.status } : b),
              );
            }
          })
          .catch(() => {});
      }
      return prev;
    });
  }, []);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  // Poll statuses every 15s when on list view
  useEffect(() => {
    if (view !== 'list') return;
    // Initial status check after bots load
    const t = setTimeout(refreshStatuses, 1000);
    pollRef.current = setInterval(refreshStatuses, 15000);
    return () => {
      clearTimeout(t);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [view, refreshStatuses, bots.length]);

  const handleStart = useCallback(async (id: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'running' as const } : b)),
    );
    try {
      await fetch(`${API}/${id}/start`, { method: 'POST' });
    } catch { /* ignore */ }
    fetchBots();
  }, [fetchBots]);

  const handleStop = useCallback(async (id: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'stopped' as const } : b)),
    );
    try {
      await fetch(`${API}/${id}/stop`, { method: 'POST' });
    } catch { /* ignore */ }
    fetchBots();
  }, [fetchBots]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setBots((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
  }, []);

  if (view === 'deploy') {
    return (
      <DeployWizard
        onComplete={() => { setView('list'); fetchBots(); }}
        onCancel={() => setView('list')}
      />
    );
  }

  const selectedBot = bots.find((b) => b.id === selectedBotId);
  if (view === 'manage' && selectedBot) {
    return (
      <BotManage bot={selectedBot}
        onBack={() => setView('list')}
        onStart={() => handleStart(selectedBot.id)}
        onStop={() => handleStop(selectedBot.id)} />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header botCount={bots.length} onDeploy={() => setView('deploy')} onRefresh={fetchBots} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading && bots.length === 0 ? (
          <p className="text-sm text-muted text-center py-12">Loading...</p>
        ) : bots.length === 0 ? (
          <EmptyState onDeploy={() => setView('deploy')} />
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot}
                onStart={() => handleStart(bot.id)}
                onStop={() => handleStop(bot.id)}
                onDelete={() => handleDelete(bot.id)}
                onManage={() => { setSelectedBotId(bot.id); setView('manage'); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ botCount, onDeploy, onRefresh }: {
  botCount: number; onDeploy: () => void; onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <Bot size={22} className="text-accent" />
        <div>
          <h1 className="text-lg font-bold text-primary">Robots</h1>
          <p className="text-xs text-muted">
            {botCount} deployed bot{botCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh}
          className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-tertiary"
          title="Refresh">
          <RefreshCw size={16} />
        </button>
        <button onClick={onDeploy}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
          <Plus size={16} />
          Deploy Bot
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onDeploy }: { onDeploy: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bot size={48} className="text-muted mb-4" />
      <h2 className="text-lg font-semibold text-primary mb-1">No bots deployed</h2>
      <p className="text-sm text-muted mb-6 max-w-sm">
        Deploy OpenClaw to a server to get started with your AI bot.
      </p>
      <button onClick={onDeploy}
        className="flex items-center gap-1.5 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
        <Plus size={16} />
        Deploy Your First Bot
      </button>
    </div>
  );
}
