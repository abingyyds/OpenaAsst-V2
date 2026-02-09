import { useState } from 'react';
import { X, Heart, Star, Play, Bookmark } from 'lucide-react';
import type { MarketScript } from '../../hooks/useMarketplace';

interface ScriptDetailModalProps {
  script: MarketScript;
  onClose: () => void;
  onLike: (id: string) => void;
  onFavorite: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export function ScriptDetailModal({
  script, onClose, onLike, onFavorite, onRate,
}: ScriptDetailModalProps) {
  const [userRating, setUserRating] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-page rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <span className="font-heading font-semibold text-sm line-clamp-1">
            {script.name}
          </span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="px-2 py-0.5 rounded bg-stone-100">{script.category}</span>
            <span>by {script.author}</span>
            <span className="flex items-center gap-0.5">
              <Play size={10} /> {script.usageCount}
            </span>
          </div>

          <p className="text-sm text-ink">{script.description}</p>

          {/* Tags */}
          {script.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {script.tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Commands */}
          {script.commands?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-ink-muted mb-2">Commands</h4>
              <div className="space-y-1">
                {script.commands.map((cmd: any, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-ink-muted w-4 shrink-0">{i + 1}.</span>
                    <code className="font-mono bg-stone-100 px-2 py-1 rounded flex-1 text-ink">
                      {cmd.command || cmd}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document content */}
          {script.documentContent && (
            <div>
              <h4 className="text-xs font-medium text-ink-muted mb-2">Documentation</h4>
              <div className="text-xs text-ink bg-stone-50 rounded-lg p-3 whitespace-pre-wrap">
                {script.documentContent}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <h4 className="text-xs font-medium text-ink-muted mb-2">Rate this script</h4>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => { setUserRating(n); onRate(script.id, n); }}>
                  <Star size={16}
                    className={n <= userRating ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-stone-200">
          <button onClick={() => onLike(script.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              border border-stone-300 hover:border-red-300 hover:text-red-500 transition-colors">
            <Heart size={12} /> Like
          </button>
          <button onClick={() => onFavorite(script.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              border border-stone-300 hover:border-yellow-400 hover:text-yellow-600 transition-colors">
            <Bookmark size={12} /> Favorite
          </button>
        </div>
      </div>
    </div>
  );
}
