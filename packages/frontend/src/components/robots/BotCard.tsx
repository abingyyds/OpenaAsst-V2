import { Play, Square, Settings, Trash2, ExternalLink } from 'lucide-react';
import type { DeployedBot } from './types';

interface BotCardProps {
  bot: DeployedBot;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onManage: () => void;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  deploying: 'bg-yellow-500 animate-pulse',
  stopped: 'bg-stone-400',
  error: 'bg-red-500',
};

export function BotCard({ bot, onStart, onStop, onDelete, onManage }: BotCardProps) {
  const channelCount = Array.isArray(bot.channels)
    ? bot.channels.filter((c) => c.enabled).length
    : Object.keys(bot.channels || {}).length;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg">
        {bot.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary truncate">{bot.name}</span>
          <span className={`w-2 h-2 rounded-full ${statusColors[bot.status]}`} />
          <span className="text-xs text-muted capitalize">{bot.status}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
          <span>{bot.host}</span>
          <span>{bot.primaryModel}</span>
          <span>{channelCount} channel{channelCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={onManage}
          className="p-2 rounded-lg text-accent hover:bg-accent/10" title="Manage">
          <Settings size={16} />
        </button>
        {bot.status === 'running' ? (
          <button onClick={onStop}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50" title="Stop">
            <Square size={16} />
          </button>
        ) : (
          <button onClick={onStart}
            className="p-2 rounded-lg text-green-600 hover:bg-green-50" title="Start">
            <Play size={16} />
          </button>
        )}
        <button onClick={onDelete}
          className="p-2 rounded-lg text-red-400 hover:bg-red-50" title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}