export interface AgentRequest {
  prompt: string;
  taskId?: string;
  workDir?: string;
  deviceId?: string;
  conversation?: ConversationEntry[];
  phase?: 'run' | 'plan' | 'execute';
  planId?: string;
  modelConfig?: ModelConfig;
  sandboxConfig?: SandboxConfig;
  mcpConfig?: McpConfig;
  images?: string[];
}

export interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface SandboxConfig {
  enabled: boolean;
  provider?: string;
}

export interface McpConfig {
  enabled: boolean;
}
