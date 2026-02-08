import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessionList } from '../../hooks/useSessionList';
import { InputBar } from '../chat/InputBar';
import { MessageBubble } from '../chat/MessageBubble';
import { SessionSidebar } from '../chat/SessionSidebar';
import { DocumentPreview } from './DocumentPreview';
import { FileText } from 'lucide-react';

export function DocumentsView() {
  const {
    messages, isRunning, chatSessionId,
    sendMessage, stop, clear, loadSession,
  } = useChat({ sessionType: 'document' });
  const sessionList = useSessionList('document');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Early detection: watch tool_use messages for Write/create_file calls
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];

      // Early: detect tool_use with file_path in input (Write tool)
      if (m.type === 'tool_use' && m.toolInput) {
        const fp = (m.toolInput as Record<string, unknown>).file_path as string | undefined;
        if (fp && /\.(html|pdf|pptx?|xlsx?|csv|md|docx?)$/i.test(fp)) {
          setPreviewFile(fp);
          return;
        }
      }

      // Fallback: detect tool_result with file path in output
      if (m.type === 'tool_result' && m.toolOutput) {
        const match = m.toolOutput.match(
          /(?:wrote|created|saved|generated).*?([^\s]+\.(html|pdf|pptx?|xlsx?|csv|md|docx?))/i,
        );
        if (match) {
          setPreviewFile(match[1]);
          return;
        }
      }
    }
  }, [messages]);

  const handleNewChat = () => {
    clear();
    setPreviewFile(null);
    sessionList.select(null);
    sessionList.refresh();
  };

  const handleSelectSession = (id: string | null) => {
    if (!id) return;
    sessionList.select(id);
    loadSession(id);
    setPreviewFile(null);
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
        <DocumentPreview filePath={previewFile} sessionId={chatSessionId} streaming={isRunning} />
      </div>
    </div>
  );
}

function Header({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-accent" />
        <span className="font-heading font-semibold text-sm">Documents</span>
      </div>
      <button onClick={onClear} className="text-xs text-ink-muted hover:text-ink">
        New Document
      </button>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <FileText size={48} className="text-stone-300 mb-4" />
      <h2 className="text-lg font-heading font-semibold mb-2">Document Studio</h2>
      <p className="text-sm text-ink-muted max-w-sm">
        Generate PPT presentations, documents, spreadsheets, and more using natural language.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {['Create a PPT about AI', 'Generate a project report', 'Make a budget spreadsheet'].map((s) => (
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
        <span>Generating...</span>
      </div>
    </div>
  );
}
