/**
 * MCP Config Routes
 *
 * Hono routes for MCP server configuration CRUD.
 * Config is persisted at ~/.openasst/mcp.json
 */

import fs from 'fs/promises';
import { dirname } from 'path';
import { Hono } from 'hono';
import { getMcpConfigPath } from '../mcp/manager.js';

export const mcpRoutes = new Hono();

interface McpConfigFile {
  mcpServers: Record<string, Record<string, unknown>>;
}

/** Ensure parent directory exists */
async function ensureDir(filePath: string): Promise<void> {
  try {
    await fs.mkdir(dirname(filePath), { recursive: true });
  } catch { /* already exists */ }
}

/** Read config from disk, return empty shell when missing */
async function readConfig(): Promise<McpConfigFile> {
  const configPath = getMcpConfigPath();
  try {
    await fs.access(configPath);
    const raw = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(raw) as McpConfigFile;
  } catch {
    return { mcpServers: {} };
  }
}

/** Persist config to disk */
async function writeConfig(config: McpConfigFile): Promise<void> {
  const configPath = getMcpConfigPath();
  await ensureDir(configPath);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

// ── GET /mcp/servers ── list all configured MCP servers
mcpRoutes.get('/servers', async (c) => {
  try {
    const config = await readConfig();
    return c.json({
      success: true,
      data: config.mcpServers,
      path: getMcpConfigPath(),
    });
  } catch (err) {
    console.error('[MCP] Failed to read config:', err);
    return c.json({ success: false, error: 'Failed to read MCP config' }, 500);
  }
});

// ── POST /mcp/servers ── add or update an MCP server
mcpRoutes.post('/servers', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      type?: 'stdio' | 'http' | 'sse';
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      headers?: Record<string, string>;
    }>();

    if (!body.name) {
      return c.json({ success: false, error: 'name is required' }, 400);
    }
    if (!body.command && !body.url) {
      return c.json(
        { success: false, error: 'command or url is required' },
        400,
      );
    }

    const config = await readConfig();
    const { name, ...serverCfg } = body;
    config.mcpServers[name] = serverCfg;
    await writeConfig(config);

    console.log(`[MCP] Server saved: ${name}`);
    return c.json({ success: true, message: `Server '${name}' saved` });
  } catch (err) {
    console.error('[MCP] Failed to save server:', err);
    return c.json({ success: false, error: 'Failed to save server' }, 500);
  }
});

// ── DELETE /mcp/servers/:name ── remove an MCP server
mcpRoutes.delete('/servers/:name', async (c) => {
  try {
    const name = c.req.param('name');
    const config = await readConfig();

    if (!config.mcpServers[name]) {
      return c.json(
        { success: false, error: `Server '${name}' not found` },
        404,
      );
    }

    delete config.mcpServers[name];
    await writeConfig(config);

    console.log(`[MCP] Server removed: ${name}`);
    return c.json({ success: true, message: `Server '${name}' removed` });
  } catch (err) {
    console.error('[MCP] Failed to remove server:', err);
    return c.json({ success: false, error: 'Failed to remove server' }, 500);
  }
});
