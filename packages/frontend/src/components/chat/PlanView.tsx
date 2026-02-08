import type { TaskPlan } from '@openasst/types';
import { CheckCircle, XCircle, ListChecks } from 'lucide-react';

interface PlanViewProps {
  plan: TaskPlan;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanView({ plan, onApprove, onReject }: PlanViewProps) {
  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-surface">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks size={18} className="text-accent" />
        <span className="font-heading font-semibold text-sm">Execution Plan</span>
      </div>

      <p className="text-sm text-ink-secondary mb-3">{plan.goal}</p>

      <ol className="space-y-2 mb-4">
        {plan.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-accent font-mono shrink-0">
              {i + 1}.
            </span>
            <span className="text-ink">{step.description}</span>
          </li>
        ))}
      </ol>

      {plan.notes && (
        <p className="text-xs text-ink-muted mb-4">{plan.notes}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg
            bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
        >
          <CheckCircle size={14} />
          Execute
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg
            bg-stone-200 hover:bg-stone-300 text-ink-secondary text-sm transition-colors"
        >
          <XCircle size={14} />
          Cancel
        </button>
      </div>
    </div>
  );
}