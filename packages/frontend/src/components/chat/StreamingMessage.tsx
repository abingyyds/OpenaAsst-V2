import ReactMarkdown from 'react-markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
}

export function StreamingMessage({ content, isStreaming }: StreamingMessageProps) {
  return (
    <div className="prose prose-sm max-w-none prose-stone">
      <ReactMarkdown>{content}</ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
      )}
    </div>
  );
}
