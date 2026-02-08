import * as fs from 'fs';
import * as path from 'path';
import { CommandScript } from './marketplace';

interface KnowledgeBaseItem {
  id: string;
  title: string;
  keywords: string[];
  solution: string;
  commands: string[];
  category: string;
}

export interface SearchResult {
  source: 'marketplace' | 'knowledge-base' | 'internet';
  title: string;
  content: string;
  relevance: number;
  commands?: string[];
}

export class SearchService {
  private dataDir: string;
  private tavilyApiKey?: string;
  private serperApiKey?: string;

  constructor(dataDir: string, tavilyApiKey?: string, serperApiKey?: string) {
    this.dataDir = dataDir;
    this.tavilyApiKey = tavilyApiKey;
    this.serperApiKey = serperApiKey;
  }

  async searchMarketplace(query: string): Promise<SearchResult[]> {
    const scriptsFile = path.join(this.dataDir, 'scripts.json');
    if (!fs.existsSync(scriptsFile)) {
      return [];
    }

    const scripts: CommandScript[] = JSON.parse(fs.readFileSync(scriptsFile, 'utf-8'));
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const script of scripts) {
      let relevance = 0;

      if (script.name.toLowerCase().includes(queryLower)) relevance += 3;
      if (script.description.toLowerCase().includes(queryLower)) relevance += 2;
      if (script.tags?.some(tag => tag.toLowerCase().includes(queryLower))) relevance += 2;
      if (script.documentContent?.toLowerCase().includes(queryLower)) relevance += 1;

      if (relevance > 0) {
        results.push({
          source: 'marketplace',
          title: script.name,
          content: script.documentContent || script.commands.join('\n'),
          relevance,
          commands: script.commands
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  private isValidApiKey(key: string | undefined): boolean {
    if (!key) return false;
    const placeholders = [
      'your_tavily_api_key_here',
      'your_serper_api_key_here',
      'your_api_key_here',
      'placeholder',
      'xxx',
      'your-api-key',
    ];
    return !placeholders.includes(key.toLowerCase()) && key.length > 10;
  }

  private async searchWithTavily(query: string): Promise<SearchResult[]> {
    if (!this.isValidApiKey(this.tavilyApiKey)) {
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.tavilyApiKey,
          query: query,
          search_depth: 'basic',
          max_results: 5
        })
      });

      const data = await response.json();
      return (data.results || []).map((result: any) => ({
        source: 'internet' as const,
        title: result.title,
        content: result.content,
        relevance: result.score || 1,
        commands: []
      }));
    } catch (error) {
      return [];
    }
  }

  private async searchWithSerper(query: string): Promise<SearchResult[]> {
    if (!this.isValidApiKey(this.serperApiKey)) {
      return [];
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, num: 5 })
      });

      const data = await response.json();
      const results: SearchResult[] = [];
      if (data.organic) {
        for (const result of data.organic) {
          results.push({
            source: 'internet',
            title: result.title,
            content: result.snippet,
            relevance: 1,
            commands: []
          });
        }
      }
      return results;
    } catch (error) {
      return [];
    }
  }

  async searchInternet(query: string): Promise<SearchResult[]> {
    if (this.isValidApiKey(this.tavilyApiKey)) {
      return await this.searchWithTavily(query);
    } else if (this.isValidApiKey(this.serperApiKey)) {
      return await this.searchWithSerper(query);
    }
    return [];
  }

  async searchAll(query: string): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    const marketplaceResults = await this.searchMarketplace(query);
    allResults.push(...marketplaceResults);

    const kbResults = await this.searchKnowledgeBase(query);
    allResults.push(...kbResults);

    if (allResults.length < 3) {
      const internetResults = await this.searchInternet(query);
      allResults.push(...internetResults);
    }

    return allResults.sort((a, b) => b.relevance - a.relevance);
  }

  async searchKnowledgeBase(query: string): Promise<SearchResult[]> {
    const kbFile = path.join(this.dataDir, 'knowledge-base.json');
    if (!fs.existsSync(kbFile)) {
      return [];
    }

    const knowledgeBase: KnowledgeBaseItem[] = JSON.parse(fs.readFileSync(kbFile, 'utf-8'));
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const item of knowledgeBase) {
      let relevance = 0;

      if (item.title.toLowerCase().includes(queryLower)) relevance += 3;
      if (item.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))) relevance += 2;
      if (item.solution.toLowerCase().includes(queryLower)) relevance += 1;

      if (relevance > 0) {
        results.push({
          source: 'knowledge-base',
          title: item.title,
          content: item.solution,
          relevance,
          commands: item.commands
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }
}