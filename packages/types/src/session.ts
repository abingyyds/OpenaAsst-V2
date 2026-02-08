export type SessionType = 'chat' | 'terminal' | 'code' | 'document' | 'website' | 'files';

export interface Session {
  id: string;
  deviceId?: string;
  type: SessionType;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandHistory {
  id?: number;
  sessionId: string;
  deviceId: string;
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  createdAt: Date;
}
