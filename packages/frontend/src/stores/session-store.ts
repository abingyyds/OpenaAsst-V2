import { db, type SessionRecord, type MessageRecord, type CommandHistoryRecord } from './db';
import { nanoid } from 'nanoid';

export async function createSession(
  type: SessionRecord['type'],
  title: string,
  deviceId?: string,
): Promise<string> {
  const id = nanoid();
  const now = new Date();
  await db.sessions.add({ id, type, title, deviceId, createdAt: now, updatedAt: now });
  return id;
}

export async function listSessions(deviceId?: string): Promise<SessionRecord[]> {
  let query = db.sessions.orderBy('updatedAt').reverse();
  if (deviceId) {
    return db.sessions.where('deviceId').equals(deviceId).reverse().sortBy('updatedAt');
  }
  return query.toArray();
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  return db.sessions.get(id);
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  await db.sessions.update(id, { title, updatedAt: new Date() });
}

export async function touchSession(id: string): Promise<void> {
  await db.sessions.update(id, { updatedAt: new Date() });
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.messages, db.commandHistory], async () => {
    await db.messages.where('sessionId').equals(id).delete();
    await db.commandHistory.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

export async function saveMessage(
  sessionId: string,
  msg: Omit<MessageRecord, 'id' | 'createdAt'>,
): Promise<void> {
  await db.messages.add({ ...msg, sessionId, createdAt: new Date() });
  await touchSession(sessionId);
}

export async function getSessionMessages(sessionId: string): Promise<MessageRecord[]> {
  return db.messages.where('sessionId').equals(sessionId).sortBy('createdAt');
}

export async function saveCommand(
  record: Omit<CommandHistoryRecord, 'id' | 'createdAt'>,
): Promise<void> {
  await db.commandHistory.add({ ...record, createdAt: new Date() });
  await touchSession(record.sessionId);
}

export async function getCommandHistory(
  deviceId: string,
  limit = 100,
): Promise<CommandHistoryRecord[]> {
  const all = await db.commandHistory
    .where('deviceId')
    .equals(deviceId)
    .reverse()
    .sortBy('createdAt');
  return all.slice(0, limit).reverse();
}
