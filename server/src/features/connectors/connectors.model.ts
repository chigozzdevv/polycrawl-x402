import { getDb } from '@/config/db.js';

export type ConnectorDoc = {
  _id: string;
  owner_user_id: string;
  site_id?: string;
  dataset_id?: string;
  type: 'api_key' | 'jwt' | 'oauth' | 'internal';
  enc_config: { ciphertext: string; iv: string; tag: string };
  status?: 'active' | 'disabled';
  last_used?: string;
  error_rate?: number;
};

export async function findConnectorById(id: string) {
  const db = await getDb();
  const doc = await db.collection<ConnectorDoc>('connectors').findOne({ _id: id, status: { $ne: 'disabled' } });
  return doc || null;
}

export async function listConnectorsByOwner(userId: string) {
  const db = await getDb();
  const cursor = db.collection<ConnectorDoc>('connectors').find({ owner_user_id: userId, status: { $ne: 'disabled' } } as any).limit(100);
  return cursor.toArray();
}

export async function insertConnector(doc: ConnectorDoc) {
  const db = await getDb();
  await db.collection<ConnectorDoc>('connectors').insertOne(doc as any);
}

export async function updateConnector(id: string, patch: Partial<Omit<ConnectorDoc, '_id' | 'owner_user_id'>>) {
  const db = await getDb();
  await db.collection<ConnectorDoc>('connectors').updateOne({ _id: id } as any, { $set: patch } as any);
}

export async function disableConnector(id: string) {
  const db = await getDb();
  await db.collection<ConnectorDoc>('connectors').updateOne({ _id: id } as any, { $set: { status: 'disabled' } } as any);
}
