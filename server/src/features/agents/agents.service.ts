import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';

export async function createAgent(userId: string, name: string) {
  const db = await getDb();
  const _id = 'ag_' + randomUUID();
  const client_key = 'ak_' + randomUUID();
  const doc = { _id, user_id: userId, name, client_key, status: 'active', created_at: new Date().toISOString() };
  await db.collection('agents').insertOne(doc as any);
  return doc;
}

export async function listAgentsByUser(userId: string) {
  const db = await getDb();
  const cur = db.collection('agents').find({ user_id: userId, status: { $ne: 'revoked' } });
  return await cur.toArray();
}
