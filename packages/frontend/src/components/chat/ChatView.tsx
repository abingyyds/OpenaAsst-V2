import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSessionList } from '../../hooks/useSessionList';
import { InputBar } from './InputBar';
import { MessageBubble } from './MessageBubble';
import { PlanView } from './PlanView';
import { SessionSidebar } from './SessionSidebar';
import { Bot, AlertTriangle, Terminal, Copy, Check } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

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
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-api' | 'no-claude'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((data) => setStatus(data.claudeCode ? 'ready' : 'no-claude'))
      .catch(() => setStatus('no-api'));
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Bot size={48} className="text-accent mb-4" />
      <h1 className="text-2xl font-heading font-bold mb-2">OpenAsst</h1>

      {status === 'loading' && (
        <p className="text-ink-secondary text-sm">Checking environment...</p>
      )}

      {status === 'ready' && (
        <p className="text-ink-secondary text-sm max-w-md">
          Your AI assistant. Describe any task and I'll help you get it done.
        </p>
      )}

      {status === 'no-api' && (
        <div className="mt-2 max-w-lg text-left">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="font-semibold text-sm text-amber-800">API Server Not Running</span>
            </div>
            <p className="text-amber-700 text-xs mb-3">
              Chat requires the OpenAsst API server running locally.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-800">Start the API server:</p>
              <CodeBlock text="cd packages/api && npx tsx src/index.ts" onCopy={handleCopy} copied={copied} />
            </div>
          </div>
        </div>
      )}

      {status === 'no-claude' && (
        <div className="mt-2 max-w-lg text-left">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={16} className="text-amber-600" />
              <span className="font-semibold text-sm text-amber-800">Claude Code CLI Required</span>
            </div>
            <p className="text-amber-700 text-xs mb-3">
              Chat is powered by Claude Code. Install it to get started:
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">1. Install Claude Code</p>
                <CodeBlock text="npm install -g @anthropic-ai/claude-code" onCopy={handleCopy} copied={copied} />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">2. Set your Anthropic API key</p>
                <CodeBlock text="export ANTHROPIC_API_KEY=sk-ant-..." onCopy={handleCopy} copied={copied} />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">3. Restart the API server</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ text, onCopy, copied }: { text: string; onCopy: (t: string) => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-stone-800 rounded-lg px-3 py-2">
      <code className="text-[11px] text-orange-300 font-mono flex-1">{text}</code>
      <button onClick={() => onCopy(text)} className="shrink-0 text-stone-400 hover:text-white transition-colors">
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
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
