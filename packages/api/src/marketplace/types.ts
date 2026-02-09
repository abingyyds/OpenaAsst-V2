export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'deployment' | 'maintenance' | 'monitoring' | 'docker' | 'custom';
  tags: string[];
  commands: ScriptCommand[];
  author: string;
  authorId?: string;
  isPublic: boolean;
  isOfficial: boolean;
  usageCount: number;
  rating: number;
  likeCount?: number;
  parameters?: ScriptParameter[];
  requirements?: {
    os?: string[];
    minMemory?: number;
    requiredPackages?: string[];
  };
  documentContent?: string;
  documentType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptCommand {
  step: number;
  description: string;
  command: string;
  condition?: { type: 'os' | 'package_exists' | 'custom'; value: string };
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
  expectedExitCode?: number;
  successPattern?: string;
}

export interface ScriptParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
}

export interface ScriptExecution {
  id: string;
  scriptId: string;
  serverId: string;
  userId: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
