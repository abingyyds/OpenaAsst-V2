// Agent message types (SSE events from API to frontend)
export type AgentMessageType =
  | 'session'
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'result'
  | 'error'
  | 'done'
  | 'plan'
  | 'direct_answer';

export interface AgentMessage {
  type: AgentMessageType;
  sessionId?: string;
  content?: string;
  toolUseId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
  cost?: number;
  duration?: number;
  plan?: TaskPlan;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskPlanStep[];
  notes?: string;
}

export interface TaskPlanStep {
  description: string;
  tools?: string[];
}
