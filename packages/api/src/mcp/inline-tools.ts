/**
 * Sandbox MCP Inline Tools
 *
 * Creates an in-process MCP server with sandbox_run_script and
 * sandbox_run_command tools using the Claude Agent SDK helpers.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const DEFAULT_SANDBOX_URL = 'http://127.0.0.1:2026';

/**
 * Build the sandbox API base URL from environment or fallback
 */
function getSandboxUrl(): string {
  if (process.env.SANDBOX_API_URL) return process.env.SANDBOX_API_URL;
  const port = process.env.PORT || '2026';
  return `http://127.0.0.1:${port}`;
}

/** Format execution result into a readable text block */
function formatResult(result: {
  success: boolean;
  exitCode: number;
  runtime?: string;
  duration?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
}): { content: { type: 'text'; text: string }[]; isError: boolean } {
  let output = '';
  if (result.success) {
    output += `Script executed successfully (exit code: ${result.exitCode})\n`;
    if (result.runtime) output += `Runtime: ${result.runtime}\n`;
    if (result.duration) output += `Duration: ${result.duration}ms\n`;
    output += '\n';
    if (result.stdout) output += `--- stdout ---\n${result.stdout}\n`;
    if (result.stderr) output += `--- stderr ---\n${result.stderr}\n`;
  } else {
    output += `Execution failed (exit code: ${result.exitCode})\n`;
    if (result.error) output += `Error: ${result.error}\n`;
    if (result.stderr) output += `--- stderr ---\n${result.stderr}\n`;
    if (result.stdout) output += `--- stdout ---\n${result.stdout}\n`;
  }
  return {
    content: [{ type: 'text' as const, text: output }],
    isError: !result.success,
  };
}

/** Helper: make a POST to the sandbox API and return formatted result */
async function callSandbox(
  endpoint: string,
  body: Record<string, unknown>,
) {
  const baseUrl = getSandboxUrl();
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        content: [{ type: 'text' as const, text: `Sandbox HTTP ${res.status}` }],
        isError: true,
      };
    }

    const result = await res.json();
    if (!result) {
      return {
        content: [{ type: 'text' as const, text: 'Empty sandbox response' }],
        isError: true,
      };
    }

    return formatResult(result as Parameters<typeof formatResult>[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text' as const, text: `Sandbox unavailable: ${msg}` }],
      isError: true,
    };
  }
}

/**
 * Create an in-process MCP server that exposes sandbox tools.
 * Attach the returned value to queryOptions.mcpServers.sandbox
 */
export function createSandboxMcpServer(sandboxProvider?: string) {
  return createSdkMcpServer({
    name: 'sandbox',
    version: '1.0.0',
    tools: [
      // ── sandbox_run_script ──
      tool(
        'sandbox_run_script',
        'Run a script file in the sandbox. Auto-detects runtime from extension.',
        {
          filePath: z.string().describe('Absolute path to the script file'),
          workDir: z.string().describe('Working directory for execution'),
          args: z.array(z.string()).optional().describe('CLI arguments'),
          packages: z.array(z.string()).optional().describe('Packages to install'),
          timeout: z.number().optional().describe('Timeout in ms (default 120000)'),
        },
        async (args) => callSandbox('/sandbox/run/file', {
          ...args,
          provider: sandboxProvider,
        }),
      ),

      // ── sandbox_run_command ──
      tool(
        'sandbox_run_command',
        'Execute a shell command in the sandbox.',
        {
          command: z.string().describe('The command to execute'),
          args: z.array(z.string()).optional().describe('Command arguments'),
          workDir: z.string().describe('Working directory'),
          timeout: z.number().optional().describe('Timeout in ms'),
        },
        async (args) => callSandbox('/sandbox/exec', {
          command: args.command,
          args: args.args,
          cwd: args.workDir,
          timeout: args.timeout,
          provider: sandboxProvider,
        }),
      ),
    ],
  });
}
