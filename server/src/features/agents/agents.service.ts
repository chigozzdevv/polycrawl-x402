import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';

export async function createAgent(userId: string, name: string, clientId?: string) {
  const db = await getDb();
  const _id = 'ag_' + randomUUID();
  const client_key = 'ak_' + randomUUID();
  const doc = {
    _id,
    user_id: userId,
    name,
    client_key,
    client_id: clientId,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  await db.collection('agents').insertOne(doc as any);
  return doc;
}

export async function listAgentsByUser(userId: string) {
  const db = await getDb();
  const cur = db.collection('agents').find({ user_id: userId, status: { $ne: 'revoked' } });
  return await cur.toArray();
}

export async function findAgentByClient(userId: string, clientId: string) {
  const db = await getDb();
  const doc = await db.collection('agents').findOne({ user_id: userId, client_id: clientId, status: { $ne: 'revoked' } });
  return doc || null;
}

export async function ensureAgentForClient(userId: string, clientId: string) {
  const existing = await findAgentByClient(userId, clientId);
  if (existing) return existing._id;
  const name = `OAuth Client ${clientId.slice(-6)}`;
  const doc = await createAgent(userId, name, clientId);
  return doc._id;
}
