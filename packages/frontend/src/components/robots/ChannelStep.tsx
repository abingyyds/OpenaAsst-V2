import type { ChannelConfig, ChannelType } from './types';

interface ChannelStepProps {
  channels: ChannelConfig[];
  onChange: (channels: ChannelConfig[]) => void;
}

const channelMeta: Record<ChannelType, { label: string; desc: string; tokenLabel: string }> = {
  telegram: { label: 'Telegram', desc: 'Telegram Bot API', tokenLabel: 'Bot Token' },
  discord: { label: 'Discord', desc: 'Discord Bot', tokenLabel: 'Bot Token' },
  slack: { label: 'Slack', desc: 'Slack App', tokenLabel: 'Bot Token' },
  whatsapp: { label: 'WhatsApp', desc: 'WhatsApp QR Link', tokenLabel: '' },
  wechat: { label: 'WeChat', desc: 'WeChat Official Account', tokenLabel: 'App ID' },
  feishu: { label: 'Feishu', desc: 'Feishu/Lark Bot', tokenLabel: 'App ID' },
  dingtalk: { label: 'DingTalk', desc: 'DingTalk Robot', tokenLabel: 'App Key' },
};

const allTypes: ChannelType[] = [
  'telegram', 'discord', 'slack',
  'whatsapp', 'wechat', 'feishu', 'dingtalk',
];

export function ChannelStep({ channels, onChange }: ChannelStepProps) {
  const toggle = (type: ChannelType) => {
    const exists = channels.find((c) => c.type === type);
    if (exists) {
      onChange(channels.map((c) =>
        c.type === type ? { ...c, enabled: !c.enabled } : c
      ));
    } else {
      onChange([...channels, {
        type, enabled: true, botToken: '',
        dmPolicy: 'open', allowFrom: ['*'], extra: {},
      }]);
    }
  };

  const updateToken = (type: ChannelType, token: string) => {
    onChange(channels.map((c) =>
      c.type === type ? { ...c, botToken: token } : c
    ));
  };

  return (
    <div className="max-w-lg mx-auto pt-4">
      <h2 className="text-xl font-bold text-primary mb-1">
        Configure Channels
      </h2>
      <p className="text-sm text-muted mb-4">
        Enable messaging channels for your bot
      </p>
      <div className="space-y-2">
        {allTypes.map((type) => {
          const ch = channels.find((c) => c.type === type);
          const meta = channelMeta[type];
          return (
            <ChannelRow
              key={type}
              label={meta.label}
              desc={meta.desc}
              tokenLabel={meta.tokenLabel}
              enabled={ch?.enabled || false}
              token={ch?.botToken || ''}
              onToggle={() => toggle(type)}
              onTokenChange={(t) => updateToken(type, t)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChannelRow({ label, desc, tokenLabel, enabled, token, onToggle, onTokenChange }: {
  label: string; desc: string; tokenLabel: string;
  enabled: boolean; token: string;
  onToggle: () => void; onTokenChange: (t: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-primary text-sm">{label}</span>
          <p className="text-xs text-muted">{desc}</p>
        </div>
        <button onClick={onToggle}
          className={`w-10 h-6 rounded-full transition-colors relative ${
            enabled ? 'bg-accent' : 'bg-stone-300'
          }`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      {enabled && tokenLabel && (
        <input type="text" value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder={tokenLabel}
          className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-white text-sm placeholder:text-muted focus:outline-none focus:border-accent" />
      )}
    </div>
  );
}