import { Hono } from 'hono';
import { SessionManager } from '../session/session-manager.js';

export const sessionRoutes = new Hono();
const manager = new SessionManager();

// GET /sessions - list all sessions
sessionRoutes.get('/', (c) => {
  const deviceId = c.req.query('deviceId');
  const sessions = manager.listSessions(deviceId || undefined);
  return c.json({ sessions });
});

// POST /sessions - create session
sessionRoutes.post('/', async (c) => {
  const { type, title, deviceId } = await c.req.json();
  if (!type || !title) {
    return c.json({ error: 'type and title are required' }, 400);
  }
  const session = manager.createSession(type, title, deviceId);
  return c.json({ session }, 201);
});

// GET /sessions/:id - get session with data
sessionRoutes.get('/:id', (c) => {
  const { id } = c.req.param();
  const session = manager.getSession(id);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json({ session });
});

// DELETE /sessions/:id - delete session
sessionRoutes.delete('/:id', (c) => {
  const { id } = c.req.param();
  const ok = manager.deleteSession(id);
  if (!ok) return c.json({ error: 'Session not found' }, 404);
  return c.json({ success: true });
});

// GET /sessions/device/:deviceId - list sessions for device
sessionRoutes.get('/device/:deviceId', (c) => {
  const { deviceId } = c.req.param();
  const sessions = manager.listSessions(deviceId);
  return c.json({ sessions });
});
