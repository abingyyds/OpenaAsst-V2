import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessionList } from '../../hooks/useSessionList';
import { InputBar } from '../chat/InputBar';
import { MessageBubble } from '../chat/MessageBubble';
import { SessionSidebar } from '../chat/SessionSidebar';
import { WebPreview } from '../artifacts/WebPreview';
import { Globe } from 'lucide-react';

export function WebsitesView() {
  const {
    messages, isRunning, chatSessionId,
    sendMessage, stop, clear, loadSession,
  } = useChat({ sessionType: 'website' });
  const sessionList = useSessionList('website');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [workDir, setWorkDir] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (chatSessionId) {
      setWorkDir(`~/.openasst/websites/${chatSessionId}`);
    }
  }, [chatSessionId]);

  const handleNewChat = () => {
    clear();
    sessionList.select(null);
    sessionList.refresh();
  };

  const handleSelectSession = (id: string | null) => {
    if (!id) return;
    sessionList.select(id);
    loadSession(id);
  };

  return (
    <div className="flex h-full">
      <div className="w-[220px] flex-shrink-0">
        <SessionSidebar
          sessions={sessionList.sessions}
          activeSessionId={chatSessionId ?? sessionList.activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onDelete={(id) => {
            sessionList.remove(id);
            if (chatSessionId === id) clear();
          }}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 border-r border-stone-200">
        <Header onClear={handleNewChat} />
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
          onSend={(prompt) => {
            sendMessage(prompt);
            sessionList.refresh();
          }}
          onStop={stop}
          isRunning={isRunning}
        />
      </div>

      <div className="w-[420px] flex-shrink-0">
        <WebPreviewPanel workDir={workDir} taskId={chatSessionId || ''} />
      </div>
    </div>
  );
}

function WebPreviewPanel({ workDir, taskId }: { workDir: string; taskId: string }) {
  return (
    <div className="flex flex-col h-full border-l border-stone-200">
      <div className="flex items-center px-3 py-2 border-b border-stone-200">
        <Globe size={14} className="text-ink-muted mr-2" />
        <span className="text-xs font-semibold text-ink-muted">Live Preview</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {taskId ? (
          <WebPreview taskId={taskId} workDir={workDir} />
        ) : (
          <div className="flex items-center justify-center h-full text-ink-muted text-sm">
            Preview will appear here
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-accent" />
        <span className="font-heading font-semibold text-sm">Websites</span>
      </div>
      <button onClick={onClear} className="text-xs text-ink-muted hover:text-ink">
        New Website
      </button>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Globe size={48} className="text-stone-300 mb-4" />
      <h2 className="text-lg font-heading font-semibold mb-2">Website Generator</h2>
      <p className="text-sm text-ink-muted max-w-sm">
        Describe the website you want and see it come to life with real-time preview.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {['Personal portfolio', 'Landing page', 'Blog template'].map((s) => (
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
        <span>Building...</span>
      </div>
    </div>
  );
}
