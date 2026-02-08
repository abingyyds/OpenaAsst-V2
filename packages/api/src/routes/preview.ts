import { Hono } from 'hono';
import {
  startPreview,
  stopPreview,
  stopAllPreviews,
  getPreviewStatus,
} from '../preview/vite-server.js';

export const previewRoutes = new Hono();

previewRoutes.post('/start', async (c) => {
  const { taskId, workDir } = await c.req.json();
  if (!taskId || !workDir) {
    return c.json({ error: 'taskId and workDir required' }, 400);
  }
  try {
    const result = await startPreview(taskId, workDir);
    return c.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

previewRoutes.post('/stop', async (c) => {
  const { taskId } = await c.req.json();
  return c.json({ stopped: stopPreview(taskId) });
});

previewRoutes.get('/status/:taskId', (c) => {
  const { taskId } = c.req.param();
  return c.json(getPreviewStatus(taskId));
});

previewRoutes.post('/stop-all', (c) => {
  stopAllPreviews();
  return c.json({ ok: true });
});
