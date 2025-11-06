import { getDb } from '@/config/db.js';

export type ConnectorDoc = {
  _id: string;
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
