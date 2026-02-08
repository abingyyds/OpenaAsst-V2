/**
 * MCP Server Manager
 *
 * Loads MCP server configuration from ~/.openasst/mcp.json
 * Supports three transport types: stdio, http, sse
 */

import fs from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

// ── MCP Server Config Types ──

export interface McpStdioServerConfig {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpHttpServerConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface McpSSEServerConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export type McpServerConfig =
  | McpStdioServerConfig
  | McpHttpServerConfig
  | McpSSEServerConfig;

// ── Config file format ──

interface McpConfigFile {
  mcpServers: Record<string, {
    type?: 'stdio' | 'http' | 'sse';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
  }>;
}

// ── MCP toggle interface ──

export interface McpToggleConfig {
  enabled: boolean;
}

/**
 * Get the path to the MCP config file
 */
export function getMcpConfigPath(): string {
  return join(homedir(), '.openasst', 'mcp.json');
}

/**
 * Load MCP servers from a config file on disk.
 * Auto-detects transport type: url -> http (or sse), command -> stdio
 */
async function loadFromFile(
  configPath: string,
): Promise<Record<string, McpServerConfig>> {
  try {
    await fs.access(configPath);
    const raw = await fs.readFile(configPath, 'utf-8');
    const config: McpConfigFile = JSON.parse(raw);

    const mcpServers = config.mcpServers || config;
    if (!mcpServers || typeof mcpServers !== 'object') return {};

    const servers: Record<string, McpServerConfig> = {};

    for (const [name, cfg] of Object.entries(mcpServers)) {
      if (cfg.url) {
        const transport = cfg.type || 'http';
        if (transport === 'sse') {
          servers[name] = {
            type: 'sse',
            url: cfg.url,
            headers: cfg.headers,
          };
        } else {
          servers[name] = {
            type: 'http',
            url: cfg.url,
            headers: cfg.headers,
          };
        }
        console.log(`[MCP] Loaded ${transport} server: ${name}`);
      } else if (cfg.command) {
        servers[name] = {
          type: 'stdio',
          command: cfg.command,
          args: cfg.args,
          env: cfg.env,
        };
        console.log(`[MCP] Loaded stdio server: ${name}`);
      }
    }

    return servers;
  } catch {
    return {};
  }
}

/**
 * Load all configured MCP servers from ~/.openasst/mcp.json
 *
 * @param mcpConfig - Optional toggle; if enabled is false, returns empty
 * @returns Record of server name to McpServerConfig
 */
export async function loadMcpServers(
  mcpConfig?: McpToggleConfig,
): Promise<Record<string, McpServerConfig>> {
  if (mcpConfig && !mcpConfig.enabled) {
    console.log('[MCP] MCP disabled, skipping server load');
    return {};
  }

  const configPath = getMcpConfigPath();
  const servers = await loadFromFile(configPath);

  const count = Object.keys(servers).length;
  if (count > 0) {
    console.log(`[MCP] Loaded ${count} MCP server(s)`);
  } else {
    console.log('[MCP] No MCP servers configured');
  }

  return servers;
}
