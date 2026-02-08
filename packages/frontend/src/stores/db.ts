import Dexie, { type Table } from 'dexie';

export interface SessionRecord {
  id?: string;
  deviceId?: string;
  type: 'chat' | 'terminal' | 'code' | 'document' | 'website' | 'files';
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id?: string;
  sessionId?: string;
  title: string;
  prompt: string;
  status: string;
  workDir: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id?: number;
  sessionId?: string;
  taskId: string;
  type: string;
  role?: string;
  content?: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  isError?: boolean;
  createdAt: Date;
}

export interface CommandHistoryRecord {
  id?: number;
  sessionId: string;
  deviceId: string;
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  createdAt: Date;
}

class OpenAsstDB extends Dexie {
  sessions!: Table<SessionRecord>;
  tasks!: Table<TaskRecord>;
  messages!: Table<MessageRecord>;
  commandHistory!: Table<CommandHistoryRecord>;

  constructor() {
    super('openasst');

    this.version(1).stores({
      tasks: '++id, status, createdAt',
      messages: '++id, taskId, type, createdAt',
    });

    this.version(2).stores({
      sessions: '++id, deviceId, type, updatedAt',
      tasks: '++id, sessionId, status, createdAt',
      messages: '++id, sessionId, taskId, type, createdAt',
      commandHistory: '++id, sessionId, deviceId, createdAt',
    });
  }
}

export const db = new OpenAsstDB();
