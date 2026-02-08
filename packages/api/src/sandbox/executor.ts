/**
 * Native Sandbox Executor
 *
 * Runs commands and scripts via child_process on the host system.
 * Auto-detects runtime from file extension.
 */

import { spawn } from 'child_process';
import { extname } from 'path';

export interface ExecResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration?: number;
}

const DEFAULT_TIMEOUT = 120_000;

/**
 * Auto-detect runtime from file extension
 */
function detectRuntime(filePath: string): { cmd: string; args: string[] } {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.py':
      return { cmd: 'python3', args: [filePath] };
    case '.ts':
    case '.mts':
      return { cmd: 'bun', args: ['run', filePath] };
    case '.js':
    case '.mjs':
      return { cmd: 'node', args: [filePath] };
    case '.sh':
      return { cmd: 'bash', args: [filePath] };
    default:
      return { cmd: 'node', args: [filePath] };
  }
}

/**
 * Spawn a process and collect stdout/stderr into an ExecResult
 */
function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
  timeout?: number,
): Promise<ExecResult> {
  const start = Date.now();
  const execTimeout = timeout || DEFAULT_TIMEOUT;

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      timeout: execTimeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const combined = stdout + (stderr ? `\n${stderr}` : '');
      resolve({
        success: code === 0,
        output: combined.trim(),
        exitCode: code ?? 1,
        duration: Date.now() - start,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: `${stdout}\n${stderr}\n${err.message}`.trim(),
        exitCode: 1,
        duration: Date.now() - start,
      });
    });
  });
}

/**
 * Run a script file. Runtime is auto-detected from extension.
 */
export async function runScript(
  filePath: string,
  workDir: string,
  options?: {
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
  },
): Promise<ExecResult> {
  const { cmd, args } = detectRuntime(filePath);
  const allArgs = [...args, ...(options?.args || [])];
  console.log(`[Sandbox] runScript: ${cmd} ${allArgs.join(' ')}`);
  return runProcess(cmd, allArgs, workDir, options?.env, options?.timeout);
}

/**
 * Run an arbitrary command in the given working directory.
 */
export async function runCommand(
  command: string,
  args: string[],
  workDir: string,
  options?: {
    env?: Record<string, string>;
    timeout?: number;
  },
): Promise<ExecResult> {
  console.log(`[Sandbox] runCommand: ${command} ${args.join(' ')}`);
  return runProcess(command, args, workDir, options?.env, options?.timeout);
}
