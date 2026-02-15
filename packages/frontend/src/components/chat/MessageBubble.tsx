import type { ChatMessageUI } from '../../hooks/useChat';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
  message: ChatMessageUI;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.type === 'tool_use') {
    return <ToolUseMessage message={message} />;
  }
  if (message.type === 'tool_result') {
    return <ToolResultMessage message={message} />;
  }
  if (message.type === 'error') {
    return <ErrorMessage message={message} />;
  }
  return <TextMessage message={message} />;
}

function ToolUseMessage({ message }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-2 max-w-3xl mx-auto">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink"
      >
        <Terminal size={14} />
        <span className="font-mono">{message.toolName}</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {expanded && message.toolInput && (
        <pre className="mt-1 p-2 bg-surface rounded text-xs text-ink-secondary overflow-x-auto">
          {JSON.stringify(message.toolInput, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ToolResultMessage({ message }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const output = message.toolOutput || '';
  const preview = output.slice(0, 120);
  const hasMore = output.length > 120;

  return (
    <div className="px-4 py-1 max-w-3xl mx-auto">
      <div
        className={`text-xs font-mono p-2 rounded ${
          message.isError
            ? 'bg-red-50 text-red-600'
            : 'bg-stone-100 text-ink-secondary'
        }`}
      >
        {expanded ? output : preview}
        {hasMore && !expanded && '...'}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-accent hover:underline"
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: MessageBubbleProps) {
  const isClaudeCodeError = message.content?.includes('Claude Code not found');
  return (
    <div className="px-4 py-3 max-w-3xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
        {message.content}
        {isClaudeCodeError && (
          <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-500 space-y-1">
            <p>Chat requires Claude Code CLI installed locally:</p>
            <code className="block bg-red-100 rounded px-2 py-1 font-mono">
              npm install -g @anthropic-ai/claude-code
            </code>
            <p>Then restart the API server.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TextMessage({ message }: MessageBubbleProps) {
  return (
    <div className="px-4 py-3 max-w-3xl mx-auto">
      <div className="prose prose-sm max-w-none prose-stone">
        <ReactMarkdown>{message.content || ''}</ReactMarkdown>
      </div>
    </div>
  );
}
