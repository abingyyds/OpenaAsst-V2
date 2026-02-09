import { WSHub } from './ws-hub.js';
import { APIProvider } from '../server-mgmt/api-provider.js';

export interface AiExecEvent {
  type:
    | 'start'
    | 'iteration_start'
    | 'reasoning'
    | 'command_start'
    | 'command_output'
    | 'verification'
    | 'complete'
    | 'error'
    | 'task_dispatched'
    | 'agent_progress'
    | 'agent_complete';
  data: Record<string, unknown>;
}

interface ExecHistory {
  command: string;
  results: unknown[];
  iteration: number;
}

const MAX_ITERATIONS = 20;

export async function* aiAutoExecute(
  hub: WSHub,
  task: string,
  targetNames: string[],
): AsyncGenerator<AiExecEvent> {
  const apiProvider = new APIProvider();
  const endpoint = apiProvider.getAPIEndpoint();

  if (!endpoint) {
    yield { type: 'error', data: { message: 'No API key configured. Please set up in Settings.' } };
    return;
  }

  if (!hub.isRunning()) {
    yield { type: 'error', data: { message: 'Hub is not running. Start the hub first.' } };
    return;
  }

  const onlineAgents = hub.getOnlineAgents().map((a) => a.name);
  const targets = targetNames.length > 0
    ? targetNames.filter((n) => onlineAgents.includes(n))
    : onlineAgents;

  if (targets.length === 0) {
    yield { type: 'error', data: { message: 'No online agents available.' } };
    return;
  }

  yield {
    type: 'start',
    data: {
      task,
      targets,
      message: `Starting AI execution on ${targets.length} server(s)`,
    },
  };

  // Check if targets have smart agent capability — use task dispatch mode
  if (hub.hasSmartAgents(targets)) {
    yield* smartAgentExecute(hub, task, targets);
    return;
  }

  // Fallback: legacy desktop-side AI loop for dumb agents
  const history: ExecHistory[] = [];
  let completed = false;

  for (let iteration = 1; iteration <= MAX_ITERATIONS && !completed; iteration++) {
    yield {
      type: 'iteration_start',
      data: { iteration, message: `Iteration ${iteration}: Analyzing...` },
    };

    // Build prompt with context
    const prompt = buildPrompt(task, targets, history, iteration);

    // Call AI
    let plan: AiPlan;
    try {
      plan = await callAI(endpoint, prompt);
    } catch (err) {
      yield {
        type: 'error',
        data: { message: `AI call failed: ${err instanceof Error ? err.message : String(err)}` },
      };
      return;
    }

    yield {
      type: 'reasoning',
      data: { iteration, reasoning: plan.reasoning },
    };

    // Execute each command
    for (const cmd of plan.commands) {
      yield {
        type: 'command_start',
        data: { command: cmd.command, explanation: cmd.explanation },
      };

      let results: unknown[];
      try {
        results = await hub.broadcast(cmd.command, targets, 60000);
      } catch (err) {
        results = [{ error: String(err) }];
      }

      history.push({ command: cmd.command, results, iteration });

      yield {
        type: 'command_output',
        data: {
          command: cmd.command,
          results,
          explanation: cmd.explanation,
        },
      };
    }

    // Check if AI says task is done
    if (plan.is_complete) {
      // Run verification if provided
      if (plan.verification_command) {
        yield {
          type: 'command_start',
          data: { command: plan.verification_command, explanation: 'Verifying task completion' },
        };

        let verifyResults: unknown[];
        try {
          verifyResults = await hub.broadcast(plan.verification_command, targets, 30000);
        } catch {
          verifyResults = [];
        }

        const allSuccess = verifyResults.every(
          (r: any) => r && r.exitCode === 0,
        );

        yield {
          type: 'verification',
          data: {
            command: plan.verification_command,
            results: verifyResults,
            success: allSuccess,
          },
        };

        if (allSuccess) {
          completed = true;
        }
        // If verification fails, continue iterating
      } else {
        completed = true;
      }
    }
  }

  yield {
    type: 'complete',
    data: {
      success: completed,
      iterations: history.length > 0 ? history[history.length - 1].iteration : 0,
      message: completed
        ? 'Task completed successfully'
        : `Reached max iterations (${MAX_ITERATIONS})`,
    },
  };
}

// --- Smart Agent task dispatch mode ---

