import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { SessionRecord } from '../../stores/db';

interface SessionSidebarProps {
  sessions: SessionRecord[];
  activeSessionId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-stone-200 bg-surface">
      <div className="flex items-center justify-between px-3 py-3 border-b border-stone-200">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
          Conversations
        </span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-ink-muted">
            No conversations yet
          </div>
        ) : (
          sessions.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={s.id === activeSessionId}
              onSelect={() => onSelect(s.id!)}
              onDelete={() => onDelete(s.id!)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: SessionRecord;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const date = new Date(session.updatedAt);
  const timeStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors ${
        active
          ? 'bg-accent-light text-ink'
          : 'text-ink-secondary hover:bg-surface-hover'
      }`}
    >
      <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-ink-muted" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{session.title}</div>
        <div className="text-[10px] text-ink-muted mt-0.5">{timeStr}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
