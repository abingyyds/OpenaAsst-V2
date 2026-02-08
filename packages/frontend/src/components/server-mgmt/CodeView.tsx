import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { InputBar } from '../chat/InputBar';
import { MessageBubble } from '../chat/MessageBubble';
import { Code } from 'lucide-react';

interface CodeViewProps {
  deviceId: string;
}

export function CodeView({ deviceId }: CodeViewProps) {
  const workDir = `~/.openasst/workspaces/${deviceId}`;
  const {
    messages, isRunning,
    sendMessage, stop,
  } = useChat({ sessionType: 'code', deviceId, workDir });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
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
      <InputBar onSend={sendMessage} onStop={stop} isRunning={isRunning} />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Code size={36} className="text-stone-300 mb-3" />
      <p className="text-sm text-ink-muted">
        Describe what code you want to write.
      </p>
      <p className="text-xs text-ink-secondary mt-1">
        Powered by Claude Code Agent SDK
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
