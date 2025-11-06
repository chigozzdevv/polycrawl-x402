import { getDb } from '@/config/db.js';

export type ProviderDoc = { _id: string; user_id: string; created_at?: string };

export async function findProviderById(id: string) {
  const db = await getDb();
  const doc = await db.collection<ProviderDoc>('providers').findOne({ _id: id });
  return doc || null;
}
