import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

interface KnowledgeItem {
  id?: string;
  title: string;
  keywords: string[];
  solution: string;
  commands?: string[];
  createdAt?: string;
}

interface KnowledgeCategory {
  category: string;
  description?: string;
  items: KnowledgeItem[];
}

export function KnowledgeView() {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleDelete = async (category: string, itemId: string) => {
    await fetch(`${API_BASE_URL}/knowledge/${category}/${itemId}`, { method: 'DELETE' });
    fetchAll();
  };

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="flex flex-col h-full bg-page text-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-accent" />
          <span className="font-heading font-semibold text-sm">Knowledge Base</span>
          <span className="text-[10px] text-ink-muted ml-1">
            {totalItems} items in {categories.length} categories
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
            bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          <Plus size={14} />
          Add Knowledge
        </button>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-stone-200">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-stone-200
              rounded-lg focus:outline-none focus:border-accent text-ink placeholder-ink-muted"
          />
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <AddKnowledgeForm
          onAdded={() => { setShowForm(false); fetchAll(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-ink-muted text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading...
          </div>
        ) : categories.length === 0 ? (
          <EmptyState />
        ) : (
          <CategoryList
            categories={categories}
            searchQuery={searchQuery}
            expandedCats={expandedCats}
            onToggle={toggleCat}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Empty state ---- */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <BookOpen size={40} className="text-stone-300 mb-3" />
      <p className="text-sm text-ink-muted">
        No knowledge yet. Click <span className="font-semibold text-accent">Add Knowledge</span> to get started.
      </p>
    </div>
  );
}

/* ---- Category list ---- */
function CategoryList({
  categories, searchQuery, expandedCats, onToggle, onDelete,
}: {
  categories: KnowledgeCategory[];
  searchQuery: string;
  expandedCats: Set<string>;
  onToggle: (cat: string) => void;
  onDelete: (category: string, itemId: string) => void;
}) {
  const q = searchQuery.toLowerCase();

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const filtered = q
          ? cat.items.filter((item) =>
              item.title.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.toLowerCase().includes(q)) ||
              item.solution.toLowerCase().includes(q))
          : cat.items;

        if (q && filtered.length === 0) return null;
        const expanded = expandedCats.has(cat.category);

        return (
          <div key={cat.category} className="border border-stone-200 rounded-lg overflow-hidden">
            <button
              onClick={() => onToggle(cat.category)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface-hover
                text-left transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="text-sm font-medium text-ink flex-1">{cat.category}</span>
              <span className="text-[10px] text-ink-muted">{filtered.length} items</span>
            </button>
            {expanded && (
              <div className="divide-y divide-stone-100">
                {filtered.map((item, idx) => (
                  <KnowledgeItemRow
                    key={item.id || idx}
                    item={item}
                    category={cat.category}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Single item row ---- */
function KnowledgeItemRow({
  item, category, onDelete,
}: {
  item: KnowledgeItem;
  category: string;
  onDelete: (category: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 py-2.5 bg-page hover:bg-accent-light/30 transition-colors">
      <div className="flex items-start gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <p className="text-sm font-medium text-ink">{item.title}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.keywords.slice(0, 5).map((k) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-ink-muted border border-stone-200">
                {k}
              </span>
            ))}
          </div>
        </button>
        {item.id && (
          <button
            onClick={() => onDelete(category, item.id!)}
            className="text-ink-muted hover:text-red-500 transition-colors p-1"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-2 text-xs text-ink-secondary whitespace-pre-wrap bg-surface rounded-lg p-3 border border-stone-200">
          {item.solution}
          {item.commands && item.commands.length > 0 && (
            <div className="mt-2 space-y-1">
              {item.commands.map((cmd, i) => (
                <code key={i} className="block bg-stone-800 text-stone-200 rounded px-2 py-1 text-[11px]">
                  {cmd}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Add form ---- */
function AddKnowledgeForm({
  onAdded, onCancel,
}: {
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState('custom');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [solution, setSolution] = useState('');
  const [commands, setCommands] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !solution.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/knowledge/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          solution: solution.trim(),
          commands: commands.split('\n').map((c) => c.trim()).filter(Boolean),
        }),
      });
      onAdded();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="px-5 py-4 border-b border-stone-200 bg-accent-light/20">
      <h3 className="text-sm font-semibold text-ink mb-3">Add Knowledge Item</h3>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] text-ink-muted mb-1">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. docker, deployment"
              className="w-full px-3 py-1.5 text-sm bg-surface border border-stone-200
                rounded-lg focus:outline-none focus:border-accent text-ink"
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-[11px] text-ink-muted mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Install Docker on Ubuntu"
              className="w-full px-3 py-1.5 text-sm bg-surface border border-stone-200
                rounded-lg focus:outline-none focus:border-accent text-ink"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-ink-muted mb-1">Keywords (comma separated)</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="docker, install, ubuntu"
            className="w-full px-3 py-1.5 text-sm bg-surface border border-stone-200
              rounded-lg focus:outline-none focus:border-accent text-ink"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink-muted mb-1">Solution / Content *</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={3}
            placeholder="Describe the solution or knowledge content..."
            className="w-full px-3 py-1.5 text-sm bg-surface border border-stone-200
              rounded-lg focus:outline-none focus:border-accent text-ink resize-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink-muted mb-1">Commands (one per line, optional)</label>
          <textarea
            value={commands}
            onChange={(e) => setCommands(e.target.value)}
            rows={2}
            placeholder="apt install docker.io&#10;systemctl start docker"
            className="w-full px-3 py-1.5 text-sm bg-surface border border-stone-200
              rounded-lg focus:outline-none focus:border-accent text-ink font-mono resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg text-ink-secondary
              border border-stone-300 hover:border-stone-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !solution.trim()}
            className="px-4 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover
              text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
