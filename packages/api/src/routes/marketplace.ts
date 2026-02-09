import { Hono } from 'hono';
import { MarketplaceManager } from '../marketplace/manager.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string | undefined } };

export const marketplaceRoutes = new Hono<Env>();
const mp = new MarketplaceManager();

marketplaceRoutes.use('/*', authMiddleware);

// GET /marketplace/scripts
marketplaceRoutes.get('/scripts', async (c) => {
  const category = c.req.query('category');
  const sort = c.req.query('sort');

  let scripts;
  if (sort === 'popular') {
    scripts = await mp.getPopular(50);
  } else {
    scripts = await mp.getAllTemplates();
  }

  if (category) {
    scripts = scripts.filter((s) => s.category === category);
  }

  return c.json({ scripts });
});

// GET /marketplace/scripts/search
marketplaceRoutes.get('/scripts/search', async (c) => {
  const q = c.req.query('q') || '';
  const category = c.req.query('category');
  const results = await mp.searchTemplates(q, category || undefined);
  return c.json({ scripts: results });
});

// GET /marketplace/scripts/popular
marketplaceRoutes.get('/scripts/popular', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const scripts = await mp.getPopular(limit);
  return c.json({ scripts });
});

// GET /marketplace/scripts/:id
marketplaceRoutes.get('/scripts/:id', async (c) => {
  const script = await mp.getTemplate(c.req.param('id'));
  if (!script) return c.json({ error: 'Not found' }, 404);
  return c.json({ script });
});

// POST /marketplace/scripts
marketplaceRoutes.post('/scripts', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const script = await mp.createTemplate(body, userId);
  if (!script) return c.json({ error: 'Failed to create' }, 500);
  return c.json({ script }, 201);
});

// DELETE /marketplace/scripts/:id
marketplaceRoutes.delete('/scripts/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await mp.deleteTemplate(c.req.param('id'), userId);
  if (!ok) return c.json({ error: 'Failed to delete' }, 400);
  return c.json({ success: true });
});

// POST /marketplace/scripts/:id/like
marketplaceRoutes.post('/scripts/:id/like', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await mp.likeScript(c.req.param('id'), userId);
  return c.json({ success: ok });
});

// DELETE /marketplace/scripts/:id/like
marketplaceRoutes.delete('/scripts/:id/like', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await mp.unlikeScript(c.req.param('id'), userId);
  return c.json({ success: ok });
});

// GET /marketplace/scripts/:id/likes
marketplaceRoutes.get('/scripts/:id/likes', async (c) => {
  const userId = c.get('userId');
  const liked = userId ? await mp.hasLiked(c.req.param('id'), userId) : false;
  return c.json({ liked });
});

// POST /marketplace/scripts/:id/favorite
marketplaceRoutes.post('/scripts/:id/favorite', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await mp.favoriteScript(c.req.param('id'), userId);
  return c.json({ success: ok });
});

// DELETE /marketplace/scripts/:id/favorite
marketplaceRoutes.delete('/scripts/:id/favorite', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await mp.unfavoriteScript(c.req.param('id'), userId);
  return c.json({ success: ok });
});

// GET /marketplace/favorites
marketplaceRoutes.get('/favorites', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ scripts: [] });
  const scripts = await mp.getFavorites(userId);
  return c.json({ scripts });
});

// POST /marketplace/scripts/:id/rate
marketplaceRoutes.post('/scripts/:id/rate', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const { rating } = await c.req.json();
  const ok = await mp.rateScript(c.req.param('id'), userId, rating);
  return c.json({ success: ok });
});

// GET /marketplace/scripts/:id/rating
marketplaceRoutes.get('/scripts/:id/rating', async (c) => {
  const result = await mp.getRating(c.req.param('id'));
  return c.json(result);
});

// POST /marketplace/scripts/:id/execute
marketplaceRoutes.post('/scripts/:id/execute', async (c) => {
  await mp.incrementUsage(c.req.param('id'));
  return c.json({ success: true });
});
