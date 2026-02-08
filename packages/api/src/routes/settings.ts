import { Hono } from 'hono';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

export const settingsRoutes = new Hono();

interface Settings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  [key: string]: unknown;
}

const SETTINGS_DIR = join(homedir(), '.openasst');
const SETTINGS_FILE = join(SETTINGS_DIR, 'config.json');

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-20250514',
};

function ensureSettingsFile(): void {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  if (!existsSync(SETTINGS_FILE)) {
    writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

function readSettings(): Settings {
  ensureSettingsFile();
  try {
    const raw = readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: Settings): void {
  ensureSettingsFile();
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

// Get current settings
settingsRoutes.get('/', async (c) => {
  try {
    const settings = readSettings();
    return c.json({ settings });
  } catch {
    return c.json({ error: 'Failed to read settings' }, 500);
  }
});

// Save settings
settingsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const current = readSettings();
    const updated = { ...current, ...body };
    writeSettings(updated);
    return c.json({ settings: updated });
  } catch {
    return c.json({ error: 'Failed to save settings' }, 500);
  }
});

// List available models
settingsRoutes.get('/models', async (c) => {
  const models = [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', provider: 'anthropic' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
  ];
  return c.json({ models });
});
