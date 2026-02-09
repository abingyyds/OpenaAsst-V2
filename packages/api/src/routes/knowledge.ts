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

// GET /knowledge/sync/status — check GitHub sync configuration
knowledgeRoutes.get('/sync/status', (c) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'abingyyds/OpenAsst';
  return c.json({
    configured: !!token,
    repo: token ? repo : undefined,
  });
});

// POST /knowledge/sync — sync to GitHub
knowledgeRoutes.post('/sync', async (c) => {
  try {
    const result = await km.syncToGitHub();
    return c.json(result);
  } catch {
    return c.json({ error: 'Failed to sync to GitHub' }, 500);
  }
});

// POST /knowledge/learn — AI learn from execution
knowledgeRoutes.post('/learn', async (c) => {
  try {
    const { task, commands, result, success } = await c.req.json();
    if (!task) return c.json({ error: 'task is required' }, 400);
    const learned = km.learnFromExecution(task, commands || [], result || '', success ?? true);
    return c.json({ learned });
  } catch {
    return c.json({ error: 'Failed to learn' }, 500);
  }
});

// GET /knowledge/category/:id — get items for a category
knowledgeRoutes.get('/category/:id', (c) => {
  const { id } = c.req.param();
  const cat = km.getCategory(id);
  if (!cat) return c.json({ error: 'Category not found' }, 404);
  return c.json(cat);
});

// POST /knowledge/:category — add item to category (param route MUST be last)
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
