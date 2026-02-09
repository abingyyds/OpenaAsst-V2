import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { DeviceManager } from '../server-mgmt/device-manager.js';
import { CommandExecutor } from '../server-mgmt/executor.js';
import { deployOpenClaw, buildSshCmd } from '../openclaw/deployer.js';
import type { DeployConfig } from '../openclaw/deployer.js';

const botsDir = join(homedir(), 'openasst', 'bots');
const deviceMgr = new DeviceManager();
const executor = new CommandExecutor();

function ensureDir() {
  if (!existsSync(botsDir)) mkdirSync(botsDir, { recursive: true });
}

function loadBots(): any[] {
  ensureDir();
  const f = join(botsDir, 'bots.json');
  if (!existsSync(f)) return [];
  try { return JSON.parse(readFileSync(f, 'utf-8')); } catch { return []; }
}

function saveBots(bots: any[]) {
  ensureDir();
  writeFileSync(join(botsDir, 'bots.json'), JSON.stringify(bots, null, 2));
}

export const robotRoutes = new Hono();

// List all bots
robotRoutes.get('/', (c) => {
  return c.json(loadBots());
});

// List available servers (from device manager) — MUST be before /:id
robotRoutes.get('/servers/list', (c) => {
  try {
    const devices = deviceMgr.listDevices().map((d: any) => ({
      id: d.id, name: d.name, host: d.host,
      port: d.port, username: d.username,
    }));
    return c.json(devices);
  } catch { return c.json([]); }
});

// Test model API key and fetch available models — MUST be before /:id
robotRoutes.post('/test-model', async (c) => {
  const { api, baseUrl, apiKey } = await c.req.json();
  if (!baseUrl || !apiKey) {
    return c.json({ error: 'baseUrl and apiKey required' }, 400);
  }
  try {
    let models: { id: string; name: string }[] = [];

    if (api === 'anthropic-messages') {
      // Anthropic: GET /v1/models
      const url = baseUrl.replace(/\/+$/, '') + '/v1/models';
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        return c.json({ error: `API error ${res.status}: ${text.slice(0, 200)}` }, 400);
      }
      const data = await res.json() as any;
      const list = data.data || data.models || [];
      models = list.map((m: any) => ({
        id: m.id || m.model,
        name: m.display_name || m.id || m.model,
      }));
    } else {
      // OpenAI-compatible: GET /models or /v1/models
      let url = baseUrl.replace(/\/+$/, '');
      if (!url.endsWith('/models')) {
        url += (url.endsWith('/v1') ? '' : '/v1') + '/models';
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return c.json({ error: `API error ${res.status}: ${text.slice(0, 200)}` }, 400);
      }
      const data = await res.json() as any;
      const list = data.data || data.models || [];
      models = list.map((m: any) => ({
        id: m.id || m.model,
        name: m.id || m.model,
      }));
    }

    // Sort by id
    models.sort((a, b) => a.id.localeCompare(b.id));
    return c.json({ ok: true, models });
  } catch (e: any) {
    return c.json({ error: e.message || 'Connection failed' }, 500);
  }
});

// Get single bot
robotRoutes.get('/:id', (c) => {
  const bot = loadBots().find((b: any) => b.id === c.req.param('id'));
  if (!bot) return c.json({ error: 'Not found' }, 404);
  return c.json(bot);
});

// Delete bot
robotRoutes.delete('/:id', (c) => {
  const bots = loadBots();
  const filtered = bots.filter((b: any) => b.id !== c.req.param('id'));
  if (filtered.length === bots.length) return c.json({ error: 'Not found' }, 404);
  saveBots(filtered);
  return c.json({ ok: true });
});

