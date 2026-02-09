// --- Model Provider ---
export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  api: 'anthropic-messages' | 'openai-completions';
  models: ModelEntry[];
}

export interface ModelEntry {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
}

// --- Channel ---
export type ChannelType = 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'wechat' | 'feishu' | 'dingtalk';

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  botToken?: string;
  dmPolicy: 'open' | 'allowlist' | 'pairing' | 'disabled';
  allowFrom: string[];
  extra: Record<string, string>;
}

// --- Bot Status ---
export type BotStatus = 'stopped' | 'deploying' | 'running' | 'error';

// --- Deployed Bot ---
export interface DeployedBot {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  host: string;
  status: BotStatus;
  gatewayPort: number;
  gatewayToken?: string;
  providers: ModelProvider[];
  channels: ChannelConfig[];
  primaryModel: string;
  createdAt: string;
  lastCheckedAt?: string;
  error?: string;
}

// --- Wizard ---
export type WizardStep = 'server' | 'models' | 'channels' | 'deploy';
