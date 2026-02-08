export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  taskId: string;
  role: MessageRole;
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
  createdAt: Date;
}
