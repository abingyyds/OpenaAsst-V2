import { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useSkills, type Skill } from '../../hooks/useSkills';
import { SkillCard } from './SkillCard';
import { DeploySkillModal } from './DeploySkillModal';

export function SkillsView() {
  const {
    skills, builtinSkills, loading,
    fetchSkills, fetchBuiltinSkills,
    installSkill, uninstallSkill,
    executeSkill, deploySkill,
  } = useSkills();

  const [deployTarget, setDeployTarget] = useState<Skill | null>(null);
  const [execResult, setExecResult] = useState<{ skillId: string; output: string } | null>(null);

  useEffect(() => {
    fetchSkills();
    fetchBuiltinSkills();
  }, [fetchSkills, fetchBuiltinSkills]);

  const handleInstall = async (skill: Skill) => {
    await installSkill(skill);
    fetchSkills();
  };

  const handleUninstall = async (id: string) => {
    await uninstallSkill(id);
    fetchSkills();
  };

  const handleExecute = async (skill: Skill) => {
    if (skill.commands.length === 0) return;
    const cmd = skill.commands[0];
    const result = await executeSkill(skill.id, cmd.name);
    setExecResult({ skillId: skill.id, output: result.output || 'Done' });
    setTimeout(() => setExecResult(null), 5000);
  };

  const installedIds = new Set(skills.map((s) => s.id));

  return (
    <div className="flex flex-col h-full bg-page text-ink">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-stone-200">
        <Zap size={18} className="text-accent" />
        <span className="font-heading font-semibold text-sm">Skills</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        ) : (
          <>
            {/* Installed Skills */}
            <Section title="Installed Skills" count={skills.length}>
              {skills.length === 0 ? (
                <p className="text-xs text-ink-muted">No skills installed yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skills.map((s) => (
                    <div key={s.id}>
                      <SkillCard
                        skill={s} installed
                        onUninstall={handleUninstall}
                        onExecute={handleExecute}
                        onDeploy={setDeployTarget}
                      />
                      {execResult?.skillId === s.id && (
                        <div className="mt-1 text-[10px] font-mono bg-stone-50 rounded p-1.5 text-ink-muted whitespace-pre-wrap">
                          {execResult.output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Builtin Skills */}
            <Section title="Built-in Skills" count={builtinSkills.length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {builtinSkills.map((s) => (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    installed={installedIds.has(s.id)}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                    onExecute={handleExecute}
                    onDeploy={setDeployTarget}
                  />
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Deploy Modal */}
      {deployTarget && (
        <DeploySkillModal
          skill={deployTarget}
          onClose={() => setDeployTarget(null)}
          onDeploy={deploySkill}
        />
      )}
    </div>
  );
}

function Section({ title, count, children }: {
  title: string; count: number; children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
        {title} ({count})
      </h3>
      {children}
    </div>
  );
}
