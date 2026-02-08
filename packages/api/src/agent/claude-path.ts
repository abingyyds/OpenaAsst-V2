import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const COMMON_PATHS = [
  '/usr/local/bin/claude',
  '/opt/homebrew/bin/claude',
  join(homedir(), '.npm-global/bin/claude'),
  join(homedir(), '.volta/bin/claude'),
];

export async function findClaudeCodePath(): Promise<string> {
  // 1. Try which
  try {
    const path = execSync('which claude', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    if (path && existsSync(path)) return path;
  } catch {}

  // 2. Try common paths
  for (const p of COMMON_PATHS) {
    if (existsSync(p)) return p;
  }

  // 3. Try env var
  const envPath = process.env.CLAUDE_CODE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  throw new Error(
    'Claude Code not found. Install it with: npm install -g @anthropic-ai/claude-code',
  );
}
