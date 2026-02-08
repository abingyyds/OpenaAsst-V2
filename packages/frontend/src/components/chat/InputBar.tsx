import { useState } from 'react';
import { Send, Square } from 'lucide-react';

interface InputBarProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isRunning: boolean;
}

export function InputBar({ onSend, onStop, isRunning }: InputBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-stone-200 p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to do..."
          rows={1}
          className="flex-1 resize-none bg-surface border border-stone-300
            rounded-xl px-4 py-3 text-ink placeholder-ink-muted
            focus:outline-none focus:border-accent
            min-h-[48px] max-h-[200px]"
        />
        {isRunning ? (
          <button
            onClick={onStop}
            className="p-3 rounded-xl bg-red-600 hover:bg-red-700
              text-white transition-colors"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="p-3 rounded-xl bg-accent hover:bg-accent-hover
              text-white transition-colors disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
