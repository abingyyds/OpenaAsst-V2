import { File, Folder } from 'lucide-react';
import type { FileEntry } from './ArtifactPanel';

interface FileTreeProps {
  files: FileEntry[];
  selected: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ files, selected, onSelect }: FileTreeProps) {
  return (
    <div className="w-48 border-r border-stone-200 overflow-y-auto py-1">
      {files.map((f) => (
        <button
          key={f.path}
          onClick={() => onSelect(f.path)}
          className={`w-full flex items-center gap-2 px-3 py-1.5
            text-xs hover:bg-surface-hover transition-colors ${
            selected === f.path
              ? 'bg-accent-light text-accent'
              : 'text-ink-secondary'
          }`}
        >
          {f.type === 'directory' ? (
            <Folder size={12} />
          ) : (
            <File size={12} />
          )}
          <span className="truncate">{f.name}</span>
        </button>
      ))}
    </div>
  );
}
