import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const SESSIONS_DIR = path.join(os.homedir(), '.openasst', 'sessions');
const INDEX_FILE = path.join(SESSIONS_DIR, 'index.json');

export interface SessionMeta {
  id: string;
  deviceId?: string;
  type: 'chat' | 'terminal' | 'code';
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  type: string;
  role?: string;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
  createdAt: string;
}

export interface SessionCommand {
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  createdAt: string;
}

interface SessionData {
  id: string;
  messages: SessionMessage[];
  commandHistory: SessionCommand[];
}

export class SessionManager {
  private index: SessionMeta[] = [];

  constructor() {
    this.ensureDir();
    this.loadIndex();
  }

  private ensureDir(): void {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  private loadIndex(): void {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        this.index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      }
    } catch {
      this.index = [];
    }
  }

  private saveIndex(): void {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(this.index, null, 2));
  }

  private sessionPath(id: string): string {
    return path.join(SESSIONS_DIR, `${id}.json`);
  }

  createSession(type: SessionMeta['type'], title: string, deviceId?: string): SessionMeta {
    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const meta: SessionMeta = { id, type, title, deviceId, createdAt: now, updatedAt: now };
    this.index.push(meta);
    this.saveIndex();

    const data: SessionData = { id, messages: [], commandHistory: [] };
    fs.writeFileSync(this.sessionPath(id), JSON.stringify(data, null, 2));
    return meta;
  }

  listSessions(deviceId?: string): SessionMeta[] {
    let result = this.index;
    if (deviceId) {
      result = result.filter((s) => s.deviceId === deviceId);
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getSession(id: string): (SessionMeta & SessionData) | null {
    const meta = this.index.find((s) => s.id === id);
    if (!meta) return null;

    try {
      const data: SessionData = JSON.parse(fs.readFileSync(this.sessionPath(id), 'utf-8'));
      return { ...meta, ...data };
    } catch {
      return { ...meta, messages: [], commandHistory: [] };
    }
  }

  deleteSession(id: string): boolean {
    const idx = this.index.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    this.index.splice(idx, 1);
    this.saveIndex();

    try { fs.unlinkSync(this.sessionPath(id)); } catch { /* ignore */ }
    return true;
  }

  addMessage(id: string, msg: SessionMessage): void {
    const filePath = this.sessionPath(id);
    try {
      const data: SessionData = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : { id, messages: [], commandHistory: [] };
      data.messages.push(msg);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      this.touchSession(id);
    } catch { /* ignore */ }
  }

  addCommand(id: string, cmd: SessionCommand): void {
    const filePath = this.sessionPath(id);
    try {
      const data: SessionData = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : { id, messages: [], commandHistory: [] };
      data.commandHistory.push(cmd);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      this.touchSession(id);
    } catch { /* ignore */ }
  }

  private touchSession(id: string): void {
    const meta = this.index.find((s) => s.id === id);
    if (meta) {
      meta.updatedAt = new Date().toISOString();
      this.saveIndex();
    }
  }
}
