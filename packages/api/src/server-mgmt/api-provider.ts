import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.openasst', 'config.json');

function readConfig(): { apiKey?: string; baseUrl?: string; model?: string } | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

export interface APIExport {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  exportedAt: string;
  expiresAt?: string;
}

export interface SharedAPIConfig {
  openasst: APIExport;
  targets: {
    [key: string]: {
      configPath: string;
      format: 'env' | 'json' | 'yaml';
      keyMapping: { [key: string]: string };
    };
  };
}

export class APIProvider {
  private configDir: string;
  private sharedConfigPath: string;

  private knownTools: { [key: string]: { configPath: string; format: 'env' | 'json'; keyMapping: { [key: string]: string } } } = {
    'claude-code': {
      configPath: path.join(os.homedir(), '.claude', 'settings.json'),
      format: 'json',
      keyMapping: {
        apiKey: 'apiKey',
        baseUrl: 'apiBaseUrl',
        model: 'model'
      }
    },
    'cursor': {
      configPath: path.join(os.homedir(), '.cursor', 'settings.json'),
      format: 'json',
      keyMapping: {
        apiKey: 'anthropic.apiKey',
        baseUrl: 'anthropic.baseUrl'
      }
    },
    'continue': {
      configPath: path.join(os.homedir(), '.continue', 'config.json'),
      format: 'json',
      keyMapping: {
        apiKey: 'models[0].apiKey',
        baseUrl: 'models[0].apiBase'
      }
    },
    'aider': {
      configPath: path.join(os.homedir(), '.aider.conf.yml'),
      format: 'env',
      keyMapping: {
        apiKey: 'ANTHROPIC_API_KEY',
        baseUrl: 'ANTHROPIC_BASE_URL'
      }
    },
    'shell-env': {
      configPath: path.join(os.homedir(), '.bashrc'),
      format: 'env',
      keyMapping: {
        apiKey: 'ANTHROPIC_API_KEY',
        baseUrl: 'ANTHROPIC_BASE_URL',
        model: 'ANTHROPIC_MODEL'
      }
    }
  };

  constructor() {
    this.configDir = path.join(os.homedir(), '.openasst');
    this.sharedConfigPath = path.join(this.configDir, 'shared-api.json');
  }

  getAPIConfig(): { apiKey?: string; baseUrl?: string; model?: string } | null {
    return readConfig();
  }

  exportAPI(): APIExport | null {
    const config = this.getAPIConfig();
    if (!config || !config.apiKey) {
      return null;
    }

    return {
      provider: 'anthropic',
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      exportedAt: new Date().toISOString()
    };
  }

  async shareWithTool(toolName: string): Promise<boolean> {
    const config = this.getAPIConfig();
    if (!config || !config.apiKey) {
      return false;
    }

    const tool = this.knownTools[toolName];
    if (!tool) {
      return false;
    }

    try {
      if (tool.format === 'json') {
        return this.shareAsJSON(tool, config as any);
      } else {
        return this.shareAsEnv(tool, config as any);
      }
    } catch (error) {
      return false;
    }
  }

  private shareAsJSON(
    tool: { configPath: string; keyMapping: { [key: string]: string } },
    config: { apiKey: string; baseUrl?: string; model?: string }
  ): boolean {
    let existingConfig: any = {};

    if (fs.existsSync(tool.configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(tool.configPath, 'utf-8'));
      } catch {
        existingConfig = {};
      }
    }

    const dir = path.dirname(tool.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (tool.keyMapping.apiKey) {
      this.setNestedValue(existingConfig, tool.keyMapping.apiKey, config.apiKey);
    }
    if (tool.keyMapping.baseUrl && config.baseUrl) {
      this.setNestedValue(existingConfig, tool.keyMapping.baseUrl, config.baseUrl);
    }
    if (tool.keyMapping.model && config.model) {
      this.setNestedValue(existingConfig, tool.keyMapping.model, config.model);
    }

    fs.writeFileSync(tool.configPath, JSON.stringify(existingConfig, null, 2));
    return true;
  }

  private shareAsEnv(
    tool: { configPath: string; keyMapping: { [key: string]: string } },
    config: { apiKey: string; baseUrl?: string; model?: string }
  ): boolean {
    const envLines: string[] = [
      '',
      '# OpenAsst Shared API Configuration',
      `# Exported at: ${new Date().toISOString()}`
    ];

    if (tool.keyMapping.apiKey) {
      envLines.push(`export ${tool.keyMapping.apiKey}="${config.apiKey}"`);
    }
    if (tool.keyMapping.baseUrl && config.baseUrl) {
      envLines.push(`export ${tool.keyMapping.baseUrl}="${config.baseUrl}"`);
    }
    if (tool.keyMapping.model && config.model) {
      envLines.push(`export ${tool.keyMapping.model}="${config.model}"`);
    }

    const content = envLines.join('\n') + '\n';
    fs.appendFileSync(tool.configPath, content);
    return true;
  }

  private setNestedValue(obj: any, keyPath: string, value: any): void {
    const keys = keyPath.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  listAvailableTools(): string[] {
    return Object.keys(this.knownTools);
  }

  generateEnvExport(): string {
    const config = this.getAPIConfig();
    if (!config) return '';

    const lines = [
      `export ANTHROPIC_API_KEY="${config.apiKey}"`,
    ];

    if (config.baseUrl) {
      lines.push(`export ANTHROPIC_BASE_URL="${config.baseUrl}"`);
    }
    if (config.model) {
      lines.push(`export ANTHROPIC_MODEL="${config.model}"`);
    }

    return lines.join('\n');
  }

  getAPIEndpoint(): { apiKey: string; baseUrl: string; model: string } | null {
    const config = this.getAPIConfig();
    if (!config || !config.apiKey) return null;

    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.anthropic.com',
      model: config.model || 'claude-3-5-sonnet-20241022'
    };
  }
}