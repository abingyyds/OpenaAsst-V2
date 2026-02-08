import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentRoutes } from './routes/chat.js';
import { previewRoutes } from './routes/preview.js';
import { fileRoutes } from './routes/files.js';
import { mcpRoutes } from './routes/mcp.js';
import { deviceRoutes } from './routes/devices.js';
import { settingsRoutes } from './routes/settings.js';
import { sessionRoutes } from './routes/sessions.js';
import { hubRoutes } from './routes/hub.js';

const app = new Hono();

app.use('/*', cors());

app.route('/agent', agentRoutes);
app.route('/preview', previewRoutes);
app.route('/files', fileRoutes);
app.route('/mcp', mcpRoutes);
app.route('/devices', deviceRoutes);
app.route('/settings', settingsRoutes);
app.route('/sessions', sessionRoutes);
app.route('/hub', hubRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = process.env.NODE_ENV === 'production' ? 2620 : 2026;

console.log(`OpenAsst API server starting on port ${port}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`OpenAsst API server running at http://127.0.0.1:${info.port}`);
});
