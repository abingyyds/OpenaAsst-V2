import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { InputBar } from '../chat/InputBar';
import { MessageBubble } from '../chat/MessageBubble';
import { FileBrowser } from './FileBrowser';
import { FolderOpen } from 'lucide-react';

export function FilesView() {
  const {
    messages, isRunning,
    sendMessage, stop,
  } = useChat({ sessionType: 'files' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return (
    <div className="flex h-full">
      <div className="w-[260px] flex-shrink-0">
        <FileBrowser
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 border-r border-stone-200">
        <Header />
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <Placeholder />
          ) : (
            <div className="py-4 space-y-1">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isRunning && <Thinking />}
            </div>
          )}
        </div>
        <InputBar
          onSend={sendMessage}
          onStop={stop}
          isRunning={isRunning}
        />
      </div>

      <div className="w-[380px] flex-shrink-0">
        <FilePreviewPanel filePath={selectedPath} />
      </div>
    </div>
  );
}

function FilePreviewPanel({ filePath }: { filePath: string | null }) {
  return (
    <div className="flex flex-col h-full border-l border-stone-200">
      <div className="flex items-center px-3 py-2 border-b border-stone-200">
        <span className="text-xs font-semibold text-ink-muted">Preview</span>
      </div>
      <div className="flex-1 overflow-auto">
        {filePath ? (
          <div className="p-4 text-sm text-ink-secondary">
            <p className="text-xs text-ink-muted mb-2">{filePath}</p>
            <p className="text-ink-muted">File preview will be shown here.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-ink-muted text-sm">
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-stone-200">
      <FolderOpen size={18} className="text-accent mr-2" />
      <span className="font-heading font-semibold text-sm">File Manager</span>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <FolderOpen size={48} className="text-stone-300 mb-4" />
      <h2 className="text-lg font-heading font-semibold mb-2">AI File Manager</h2>
      <p className="text-sm text-ink-muted max-w-sm">
        Browse files on the left, or ask the AI to organize, rename, move, or process your files.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {['Organize my downloads', 'Find duplicate files', 'Rename photos by date'].map((s) => (
          <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-surface text-ink-muted border border-stone-200">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="px-4 py-2 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-ink-secondary text-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
        <span>Processing...</span>
      </div>
    </div>
  );
}
