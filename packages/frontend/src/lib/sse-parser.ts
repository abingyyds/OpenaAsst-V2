import type { AgentMessage } from '@openasst/types';

export function parseSSELine(line: string): AgentMessage | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as AgentMessage;
  } catch {
    return null;
  }
}
