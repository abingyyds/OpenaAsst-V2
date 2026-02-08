import { useState, useRef, useEffect } from 'react';
import { Play, Square, Trash2, Sparkles } from 'lucide-react';
import { ExecutionStream } from './ExecutionStream';
import type { ClusterEvent } from '../../hooks/useClusterExec';

interface AiTaskPanelProps {
  events: ClusterEvent[];
  isRunning: boolean;
  selectedCount: number;
  onExecute: (task: string) => void;
  onStop: () => void;
  onClear: () => void;
}

export function AiTaskPanel({
  events,
  isRunning,
  selectedCount,
  onExecute,
  onStop,
  onClear,
}: AiTaskPanelProps) {
  const [task, setTask] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = task.trim();
    if (!trimmed || isRunning) return;
    onExecute(trimmed);
    setTask('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Task input area */}
      <TaskInput
        task={task}
        setTask={setTask}
        inputRef={inputRef}
        isRunning={isRunning}
        selectedCount={selectedCount}
        onSubmit={handleSubmit}
        onStop={onStop}
        onClear={onClear}
        onKeyDown={handleKeyDown}
        hasEvents={events.length > 0}
      />

      {/* Execution stream */}
      <ExecutionStream events={events} isRunning={isRunning} />
    </div>
  );
}

function TaskInput({
  task, setTask, inputRef, isRunning, selectedCount,
  onSubmit, onStop, onClear, onKeyDown, hasEvents,
}: {
  task: string;
  setTask: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isRunning: boolean;
  selectedCount: number;
  onSubmit: () => void;
  onStop: () => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  hasEvents: boolean;
}) {
  return (
    <div className="border-b border-stone-200 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-accent" />
        <span className="text-sm font-heading font-semibold text-ink">
          AI Cluster Control
        </span>
      </div>

      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            selectedCount === 0
              ? 'Select servers first, then describe your task...'
              : `Describe task for ${selectedCount} server(s)... (Enter to send)`
          }
          disabled={isRunning}
          rows={2}
          className="flex-1 bg-surface border border-stone-200 rounded-lg px-3 py-2
            text-sm text-ink placeholder-ink-muted resize-none
            focus:outline-none focus:border-accent transition-colors
            disabled:opacity-50"
        />

        <div className="flex flex-col gap-1.5">
          {isRunning ? (
            <button
              onClick={onStop}
              className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs
                font-medium hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Square size={12} />
              Stop
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!task.trim() || selectedCount === 0}
              className="px-3 py-2 bg-accent text-white rounded-lg text-xs
                font-medium hover:bg-accent/90 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center gap-1.5"
            >
              <Play size={12} />
              Execute
            </button>
          )}

          {hasEvents && !isRunning && (
            <button
              onClick={onClear}
              className="px-3 py-2 border border-stone-200 text-ink-muted
                rounded-lg text-xs hover:text-ink transition-colors
                flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
