import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { AgentMessage, ModelConfig } from '@openasst/types';
import { nanoid } from 'nanoid';
import { findClaudeCodePath } from './claude-path.js';

const ALLOWED_TOOLS = [
  'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash',
  'WebSearch', 'WebFetch', 'Task', 'TodoWrite',
];

interface AgentSession {
  id: string;
  abortController: AbortController;
  phase: 'idle' | 'planning' | 'executing';
}

const sessions = new Map<string, AgentSession>();

export function stopSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.abortController.abort();
    sessions.delete(sessionId);
    return true;
  }
  return false;
}

export async function* runAgent(
  prompt: string,
  workDir: string,
  modelConfig?: ModelConfig,
): AsyncGenerator<AgentMessage> {
  const session: AgentSession = {
    id: nanoid(),
    abortController: new AbortController(),
    phase: 'executing',
  };
  sessions.set(session.id, session);

  yield { type: 'session', sessionId: session.id };

  const claudeCodePath = await findClaudeCodePath();

  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (modelConfig?.apiKey) {
    env.ANTHROPIC_AUTH_TOKEN = modelConfig.apiKey;
  }
  if (modelConfig?.baseUrl) {
    env.ANTHROPIC_BASE_URL = modelConfig.baseUrl;
  }
  if (modelConfig?.model) {
    env.ANTHROPIC_MODEL = modelConfig.model;
  }

  const queryOptions: Options = {
    cwd: workDir,
    tools: { type: 'preset', preset: 'claude_code' },
    allowedTools: ALLOWED_TOOLS,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    abortController: session.abortController,
    env,
    maxTurns: 200,
    pathToClaudeCodeExecutable: claudeCodePath,
  };

  if (modelConfig?.model) {
    queryOptions.model = modelConfig.model;
  }

  try {
    const sentTextHashes = new Set<string>();
    const sentToolIds = new Set<string>();

    for await (const msg of query({ prompt, options: queryOptions })) {
      if (session.abortController.signal.aborted) break;

      yield* processMessage(msg, session.id, sentTextHashes, sentToolIds);
    }

    yield { type: 'done', sessionId: session.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', content: message, sessionId: session.id };
  } finally {
    sessions.delete(session.id);
  }
}

function hashText(text: string): string {
  return text.slice(0, 100);
}

function* processMessage(
  msg: Record<string, unknown>,
  sessionId: string,
  sentTextHashes: Set<string>,
  sentToolIds: Set<string>,
): Generator<AgentMessage> {
  if (msg.type === 'assistant' && msg.message) {
    const message = msg.message as { content?: unknown[] };
    if (!message.content) return;

    for (const block of message.content) {
      const b = block as Record<string, unknown>;
      if ('text' in b && typeof b.text === 'string') {
        const hash = hashText(b.text);
        if (sentTextHashes.has(hash)) continue;
        sentTextHashes.add(hash);
        yield { type: 'text', content: b.text, sessionId };
      }
      if ('name' in b && typeof b.name === 'string') {
        const id = b.id as string;
        if (sentToolIds.has(id)) continue;
        sentToolIds.add(id);
        yield {
          type: 'tool_use',
          toolUseId: id,
          toolName: b.name,
          toolInput: b.input as Record<string, unknown>,
          sessionId,
        };
      }
    }
  }

  if (msg.type === 'user' && msg.message) {
    const message = msg.message as { content?: unknown[] };
    if (!message.content) return;

    for (const block of message.content) {
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_result') {
        const content = Array.isArray(b.content)
          ? (b.content as { text?: string }[]).map((c) => c.text || '').join('\n')
          : String(b.content || '');
        yield {
          type: 'tool_result',
          toolUseId: b.tool_use_id as string,
          toolOutput: content,
          isError: b.is_error as boolean,
          sessionId,
        };
      }
    }
  }

  if (msg.type === 'result') {
    const result = msg as { cost?: number; duration?: number };
    yield {
      type: 'result',
      cost: result.cost,
      duration: result.duration,
      sessionId,
    };
  }
}
