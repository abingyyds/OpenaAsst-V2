import { Hono } from 'hono';
import { runAgent, stopSession } from '../agent/orchestrator.js';
import { planAgent, getPlan, deletePlan } from '../agent/planner.js';
import { createSSEStream } from '../agent/streaming.js';
import { DeviceManager } from '../server-mgmt/device-manager.js';
import type { AgentRequest } from '@openasst/types';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

export const agentRoutes = new Hono();

const deviceManager = new DeviceManager();

function buildDevicePrompt(prompt: string, deviceId: string): string {
  const device = deviceManager.getDevice(deviceId);
  if (!device) return prompt;

  const home = homedir();
  let sshPrefix: string;
  if (device.authType === 'privateKey' && device.privateKeyPath) {
    const keyPath = device.privateKeyPath.replace('~', home);
    sshPrefix = `ssh -i "${keyPath}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host}`;
  } else if (device.password) {
    sshPrefix = `sshpass -p "${device.password}" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host}`;
  } else {
    sshPrefix = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host}`;
  }

  return [
    `You are managing a remote server: ${device.name} (${device.host}).`,
    `To execute commands on this server, use the Bash tool with this SSH prefix:`,
    `${sshPrefix} "<command>"`,
    ``,
    `Always use this SSH prefix when running commands. The user's request:`,
    ``,
    prompt,
  ].join('\n');
}

agentRoutes.post('/', async (c) => {
  const body = await c.req.json<AgentRequest>();
  const { prompt, taskId, modelConfig, deviceId } = body;

  if (!prompt) {
    return c.json({ error: 'prompt is required' }, 400);
  }

  const workDir = body.workDir
    || join(homedir(), '.openasst', 'sessions', taskId || 'default');
  mkdirSync(workDir, { recursive: true });

  const finalPrompt = deviceId ? buildDevicePrompt(prompt, deviceId) : prompt;
  const generator = runAgent(finalPrompt, workDir, modelConfig);
  const { readable, headers } = createSSEStream(generator);

  return new Response(readable, { headers });
});

agentRoutes.post('/stop/:sessionId', async (c) => {
  const { sessionId } = c.req.param();
  const stopped = stopSession(sessionId);
  return c.json({ stopped });
});

agentRoutes.post('/plan', async (c) => {
  const body = await c.req.json<AgentRequest>();
  const { prompt, taskId, modelConfig } = body;

  if (!prompt) return c.json({ error: 'prompt is required' }, 400);

  const workDir = body.workDir
    || join(homedir(), '.openasst', 'sessions', taskId || 'default');
  mkdirSync(workDir, { recursive: true });

  const generator = planAgent(prompt, workDir, modelConfig);
  const { readable, headers } = createSSEStream(generator);
  return new Response(readable, { headers });
});

agentRoutes.post('/execute', async (c) => {
  const body = await c.req.json<AgentRequest>();
  const { planId, prompt, taskId, modelConfig } = body;

  const plan = planId ? getPlan(planId) : undefined;
  const execPrompt = plan
    ? `Execute this plan:\nGoal: ${plan.goal}\nSteps:\n${plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}\n${plan.notes ? `Notes: ${plan.notes}` : ''}`
    : prompt;

  if (!execPrompt) return c.json({ error: 'prompt or planId required' }, 400);

  const workDir = body.workDir
    || join(homedir(), '.openasst', 'sessions', taskId || 'default');
  mkdirSync(workDir, { recursive: true });

  if (planId) deletePlan(planId);

  const generator = runAgent(execPrompt, workDir, modelConfig);
  const { readable, headers } = createSSEStream(generator);
  return new Response(readable, { headers });
});
