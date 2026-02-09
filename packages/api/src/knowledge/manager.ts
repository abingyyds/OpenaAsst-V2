import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

const GITHUB_API = 'https://api.github.com';

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

  /** Sync all knowledge to GitHub repository */
  async syncToGitHub(): Promise<{ synced: number; error?: string }> {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'abingyyds/OpenAsst';
    if (!token) return { synced: 0, error: 'GITHUB_TOKEN not configured' };

    const categories = this.getAll();
    let synced = 0;

    for (const cat of categories) {
      try {
        await this.updateGitHubFile(token, repo, cat.category, cat);
        synced++;
      } catch { /* skip failed categories */ }
    }

    try {
      await this.updateGitHubIndex(token, repo);
    } catch { /* ignore index update failure */ }

    return { synced };
  }

  /** Learn from a successful execution and save to knowledge base */
  learnFromExecution(
    task: string, commands: string[], result: string, success: boolean,
  ): boolean {
    if (!success || !task) return false;

    const category = this.detectCategory(task, commands);
    const keywords = this.extractKeywords(task);

    // Check for duplicates
    const existing = this.getCategory(category);
    if (existing) {
      const isDuplicate = existing.items.some(
        (item) => item.title.toLowerCase() === task.toLowerCase(),
      );
      if (isDuplicate) return false;
    }

    this.addItem(category, {
      title: task,
      keywords,
      solution: result,
      commands,
    });
    return true;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'and', 'or', 'not', 'it', 'this', 'that', 'how', 'what',
    ]);
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const unique = [...new Set(tokens)].filter((t) => !stopWords.has(t) && t.length > 2);
    return unique.slice(0, 10);
  }

  private detectCategory(task: string, commands: string[]): string {
    const text = `${task} ${commands.join(' ')}`.toLowerCase();
    if (text.includes('docker') || text.includes('container')) return 'docker';
    if (text.includes('deploy') || text.includes('release')) return 'deployment';
    if (text.includes('security') || text.includes('firewall') || text.includes('ssl')) return 'security';
    if (text.includes('network') || text.includes('dns') || text.includes('nginx')) return 'network';
    if (text.includes('apt') || text.includes('yum') || text.includes('systemctl')) return 'system';
    return 'custom';
  }

  private async updateGitHubFile(
    token: string, repo: string, category: string, data: KnowledgeCategory,
  ): Promise<void> {
    const path = `knowledge/${category}.json`;
    const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Get existing file SHA if it exists
    let sha: string | undefined;
    try {
      const existing = await fetch(url, { headers });
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }
    } catch { /* file doesn't exist yet */ }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body: any = {
      message: `Update ${category} knowledge`,
      content,
    };
    if (sha) body.sha = sha;

    await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  }

  private async updateGitHubIndex(token: string, repo: string): Promise<void> {
    const index = this.getIndex();
    if (!index) return;

    const path = 'knowledge/index.json';
    const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    let sha: string | undefined;
    try {
      const existing = await fetch(url, { headers });
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }
    } catch { /* file doesn't exist yet */ }

    const content = Buffer.from(JSON.stringify(index, null, 2)).toString('base64');
    const body: any = {
      message: 'Update knowledge index',
      content,
    };
    if (sha) body.sha = sha;

    await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
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
