import { Hono } from 'hono';
import { KnowledgeManager } from '../knowledge/manager.js';

export const knowledgeRoutes = new Hono();
const km = new KnowledgeManager();

// GET /knowledge — list all categories and items
knowledgeRoutes.get('/', (c) => {
  const all = km.getAll();
  return c.json({ categories: all });
});

// GET /knowledge/index — get category index
knowledgeRoutes.get('/index', (c) => {
  const index = km.getIndex();
  return c.json(index || { categories: [], files: [] });
});

// GET /knowledge/search?q=... — search knowledge base
knowledgeRoutes.get('/search', (c) => {
  const q = c.req.query('q') || '';
  if (!q) return c.json({ results: [] });
  const results = km.search(q);
  return c.json({ results });
});
