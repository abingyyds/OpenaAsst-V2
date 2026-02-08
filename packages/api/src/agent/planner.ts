import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { AgentMessage, ModelConfig, TaskPlan } from '@openasst/types';
import { nanoid } from 'nanoid';
import { findClaudeCodePath } from './claude-path.js';

const plans = new Map<string, TaskPlan>();

export function getPlan(planId: string): TaskPlan | undefined {
  return plans.get(planId);
}

export function deletePlan(planId: string): boolean {
  return plans.delete(planId);
}

const PLANNING_INSTRUCTION = `You are in planning mode. Do NOT execute any tools or take any actions.
Analyze the user's request and respond with ONLY a JSON object in one of these formats:

For simple questions that don't need execution:
{"type":"direct_answer","answer":"your answer here"}

For tasks that require execution:
{"type":"plan","goal":"what the user wants","steps":[{"description":"step description","tools":["tool names"]}],"notes":"any important notes"}

Respond with ONLY the JSON, no other text.`;

export async function* planAgent(
  prompt: string,
  workDir: string,
  modelConfig?: ModelConfig,
): AsyncGenerator<AgentMessage> {
  const sessionId = nanoid();
  yield { type: 'session', sessionId };

  const claudeCodePath = await findClaudeCodePath();

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
  };
  if (modelConfig?.apiKey) env.ANTHROPIC_AUTH_TOKEN = modelConfig.apiKey;
  if (modelConfig?.baseUrl) env.ANTHROPIC_BASE_URL = modelConfig.baseUrl;
  if (modelConfig?.model) env.ANTHROPIC_MODEL = modelConfig.model;

  const options: Options = {
    cwd: workDir,
    tools: { type: 'preset', preset: 'claude_code' },
    allowedTools: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    env,
    maxTurns: 1,
    pathToClaudeCodeExecutable: claudeCodePath,
  };

  if (modelConfig?.model) options.model = modelConfig.model;

  try {
    let fullText = '';
    for await (const msg of query({
      prompt: `${PLANNING_INSTRUCTION}\n\nUser request: ${prompt}`,
      options,
    })) {
      if (msg.type === 'assistant' && msg.message) {
        const message = msg.message as { content?: unknown[] };
        for (const block of message.content || []) {
          const b = block as Record<string, unknown>;
          if ('text' in b && typeof b.text === 'string') {
            fullText += b.text;
          }
        }
      }
    }

    const parsed = parsePlanResponse(fullText);
    if (parsed.type === 'direct_answer') {
      yield { type: 'direct_answer', content: parsed.answer, sessionId };
    } else {
      const plan: TaskPlan = {
        id: nanoid(),
        goal: parsed.goal,
        steps: parsed.steps,
        notes: parsed.notes,
      };
      plans.set(plan.id, plan);
      yield { type: 'plan', plan, sessionId };
    }

    yield { type: 'done', sessionId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', content: message, sessionId };
  }
}

function parsePlanResponse(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { type: 'direct_answer', answer: text };
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { type: 'direct_answer', answer: text };
  }
}
