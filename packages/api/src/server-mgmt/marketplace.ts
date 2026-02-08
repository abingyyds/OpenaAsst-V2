import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DATA_DIR = path.join(os.homedir(), '.openasst');
const SCRIPTS_FILE = path.join(DATA_DIR, 'scripts.json');
const DEFAULT_API_URL = 'https://openasst.ai';

export interface CommandScript {
  id: string;
  name: string;
  description: string;
  commands: string[];
  category: string;
  tags?: string[];
  documentContent?: string;
  documentType?: string;
}

export class Marketplace {
  private scripts: CommandScript[] = [];
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.OPENASST_API_URL || DEFAULT_API_URL;
    this.loadScripts();
  }

  private loadScripts(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(SCRIPTS_FILE)) {
        const data = fs.readFileSync(SCRIPTS_FILE, 'utf-8');
        this.scripts = JSON.parse(data);
      } else {
        this.scripts = this.getDefaultScripts();
        this.saveScripts();
      }
    } catch (error) {
      this.scripts = this.getDefaultScripts();
    }
  }

  private saveScripts(): void {
    const dir = path.dirname(SCRIPTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(this.scripts, null, 2));
  }

  private getDefaultScripts(): CommandScript[] {
    return [
      {
        id: 'sys-info',
        name: 'System Info',
        description: 'Display basic system information',
        commands: process.platform === 'win32'
          ? ['systeminfo | findstr /B /C:"OS Name" /C:"OS Version"']
          : ['uname -a', 'cat /etc/os-release 2>/dev/null || sw_vers'],
        category: 'monitoring',
        tags: ['system', 'info']
      },
      {
        id: 'disk-usage',
        name: 'Disk Usage',
        description: 'View disk space usage',
        commands: process.platform === 'win32'
          ? ['wmic logicaldisk get size,freespace,caption']
          : ['df -h'],
        category: 'monitoring',
        tags: ['disk', 'storage']
      },
      {
        id: 'network-info',
        name: 'Network Info',
        description: 'Display network configuration',
        commands: process.platform === 'win32'
          ? ['ipconfig']
          : ['ifconfig || ip addr'],
        category: 'network',
        tags: ['network', 'ip']
      }
    ];
  }

  getAll(): CommandScript[] {
    return this.scripts;
  }

  getById(id: string): CommandScript | undefined {
    return this.scripts.find(s => s.id === id);
  }

  search(keyword: string): CommandScript[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.scripts.filter(s =>
      s.name.toLowerCase().includes(lowerKeyword) ||
      s.description.toLowerCase().includes(lowerKeyword) ||
      s.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  async sync(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/scripts`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return { success: false, count: 0, message: `Server returned ${response.status}` };
      }

      const data = await response.json();

      if (data && Array.isArray(data)) {
        const remoteScripts: CommandScript[] = data.map((script: any) => ({
          id: script.id || script._id,
          name: script.name,
          description: script.description,
          commands: script.commands || [],
          category: script.category || 'custom',
          tags: script.tags || [],
          documentContent: script.documentContent,
          documentType: script.documentType
        }));

        const defaultScripts = this.getDefaultScripts();
        const mergedScripts = [...defaultScripts];

        for (const remote of remoteScripts) {
          if (!mergedScripts.find(s => s.id === remote.id)) {
            mergedScripts.push(remote);
          }
        }

        this.scripts = mergedScripts;
        this.saveScripts();

        return {
          success: true,
          count: remoteScripts.length,
          message: `Synced ${remoteScripts.length} scripts from server`
        };
      }

      return { success: false, count: 0, message: 'Invalid response from server' };
    } catch (error: any) {
      return {
        success: false,
        count: 0,
        message: error.cause?.code === 'ECONNREFUSED'
          ? 'Cannot connect to server. Is the backend running?'
          : error.message
      };
    }
  }

  async learnFromExecution(
    task: string,
    commands: string[],
    result: string,
    success: boolean
  ): Promise<{ learned: boolean; message: string }> {
    if (!success) {
      return { learned: false, message: 'Only successful executions are saved' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, commands, result, success }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (data?.learned) {
        return { learned: true, message: 'Experience saved to knowledge base' };
      }
      return { learned: false, message: data?.message || 'Already exists' };
    } catch (error: any) {
      return { learned: false, message: error.message };
    }
  }

  async searchFromApi(keyword: string): Promise<CommandScript[]> {
    try {
      const url = new URL(`${this.apiUrl}/api/scripts/search`);
      url.searchParams.set('q', keyword);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) return this.search(keyword);

      const data = await response.json();

      if (data && Array.isArray(data)) {
        return data.map((script: any) => ({
          id: script.id || script._id,
          name: script.name,
          description: script.description,
          commands: script.commands || [],
          category: script.category || 'custom',
          tags: script.tags || [],
          documentContent: script.document_content || script.documentContent,
          documentType: script.document_type || script.documentType
        }));
      }
      return [];
    } catch (error) {
      return this.search(keyword);
    }
  }
}