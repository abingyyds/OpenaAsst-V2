import { Hono } from 'hono';
import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, renameSync, unlinkSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

export const fileRoutes = new Hono();

function resolvePath(p: string): string {
  if (p.startsWith('~')) return p.replace('~', homedir());
  return p;
}

// GET /files/serve?path=... — serve file with correct content-type (for iframe preview)
fileRoutes.get('/serve', (c) => {
  const filePath = c.req.query('path');
  if (!filePath) return c.text('path required', 400);
  try {
    const resolved = resolvePath(filePath);
    const content = readFileSync(resolved);
    const ext = resolved.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      html: 'text/html', htm: 'text/html',
      css: 'text/css', js: 'application/javascript',
      json: 'application/json', csv: 'text/csv',
      md: 'text/markdown', txt: 'text/plain',
      pdf: 'application/pdf',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      svg: 'image/svg+xml', gif: 'image/gif',
    };
    const ct = mimeMap[ext] || 'application/octet-stream';
    return new Response(content, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch {
    return c.text('File not found', 404);
  }
});

// GET /files/stat?path=... — check file existence and size
fileRoutes.get('/stat', (c) => {
  const filePath = c.req.query('path');
  if (!filePath) return c.json({ exists: false });
  try {
    const resolved = resolvePath(filePath);
    const stat = statSync(resolved);
    return c.json({
      exists: true,
      size: stat.size,
      mtime: stat.mtimeMs,
      isDirectory: stat.isDirectory(),
    });
  } catch {
    return c.json({ exists: false });
  }
});

// GET /files/download?path=... — download file as attachment
fileRoutes.get('/download', (c) => {
  const filePath = c.req.query('path');
  if (!filePath) return c.text('path required', 400);
  try {
    const resolved = resolvePath(filePath);
    const content = readFileSync(resolved);
    const name = basename(resolved);
    return new Response(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch {
    return c.text('File not found', 404);
  }
});

fileRoutes.post('/read', async (c) => {
  const { path: filePath } = await c.req.json();
  try {
    const content = readFileSync(resolvePath(filePath), 'utf-8');
    return c.json({ content });
  } catch {
    return c.json({ error: 'File not found' }, 404);
  }
});

fileRoutes.post('/list', async (c) => {
  const body = await c.req.json();
  const dir = resolvePath(body.dir || body.path || '~');
  try {
    const entries = readdirSync(dir)
      .filter((name) => !name.startsWith('.'))
      .map((name) => {
        const full = join(dir, name);
        try {
          const stat = statSync(full);
          return { name, path: full, type: stat.isDirectory() ? 'directory' as const : 'file' as const };
        } catch {
          return { name, path: full, type: 'file' as const };
        }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    return c.json({ files: entries });
  } catch {
    return c.json({ error: 'Directory not found' }, 404);
  }
});

// POST /files/move — move or rename
fileRoutes.post('/move', async (c) => {
  try {
    const { from, to } = await c.req.json();
    renameSync(resolvePath(from), resolvePath(to));
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Move failed' }, 500);
  }
});

// POST /files/copy
fileRoutes.post('/copy', async (c) => {
  try {
    const { from, to } = await c.req.json();
    copyFileSync(resolvePath(from), resolvePath(to));
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Copy failed' }, 500);
  }
});

// POST /files/delete
fileRoutes.post('/delete', async (c) => {
  try {
    const { path: filePath } = await c.req.json();
    const resolved = resolvePath(filePath);
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      rmSync(resolved, { recursive: true });
    } else {
      unlinkSync(resolved);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Delete failed' }, 500);
  }
});

// POST /files/mkdir
fileRoutes.post('/mkdir', async (c) => {
  try {
    const { path: dirPath } = await c.req.json();
    mkdirSync(resolvePath(dirPath), { recursive: true });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Mkdir failed' }, 500);
  }
});
