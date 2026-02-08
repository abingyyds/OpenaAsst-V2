import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessionList } from '../../hooks/useSessionList';
import { InputBar } from '../chat/InputBar';
import { MessageBubble } from '../chat/MessageBubble';
import { PlanView } from '../chat/PlanView';
import { SessionSidebar } from '../chat/SessionSidebar';
import { ArtifactPanel } from '../artifacts/ArtifactPanel';
import { Code } from 'lucide-react';

export function CodeProjectView() {
  const {
    messages, isRunning, phase, currentPlan, chatSessionId,
    sendMessage, stop, clear, approvePlan, rejectPlan, loadSession,
  } = useChat({ sessionType: 'code' });
  const sessionList = useSessionList('code');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [workDir, setWorkDir] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Update workDir when session changes
  useEffect(() => {
    if (chatSessionId) {
      setWorkDir(`~/.openasst/projects/${chatSessionId}`);
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

      <div className="flex-1 flex flex-col min-w-0">
        <Header onClear={handleNewChat} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <Placeholder />
          ) : (
            <div className="py-4 space-y-1">
              {messages.map((msg) =>
                msg.type === 'plan' && msg.plan ? (
                  <div key={msg.id} className="px-4 py-2 max-w-3xl mx-auto">
                    <PlanView
                      plan={msg.plan}
                      onApprove={approvePlan}
                      onReject={rejectPlan}
                    />
                  </div>
                ) : (
                  <MessageBubble key={msg.id} message={msg} />
                ),
              )}
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

      <div className="w-[380px] shrink-0">
        <ArtifactPanel workDir={workDir} taskId="" files={[]} />
      </div>
    </div>
  );
}

function Header({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
      <div className="flex items-center gap-2">
        <Code size={18} className="text-accent" />
        <span className="font-heading font-semibold text-sm">Code Projects</span>
      </div>
      <button onClick={onClear} className="text-xs text-ink-muted hover:text-ink">
        New Project
      </button>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Code size={48} className="text-stone-300 mb-4" />
      <h2 className="text-lg font-heading font-semibold mb-2">Code Projects</h2>
      <p className="text-sm text-ink-muted max-w-sm">
        Describe what you want to build. The AI agent will write code, create files, and run commands.
      </p>
      <p className="text-xs text-ink-secondary mt-2">
        Powered by Claude Agent SDK
      </p>
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
        <span>Coding...</span>
      </div>
    </div>
  );
}
