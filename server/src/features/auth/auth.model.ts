import { getDb } from '@/config/db.js';

export type UserDoc = { _id: string; name: string; email: string; password_hash: string; created_at: string };

export async function findUserByEmail(email: string) {
  const db = await getDb();
  return (await db.collection<UserDoc>('users').findOne({ email })) || null;
}

export async function insertUser(doc: UserDoc) {
  const db = await getDb();
  await db.collection<UserDoc>('users').insertOne(doc as any);
}
