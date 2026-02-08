import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, File, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

interface FileBrowserProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export function FileBrowser({ selectedPath, onSelect }: FileBrowserProps) {
  const [currentDir, setCurrentDir] = useState('~');
  const [items, setItems] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadDirectory = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/files/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dir }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.files || []);
        setCurrentDir(dir);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory('~');
  }, [loadDirectory]);

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'directory') {
      loadDirectory(item.path);
    } else {
      onSelect(item.path);
    }
  };

  const goUp = () => {
    const parent = currentDir.replace(/\/[^/]+$/, '') || '/';
    loadDirectory(parent);
  };

  return (
    <div className="flex flex-col h-full border-r border-stone-200">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-200">
        <FolderOpen size={14} className="text-accent" />
        <span className="text-xs font-semibold text-ink-muted">Files</span>
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-200">
        <button
          onClick={() => loadDirectory('~')}
          className="p-1 rounded hover:bg-surface-hover text-ink-muted hover:text-ink"
          title="Home"
        >
          <Home size={12} />
        </button>
        <button
          onClick={goUp}
          className="p-1 rounded hover:bg-surface-hover text-ink-muted hover:text-ink text-xs"
          title="Go up"
        >
          ..
        </button>
        <span className="text-[10px] text-ink-muted truncate flex-1">
          {currentDir}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-xs text-ink-muted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-3 text-xs text-ink-muted">Empty directory</div>
        ) : (
          items.map((item) => (
            <button
              key={item.path}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface-hover transition-colors ${
                selectedPath === item.path
                  ? 'bg-accent-light text-accent'
                  : 'text-ink'
              }`}
            >
              {item.type === 'directory' ? (
                <FolderOpen size={13} className="text-amber-500 shrink-0" />
              ) : (
                <File size={13} className="text-ink-muted shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
