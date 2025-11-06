import { MongoClient, Db } from 'mongodb';
import { loadEnv } from '@/config/env.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  const { MONGODB_URI } = loadEnv();
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  const url = new URL(MONGODB_URI);
  const dbName = (url.pathname && url.pathname.replace('/', '')) || 'polycrawl';
  db = client.db(dbName);
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
