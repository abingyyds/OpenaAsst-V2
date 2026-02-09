import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { WSHub } from '../hub/ws-hub.js';
import { AgentDeployer } from '../hub/agent-deployer.js';
import { DeviceManager } from '../server-mgmt/device-manager.js';
import { aiAutoExecute } from '../hub/auto-execute.js';
import { APIProvider } from '../server-mgmt/api-provider.js';

export const hubRoutes = new Hono();

const deviceManager = new DeviceManager();
const hub = new WSHub(deviceManager);
const deployer = new AgentDeployer(deviceManager);

// POST /hub/start
hubRoutes.post('/start', (c) => {
  try {
    hub.start();
    return c.json({ success: true, port: hub.getPort() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// POST /hub/stop
hubRoutes.post('/stop', (c) => {
  hub.stop();
  return c.json({ success: true });
});

// GET /hub/status
hubRoutes.get('/status', (c) => {
  const agents = hub.getOnlineAgents().map((a) => ({
    name: a.name,
    connectedAt: a.connectedAt.toISOString(),
    lastHeartbeat: a.lastHeartbeat.toISOString(),
    capabilities: a.capabilities,
    version: a.version,
  }));
  return c.json({
    running: hub.isRunning(),
    port: hub.getPort(),
    agents,
  });
});

// POST /hub/deploy — deploy agent to specific devices
hubRoutes.post('/deploy', async (c) => {
  try {
    const { deviceIds } = await c.req.json<{ deviceIds: string[] }>();
    if (!deviceIds?.length) {
      return c.json({ error: 'deviceIds required' }, 400);
    }
    const results = await deployer.deployMultiple(deviceIds);
    return c.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// POST /hub/deploy/all — deploy to all devices
hubRoutes.post('/deploy/all', async (c) => {
  try {
    const devices = deviceManager.listDevices();
    const ids = devices.map((d) => d.id);
    const results = await deployer.deployMultiple(ids);
    return c.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// POST /hub/broadcast — broadcast command to agents
hubRoutes.post('/broadcast', async (c) => {
  try {
    const body = await c.req.json<{
      command: string;
      targetNames?: string[];
      timeout?: number;
    }>();
    if (!body.command) {
      return c.json({ error: 'command required' }, 400);
    }
    const results = await hub.broadcast(
      body.command,
      body.targetNames || [],
      body.timeout || 60000,
    );
    return c.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// POST /hub/ai-execute — AI-driven cluster execution (SSE stream)
hubRoutes.post('/ai-execute', async (c) => {
  const body = await c.req.json<{ task: string; targetNames?: string[] }>();
  if (!body.task) {
    return c.json({ error: 'task required' }, 400);
  }

  return streamSSE(c, async (stream) => {
    const gen = aiAutoExecute(hub, body.task, body.targetNames || []);
    for await (const event of gen) {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
      });
    }
  });
});

// POST /hub/sync-config — push API config to all connected agents
hubRoutes.post('/sync-config', async (c) => {
  try {
    if (!hub.isRunning()) {
      return c.json({ error: 'Hub is not running' }, 400);
    }

    const apiProvider = new APIProvider();
    const endpoint = apiProvider.getAPIEndpoint();

    if (!endpoint) {
      return c.json({ error: 'No API config found. Set up in Settings first.' }, 400);
    }

    const onlineAgents = hub.getOnlineAgents().map((a) => a.name);
    if (onlineAgents.length === 0) {
      return c.json({ error: 'No online agents' }, 400);
    }

    const results = await hub.syncConfig(endpoint, [], 30000);
    return c.json({ success: true, synced: results.length, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
