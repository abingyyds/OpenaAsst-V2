import { Heart, Play, Tag } from 'lucide-react';
import type { MarketScript } from '../../hooks/useMarketplace';

interface ScriptCardProps {
  script: MarketScript;
  onSelect: (script: MarketScript) => void;
}

export function ScriptCard({ script, onSelect }: ScriptCardProps) {
  return (
    <button
      onClick={() => onSelect(script)}
      className="w-full text-left p-4 rounded-xl border border-stone-200
        hover:border-accent/40 hover:shadow-sm bg-surface transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink line-clamp-1">
          {script.name}
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-ink-muted shrink-0 ml-2">
          {script.category}
        </span>
      </div>

      <p className="text-xs text-ink-muted line-clamp-2 mb-3">
        {script.description}
      </p>

      {script.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {script.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] text-ink-muted">
        <span className="flex items-center gap-0.5">
          <Heart size={10} />
          {script.likeCount || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <Play size={10} />
          {script.usageCount || 0}
        </span>
        <span className="ml-auto">{script.author}</span>
      </div>
    </button>
  );
}
