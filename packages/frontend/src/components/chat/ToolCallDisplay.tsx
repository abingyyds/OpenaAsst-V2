import { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
}

export function ToolCallDisplay({
  toolName,
  toolInput,
  toolOutput,
  isError,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-1 border border-stone-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2
          text-sm text-ink-secondary hover:bg-surface-hover transition-colors"
      >
        <Terminal size={14} className="text-accent" />
        <span className="font-mono text-xs">{toolName}</span>
        <span className="flex-1" />
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {expanded && (
        <div className="border-t border-stone-200">
          {toolInput && (
            <pre className="p-2 text-xs text-ink-muted overflow-x-auto">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          )}
          {toolOutput && (
            <pre
              className={`p-2 text-xs overflow-x-auto border-t border-stone-200 ${
                isError ? 'text-red-600 bg-red-50' : 'text-ink-secondary bg-surface'
              }`}
            >
              {toolOutput.slice(0, 2000)}
              {toolOutput.length > 2000 && '...'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
