import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Loader2 } from 'lucide-react';
import { useMarketplace, type MarketScript } from '../../hooks/useMarketplace';
import { ScriptCard } from './ScriptCard';
import { ScriptDetailModal } from './ScriptDetailModal';
import { CreateScriptModal } from './CreateScriptModal';

const CATEGORIES = ['all', 'deployment', 'maintenance', 'monitoring', 'docker', 'custom'];

export function MarketplaceView() {
  const {
    scripts, loading, fetchScripts, searchScripts,
    createScript, likeScript, favoriteScript, rateScript,
  } = useMarketplace();

  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScript, setSelectedScript] = useState<MarketScript | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchScripts(category === 'all' ? undefined : category);
  }, [category, fetchScripts]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchScripts(searchQuery);
    } else {
      fetchScripts(category === 'all' ? undefined : category);
    }
  };

  const handleCreate = async (data: any) => {
    await createScript(data);
    setShowCreate(false);
    fetchScripts(category === 'all' ? undefined : category);
  };

  return (
    <div className="flex flex-col h-full bg-page text-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-accent" />
          <span className="font-heading font-semibold text-sm">Marketplace</span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
            bg-accent hover:bg-accent-hover text-white transition-colors">
          <Plus size={12} /> Create Script
        </button>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 border-b border-stone-200 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search scripts..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-stone-300
                rounded-lg text-ink placeholder-ink-muted
                focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                category === c
                  ? 'bg-accent text-white'
                  : 'bg-stone-100 text-ink-muted hover:bg-stone-200'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Script grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        ) : scripts.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-12">
            No scripts found
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scripts.map((s) => (
              <ScriptCard key={s.id} script={s} onSelect={setSelectedScript} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedScript && (
        <ScriptDetailModal
          script={selectedScript}
          onClose={() => setSelectedScript(null)}
          onLike={likeScript}
          onFavorite={favoriteScript}
          onRate={rateScript}
        />
      )}
      {showCreate && (
        <CreateScriptModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