async function* smartAgentExecute(
  hub: WSHub,
  task: string,
  targets: string[],
): AsyncGenerator<AiExecEvent> {
  yield {
    type: 'task_dispatched',
    data: {
      task,
      targets,
      message: `Task dispatched to ${targets.length} smart agent(s)`,
    },
  };

  const progressEvents: AiExecEvent[] = [];

  const onProgress = (event: unknown) => {
    const evt = event as Record<string, unknown>;
    progressEvents.push({
      type: 'agent_progress',
      data: evt,
    });
  };

  try {
    const results = await hub.dispatchTask(task, targets, 300000, onProgress);

    // Yield all collected progress events
    for (const evt of progressEvents) {
      yield evt;
    }

    // Yield individual agent results
    for (const result of results) {
      const r = result as Record<string, unknown>;
      yield {
        type: 'agent_complete',
        data: r,
      };
    }

    const allSuccess = (results as any[]).every((r: any) => r?.success);

    yield {
      type: 'complete',
      data: {
        success: allSuccess,
        message: allSuccess
          ? 'All agents completed successfully'
          : 'Some agents failed',
        results,
      },
    };
  } catch (err) {
    yield {
      type: 'error',
      data: {
        message: `Task dispatch failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

// --- AI Plan types ---

interface AiCommand {
  command: string;
  explanation: string;
}

interface AiPlan {
  reasoning: string;
  commands: AiCommand[];
  is_complete: boolean;
  verification_command?: string;
}

// --- Prompt builder ---

function buildPrompt(
  task: string,
  targets: string[],
  history: ExecHistory[],
  iteration: number,
): string {
  let prompt = `You are an AI DevOps agent managing ${targets.length} Linux server(s): ${targets.join(', ')}.

USER TASK: ${task}

`;

  if (history.length > 0) {
    prompt += 'EXECUTION HISTORY:\n';
    for (const h of history) {
      prompt += `\n[Iteration ${h.iteration}] Command: ${h.command}\n`;
      for (const r of h.results) {
        const res = r as any;
        const name = res?.agentName || 'unknown';
        const output = res?.output || res?.error || '(no output)';
        const code = res?.exitCode ?? '?';
        prompt += `  ${name}: exit=${code}, output=${String(output).slice(0, 500)}\n`;
      }
    }
    prompt += '\n';
  }

  if (iteration === 1) {
    prompt += 'This is the FIRST iteration. Start by checking the current system state.\n';
  } else {
    prompt += `This is iteration ${iteration}. Review the history above and continue the task.\n`;
  }

  prompt += `
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "reasoning": "Your analysis of the situation and what to do next",
  "commands": [
    { "command": "shell command to execute", "explanation": "why this command" }
  ],
  "is_complete": false,
  "verification_command": "optional command to verify completion"
}

Rules:
- Commands run on ALL target servers simultaneously via broadcast.
- Keep commands simple and idempotent.
- Set is_complete=true only when the task is fully done.
- If is_complete=true, provide a verification_command to confirm.
- Maximum 3 commands per iteration.
- If a previous command failed, try a different approach.`;

  return prompt;
}

// --- AI caller ---

async function callAI(
  endpoint: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
): Promise<AiPlan> {
  const isAnthropic =
    endpoint.baseUrl.includes('anthropic.com') ||
    endpoint.model.startsWith('claude');

  let plan: AiPlan;

  if (isAnthropic) {
    plan = await callAnthropic(endpoint, prompt);
  } else {
    plan = await callOpenAICompat(endpoint, prompt);
  }

  return plan;
}

async function callAnthropic(
  endpoint: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
): Promise<AiPlan> {
  const res = await fetch(`${endpoint.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': endpoint.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: endpoint.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return parseAiResponse(text);
}

async function callOpenAICompat(
  endpoint: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
): Promise<AiPlan> {
  const res = await fetch(`${endpoint.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify({
      model: endpoint.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAiResponse(text);
}

function parseAiResponse(text: string): AiPlan {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      reasoning: parsed.reasoning || 'No reasoning provided',
      commands: Array.isArray(parsed.commands) ? parsed.commands.slice(0, 3) : [],
      is_complete: !!parsed.is_complete,
      verification_command: parsed.verification_command || undefined,
    };
  } catch {
    // If JSON parsing fails, treat the whole response as reasoning with no commands
    return {
      reasoning: text.slice(0, 500),
      commands: [],
      is_complete: false,
    };
  }
}
