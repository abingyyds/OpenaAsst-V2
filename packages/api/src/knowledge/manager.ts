import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

export interface KnowledgeItem {
  id?: string;
  title: string;
  keywords: string[];
  solution: string;
  commands?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeCategory {
  category: string;
  description?: string;
  items: KnowledgeItem[];
}

export interface KnowledgeIndex {
  version: string;
  lastUpdated: string;
  categories: { id: string; name: string; description: string }[];
  files: string[];
}

const KNOWLEDGE_DIR = join(homedir(), 'openasst', 'knowledge');

export class KnowledgeManager {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir || KNOWLEDGE_DIR;
  }

  /** Load the index file */
  getIndex(): KnowledgeIndex | null {
    const indexPath = join(this.dir, 'index.json');
    if (!existsSync(indexPath)) return null;
    try {
      return JSON.parse(readFileSync(indexPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Load all categories and their items */
  getAll(): KnowledgeCategory[] {
    if (!existsSync(this.dir)) return [];
    const results: KnowledgeCategory[] = [];
    const files = readdirSync(this.dir).filter(
      (f) => f.endsWith('.json') && f !== 'index.json',
    );
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(this.dir, file), 'utf-8'));
        if (data.items && Array.isArray(data.items)) {
          results.push(data);
        }
      } catch { /* skip bad files */ }
    }
    return results;
  }

  /** Get items for a specific category */
  getCategory(categoryId: string): KnowledgeCategory | null {
    const filePath = join(this.dir, `${categoryId}.json`);
    if (!existsSync(filePath)) return null;
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Search knowledge base by query string */
  search(query: string, limit = 5): (KnowledgeItem & { score: number; category: string })[] {
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const all = this.getAll();
    const scored: (KnowledgeItem & { score: number; category: string })[] = [];

    for (const cat of all) {
      for (const item of cat.items) {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const solutionLower = item.solution.toLowerCase();

        // Exact title match
        if (titleLower === q) score += 10;
        // Title contains query
        else if (titleLower.includes(q)) score += 5;

        // Token matching
        for (const token of tokens) {
          if (titleLower.includes(token)) score += 3;
          if (item.keywords.some((k) => k.toLowerCase().includes(token))) score += 2;
          if (solutionLower.includes(token)) score += 1;
        }

        if (score > 0) {
          scored.push({ ...item, score, category: cat.category });
        }
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Add an item to a category */
  addItem(categoryId: string, item: KnowledgeItem): void {
    const filePath = join(this.dir, `${categoryId}.json`);
    let cat: KnowledgeCategory;

    if (existsSync(filePath)) {
      cat = JSON.parse(readFileSync(filePath, 'utf-8'));
    } else {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
      cat = { category: categoryId, items: [] };
    }

    item.id = item.id || `${categoryId}-${Date.now()}`;
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    cat.items.push(item);

    writeFileSync(filePath, JSON.stringify(cat, null, 2));
    this.updateIndex();
  }

  /** Delete an item from a category */
  deleteItem(categoryId: string, itemId: string): boolean {
    const filePath = join(this.dir, `${categoryId}.json`);
    if (!existsSync(filePath)) return false;

    const cat: KnowledgeCategory = JSON.parse(readFileSync(filePath, 'utf-8'));
    const before = cat.items.length;
    cat.items = cat.items.filter((i) => i.id !== itemId);
    if (cat.items.length === before) return false;

    writeFileSync(filePath, JSON.stringify(cat, null, 2));
    return true;
  }

  /** Build context string for AI prompt injection */
  buildContext(query: string): string {
    const results = this.search(query, 3);
    if (results.length === 0) return '';

    const lines = ['## Knowledge Base Reference\n'];
    for (const r of results) {
      lines.push(`### ${r.title} (${r.category})`);
      lines.push(r.solution);
      if (r.commands?.length) {
        lines.push('Commands: ' + r.commands.join(', '));
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  /** Update the index.json file */
  private updateIndex(): void {
    if (!existsSync(this.dir)) return;
    const files = readdirSync(this.dir).filter(
      (f) => f.endsWith('.json') && f !== 'index.json',
    );
    const categories = files.map((f) => {
      const id = basename(f, '.json');
      return { id, name: id, description: `${id} knowledge` };
    });
    const index: KnowledgeIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      categories,
      files,
    };
    writeFileSync(join(this.dir, 'index.json'), JSON.stringify(index, null, 2));
  }
}
