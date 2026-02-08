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

// POST /knowledge/:category — add item to category
knowledgeRoutes.post('/:category', async (c) => {
  const categoryId = c.req.param('category');
  const body = await c.req.json();
  if (!body.title || !body.solution) {
    return c.json({ error: 'title and solution required' }, 400);
  }
  km.addItem(categoryId, {
    title: body.title,
    keywords: body.keywords || [],
    solution: body.solution,
    commands: body.commands || [],
  });
  return c.json({ success: true });
});

// DELETE /knowledge/:category/:itemId — delete item
knowledgeRoutes.delete('/:category/:itemId', (c) => {
  const { category, itemId } = c.req.param();
  const deleted = km.deleteItem(category, itemId);
  return c.json({ deleted });
});
