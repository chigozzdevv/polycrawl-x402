import { getDb } from '@/config/db.js';

export type AgentDoc = {
  _id: string;
  user_id: string;
  name: string;
  client_key: string; // bearer token
  tap_agent_id?: string;
  status?: 'active' | 'revoked';
};

export async function findAgentByKey(key: string) {
  const db = await getDb();
  const doc = await db.collection<AgentDoc>('agents').findOne({ client_key: key, status: { $ne: 'revoked' } });
  return doc || null;
}
