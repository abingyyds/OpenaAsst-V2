import { useEffect, useRef } from 'react';
import { Brain, Terminal, CheckCircle2, XCircle, Loader2, AlertTriangle, Send, Activity, UserCheck } from 'lucide-react';
import type { ClusterEvent } from '../../hooks/useClusterExec';

interface ExecutionStreamProps {
  events: ClusterEvent[];
  isRunning: boolean;
}

export function ExecutionStream({ events, isRunning }: ExecutionStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [events]);

  if (events.length === 0 && !isRunning) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
        Execution results will appear here.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {events.map((evt) => (
        <EventCard key={evt.id} event={evt} />
      ))}
      {isRunning && (
        <div className="flex items-center gap-2 text-accent text-sm py-2">
          <Loader2 size={14} className="animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: ClusterEvent }) {
  switch (event.type) {
    case 'start':
      return <StartCard data={event.data} />;
    case 'iteration_start':
      return <IterationCard data={event.data} />;
    case 'reasoning':
      return <ReasoningCard data={event.data} />;
    case 'command_start':
      return <CommandStartCard data={event.data} />;
    case 'command_output':
      return <CommandOutputCard data={event.data} />;
    case 'verification':
      return <VerificationCard data={event.data} />;
    case 'complete':
      return <CompleteCard data={event.data} />;
    case 'error':
      return <ErrorCard data={event.data} />;
    case 'task_dispatched':
      return <TaskDispatchedCard data={event.data} />;
    case 'agent_progress':
      return <AgentProgressCard data={event.data} />;
    case 'agent_complete':
      return <AgentCompleteCard data={event.data} />;
    default:
      return null;
  }
}

function StartCard({ data }: { data: Record<string, unknown> }) {
  const targets = (data.targets as string[]) || [];
  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
      <div className="text-sm font-semibold text-accent">{String(data.message || '')}</div>
      <div className="text-xs text-ink-muted mt-1">
        Targets: {targets.join(', ')}
      </div>
    </div>
  );
}

function IterationCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-secondary font-medium pt-2 border-t border-stone-200">
      <span className="bg-stone-200 text-ink-secondary rounded-full px-2 py-0.5">
        Iteration {String(data.iteration || '')}
      </span>
    </div>
  );
}

function ReasoningCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="bg-surface border border-stone-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary mb-1">
        <Brain size={12} />
        AI Reasoning
      </div>
      <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
        {String(data.reasoning || '')}
      </p>
    </div>
  );
}

function CommandStartCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex items-start gap-2">
      <Terminal size={14} className="text-accent mt-0.5 shrink-0" />
      <div>
        <code className="text-xs font-mono bg-stone-800 text-stone-200 rounded px-2 py-0.5">
          {String(data.command || '')}
        </code>
        {data.explanation ? (
          <p className="text-[11px] text-ink-muted mt-0.5">{String(data.explanation)}</p>
        ) : null}
      </div>
    </div>
  );
}

function CommandOutputCard({ data }: { data: Record<string, unknown> }) {
  const results = (data.results as Array<Record<string, unknown>>) || [];
  return (
    <div className="ml-5 space-y-1">
      {results.map((r, i) => {
        const name = String(r.agentName || r.name || `server-${i + 1}`);
        const output = String(r.output || r.error || '(no output)').slice(0, 500);
        const exitCode = r.exitCode as number | undefined;
        const ok = exitCode === 0;
        return (
          <div key={i} className="bg-stone-900 rounded px-2.5 py-1.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 mb-0.5">
              {ok ? (
                <CheckCircle2 size={10} className="text-green-400" />
              ) : (
                <XCircle size={10} className="text-red-400" />
              )}
              <span className="text-stone-400">{name}</span>
              <span className="text-stone-500 ml-auto">exit={String(exitCode ?? '?')}</span>
            </div>
            <pre className="text-stone-300 whitespace-pre-wrap break-all leading-relaxed">
              {output}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function VerificationCard({ data }: { data: Record<string, unknown> }) {
  const success = !!data.success;
  return (
    <div className={`border rounded-lg px-3 py-2 ${
      success
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {success ? (
          <><CheckCircle2 size={12} className="text-green-600" /> Verification Passed</>
        ) : (
          <><XCircle size={12} className="text-red-600" /> Verification Failed</>
        )}
      </div>
    </div>
  );
}

function CompleteCard({ data }: { data: Record<string, unknown> }) {
  const success = !!data.success;
  return (
    <div className={`border rounded-lg px-3 py-2 ${
      success
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        {success ? (
          <><CheckCircle2 size={14} className="text-green-600" /> Task Completed</>
        ) : (
          <><AlertTriangle size={14} className="text-amber-600" /> {String(data.message || 'Max iterations reached')}</>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <XCircle size={12} />
        Error
      </div>
      <p className="text-xs text-red-600 mt-1">{String(data.message || 'Unknown error')}</p>
    </div>
  );
}

function TaskDispatchedCard({ data }: { data: Record<string, unknown> }) {
  const targets = (data.targets as string[]) || [];
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
        <Send size={12} />
        Task Dispatched
      </div>
      <p className="text-xs text-blue-600">{String(data.message || '')}</p>
      {targets.length > 0 && (
        <div className="text-[11px] text-blue-500 mt-1">
          Agents: {targets.join(', ')}
        </div>
      )}
    </div>
  );
}

function AgentProgressCard({ data }: { data: Record<string, unknown> }) {
  const agentName = String(data.agentName || data.name || 'agent');
  const phase = String(data.phase || '');
  const step = data.step as number | undefined;
  const totalSteps = data.totalSteps as number | undefined;
  const description = String(data.description || '');

  return (
    <div className="bg-surface border border-stone-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary mb-1">
        <Activity size={12} className="text-accent" />
        <span>{agentName}</span>
        {step != null && totalSteps != null && (
          <span className="ml-auto text-[10px] text-ink-muted">
            Step {step}/{totalSteps}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {phase === 'planning' && <Loader2 size={10} className="animate-spin" />}
        {phase === 'step_start' && <Loader2 size={10} className="animate-spin" />}
        {phase === 'step_complete' && <CheckCircle2 size={10} className="text-green-500" />}
        {phase === 'step_failed' && <XCircle size={10} className="text-red-500" />}
        <span>{description || phase}</span>
      </div>
    </div>
  );
}

function AgentCompleteCard({ data }: { data: Record<string, unknown> }) {
  const agentName = String(data.agentName || data.name || 'agent');
  const success = !!data.success;
  const summary = String(data.summary || data.message || '');

  return (
    <div className={`border rounded-lg px-3 py-2 ${
      success
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {success ? (
          <><UserCheck size={12} className="text-green-600" /> {agentName} — Completed</>
        ) : (
          <><XCircle size={12} className="text-red-600" /> {agentName} — Failed</>
        )}
      </div>
      {summary && (
        <p className={`text-[11px] mt-1 ${success ? 'text-green-600' : 'text-red-600'}`}>
          {summary}
        </p>
      )}
    </div>
  );
}
