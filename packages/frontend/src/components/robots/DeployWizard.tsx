import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, Rocket } from 'lucide-react';
import type { ModelProvider, ChannelConfig, WizardStep } from './types';
import { ServerStep } from './ServerStep';
import { ModelStep } from './ModelStep';
import { ChannelStep } from './ChannelStep';
import { DeployStep } from './DeployStep';

interface DeployWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const steps: { key: WizardStep; label: string }[] = [
  { key: 'server', label: 'Server' },
  { key: 'models', label: 'Models' },
  { key: 'channels', label: 'Channels' },
  { key: 'deploy', label: 'Deploy' },
];

export function DeployWizard({ onComplete, onCancel }: DeployWizardProps) {
  const [step, setStep] = useState<WizardStep>('server');
  const [serverId, setServerId] = useState<string | null>(null);
  const [botName, setBotName] = useState('My Bot');
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [primaryModel, setPrimaryModel] = useState('');
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [deploying, setDeploying] = useState(false);

  const idx = steps.findIndex((s) => s.key === step);

  const canNext = () => {
    if (step === 'server') return !!serverId;
    if (step === 'models') return providers.length > 0;
    return true;
  };

  const goNext = () => {
    if (step === 'channels') { setDeploying(true); setStep('deploy'); return; }
    if (idx < steps.length - 1) setStep(steps[idx + 1].key);
  };
  const goBack = () => {
    if (idx > 0) setStep(steps[idx - 1].key);
  };

  const buildConfig = () => {
    const provObj: Record<string, any> = {};
    for (const p of providers) {
      provObj[p.id] = {
        baseUrl: p.baseUrl, apiKey: p.apiKey,
        api: p.api, models: p.models,
      };
    }
    const chanObj: Record<string, any> = {};
    for (const ch of channels) {
      if (!ch.enabled) continue;
      chanObj[ch.type] = {
        enabled: true, dmPolicy: ch.dmPolicy,
        allowFrom: ch.allowFrom,
        ...(ch.botToken ? { botToken: ch.botToken } : {}),
      };
    }
    return {
      providers: provObj, channels: chanObj,
      primaryModel, gatewayPort: 18789,
    };
  };

  return (
    <div className="h-full flex flex-col">
      <StepBar steps={steps} currentIdx={idx} />
      <div className="flex-1 overflow-y-auto p-6">
        {step === 'server' && (
          <ServerStep selectedId={serverId} onSelect={setServerId}
            botName={botName} onBotNameChange={setBotName} />
        )}
        {step === 'models' && (
          <ModelStep providers={providers} primaryModel={primaryModel}
            onChange={(p, pm) => { setProviders(p); setPrimaryModel(pm); }} />
        )}
        {step === 'channels' && (
          <ChannelStep channels={channels} onChange={setChannels} />
        )}
        {step === 'deploy' && deploying && (
          <DeployStep deviceId={serverId!} name={botName}
            config={buildConfig()}
            onDone={(_botId, _ok) => onComplete()} />
        )}
      </div>

      {step !== 'deploy' && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button onClick={idx === 0 ? onCancel : goBack}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-secondary hover:text-primary">
            <ArrowLeft size={16} />
            {idx === 0 ? 'Cancel' : 'Back'}
          </button>
          <button onClick={goNext} disabled={!canNext()}
            className="flex items-center gap-1.5 px-5 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed">
            {step === 'channels' ? (
              <><Rocket size={16} /> Deploy</>
            ) : (
              <>Next <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function StepBar({ steps: sl, currentIdx }: { steps: typeof steps; currentIdx: number }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-border">
      {sl.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            i < currentIdx ? 'bg-green-500 text-white'
              : i === currentIdx ? 'bg-accent text-white'
                : 'bg-tertiary text-muted'
          }`}>
            {i < currentIdx ? <Check size={14} /> : i + 1}
          </div>
          <span className={`text-sm ${i === currentIdx ? 'font-semibold text-primary' : 'text-muted'}`}>
            {s.label}
          </span>
          {i < sl.length - 1 && <div className="w-8 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}