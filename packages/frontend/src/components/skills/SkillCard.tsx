import { Terminal, Play, Trash2, Rocket } from 'lucide-react';
import type { Skill } from '../../hooks/useSkills';

interface SkillCardProps {
  skill: Skill;
  installed?: boolean;
  onInstall?: (skill: Skill) => void;
  onUninstall?: (id: string) => void;
  onExecute?: (skill: Skill) => void;
  onDeploy?: (skill: Skill) => void;
}

export function SkillCard({
  skill, installed, onInstall, onUninstall, onExecute, onDeploy,
}: SkillCardProps) {
  return (
    <div className="border border-stone-200 rounded-lg p-3 bg-surface hover:border-stone-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent shrink-0" />
          <span className="text-sm font-medium text-ink line-clamp-1">{skill.name}</span>
        </div>
        <span className="text-[10px] text-ink-muted shrink-0">v{skill.version}</span>
      </div>

      <p className="text-xs text-ink-muted mb-2 line-clamp-2">{skill.description}</p>

      <div className="text-[10px] text-ink-muted mb-3">
        {skill.commands.length} command{skill.commands.length !== 1 ? 's' : ''}
        {skill.author && <span> &middot; {skill.author}</span>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {installed ? (
          <>
            <button onClick={() => onExecute?.(skill)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px]
                bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              <Play size={10} /> Run
            </button>
            <button onClick={() => onDeploy?.(skill)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px]
                bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <Rocket size={10} /> Deploy
            </button>
            <button onClick={() => onUninstall?.(skill.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px]
                bg-stone-100 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors">
              <Trash2 size={10} /> Remove
            </button>
          </>
        ) : (
          <button onClick={() => onInstall?.(skill)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]
              bg-accent text-white hover:bg-accent-hover transition-colors">
            Install
          </button>
        )}
      </div>
    </div>
  );
}
