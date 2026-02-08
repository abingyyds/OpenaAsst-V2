import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessionList } from '../../hooks/useSessionList';
import { InputBar } from './InputBar';
import { MessageBubble } from './MessageBubble';
import { PlanView } from './PlanView';
import { SessionSidebar } from './SessionSidebar';
import { Bot } from 'lucide-react';

export function ChatView() {
  const {
    messages, isRunning, phase, currentPlan, chatSessionId,
    sendMessage, stop, clear, approvePlan, rejectPlan, loadSession,
  } = useChat();
  const sessionList = useSessionList('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

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
            <WelcomeScreen />
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
              {isRunning && <ThinkingIndicator />}
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
    </div>
  );
}

function Header({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
      <div className="flex items-center gap-2">
        <Bot size={20} className="text-accent" />
        <span className="font-heading font-semibold text-sm">OpenAsst</span>
      </div>
      <button
        onClick={onClear}
        className="text-xs text-ink-muted hover:text-ink"
      >
        New Chat
      </button>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Bot size={48} className="text-accent mb-4" />
      <h1 className="text-2xl font-heading font-bold mb-2">OpenAsst</h1>
      <p className="text-ink-secondary text-sm max-w-md">
        Your AI assistant. Describe any task and I'll help you get it done.
      </p>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="px-4 py-2 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-ink-secondary text-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
        <span>Thinking...</span>
      </div>
    </div>
  );
}