// Start bot via SSH systemctl
robotRoutes.post('/:id/start', async (c) => {
  const bots = loadBots();
  const idx = bots.findIndex((b: any) => b.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Not found' }, 404);
  const bot = bots[idx];
  const device = deviceMgr.getDevice(bot.deviceId);
  if (!device) return c.json({ error: 'Device not found' }, 404);
  try {
    await executor.execute(buildSshCmd(device, 'systemctl start openclaw'));
    bots[idx].status = 'running';
    bots[idx].lastCheckedAt = new Date().toISOString();
    saveBots(bots);
    return c.json(bots[idx]);
  } catch {
    return c.json({ error: 'Failed to start' }, 500);
  }
});

// Stop bot via SSH systemctl
robotRoutes.post('/:id/stop', async (c) => {
  const bots = loadBots();
  const idx = bots.findIndex((b: any) => b.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Not found' }, 404);
  const bot = bots[idx];
  const device = deviceMgr.getDevice(bot.deviceId);
  if (!device) return c.json({ error: 'Device not found' }, 404);
  try {
    await executor.execute(buildSshCmd(device, 'systemctl stop openclaw'));
    bots[idx].status = 'stopped';
    saveBots(bots);
    return c.json(bots[idx]);
  } catch {
    return c.json({ error: 'Failed to stop' }, 500);
  }
});

// Check real bot status via SSH
robotRoutes.get('/:id/status', async (c) => {
  const bot = loadBots().find((b: any) => b.id === c.req.param('id'));
  if (!bot) return c.json({ error: 'Not found' }, 404);
  const device = deviceMgr.getDevice(bot.deviceId);
  if (!device) return c.json({ status: 'unknown' });
  try {
    const r = await executor.execute(buildSshCmd(device, 'systemctl is-active openclaw'));
    const active = r.output?.trim() === 'active';
    return c.json({ status: active ? 'running' : 'stopped' });
  } catch {
    return c.json({ status: 'unknown' });
  }
});

// Get bot gateway access info
robotRoutes.get('/:id/access', (c) => {
  const bot = loadBots().find((b: any) => b.id === c.req.param('id'));
  if (!bot) return c.json({ error: 'Not found' }, 404);
  const port = bot.gatewayPort || 18789;
  return c.json({
    url: `http://${bot.host}:${port}`,
    token: bot.gatewayToken || '',
  });
});

// Update bot config on remote server
robotRoutes.put('/:id/config', async (c) => {
  const bots = loadBots();
  const idx = bots.findIndex((b: any) => b.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Not found' }, 404);
  const bot = bots[idx];
  const device = deviceMgr.getDevice(bot.deviceId);
  if (!device) return c.json({ error: 'Device not found' }, 404);
  const { config } = await c.req.json();
  try {
    const json = JSON.stringify(config);
    const cmd = `cat > ~/.openclaw/openclaw.json << 'OCEOF'\n${json}\nOCEOF`;
    await executor.execute(buildSshCmd(device, cmd));
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to write config' }, 500);
  }
});

// Deploy OpenClaw to a server (SSE stream)
robotRoutes.post('/deploy', async (c) => {
  const body = await c.req.json();
  const { deviceId, name, config } = body as {
    deviceId: string;
    name: string;
    config: DeployConfig;
  };
  if (!deviceId || !name || !config) {
    return c.json({ error: 'deviceId, name, config required' }, 400);
  }

  const device = deviceMgr.getDevice(deviceId);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  const botId = crypto.randomUUID();
  const bots = loadBots();
  bots.push({
    id: botId, name, deviceId,
    deviceName: device.name || device.host,
    host: device.host,
    status: 'deploying',
    gatewayPort: config.gatewayPort || 18789,
    gatewayToken: (body as any).gatewayToken || '',
    providers: config.providers,
    channels: config.channels,
    primaryModel: config.primaryModel,
    createdAt: new Date().toISOString(),
  });
  saveBots(bots);

  return streamSSE(c, async (stream) => {
    let success = true;
    for await (const log of deployOpenClaw(deviceId, config)) {
      await stream.writeSSE({ event: 'log', data: JSON.stringify(log) });
      if (log.status === 'error') { success = false; break; }
    }
    const updated = loadBots();
    const idx = updated.findIndex((b: any) => b.id === botId);
    if (idx !== -1) {
      updated[idx].status = success ? 'running' : 'error';
      saveBots(updated);
    }
    await stream.writeSSE({
      event: 'done', data: JSON.stringify({ botId, success }),
    });
  });
});
