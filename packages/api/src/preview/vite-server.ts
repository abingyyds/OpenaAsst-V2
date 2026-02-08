import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';

interface PreviewServer {
  taskId: string;
  port: number;
  process: ChildProcess;
  url: string;
}

const servers = new Map<string, PreviewServer>();
let nextPort = 3100;

export function getPreviewStatus(taskId: string) {
  const server = servers.get(taskId);
  if (!server) return { running: false };
  return { running: true, url: server.url, port: server.port };
}

export async function startPreview(
  taskId: string,
  workDir: string,
): Promise<{ url: string; port: number }> {
  const existing = servers.get(taskId);
  if (existing) return { url: existing.url, port: existing.port };

  if (!existsSync(workDir)) {
    throw new Error(`Directory not found: ${workDir}`);
  }

  const port = nextPort++;
  if (nextPort > 3200) nextPort = 3100;

  const child = spawn('npx', ['vite', '--port', String(port), '--host'], {
    cwd: workDir,
    stdio: 'pipe',
    shell: true,
  });

  const url = `http://127.0.0.1:${port}`;
  servers.set(taskId, { taskId, port, process: child, url });

  child.on('exit', () => servers.delete(taskId));

  // Wait for server to be ready
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    child.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Local:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  return { url, port };
}

export function stopPreview(taskId: string): boolean {
  const server = servers.get(taskId);
  if (!server) return false;
  server.process.kill();
  servers.delete(taskId);
  return true;
}

export function stopAllPreviews(): void {
  for (const [id, server] of servers) {
    server.process.kill();
    servers.delete(id);
  }
}
