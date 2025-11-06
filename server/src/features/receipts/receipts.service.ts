import { getDb } from '@/config/db.js';

export async function findReceiptById(id: string) {
  const db = await getDb();
  return (await db.collection('receipts').findOne({ _id: id } as any)) || null;
}

export async function listReceiptsByUserId(userId: string, limit = 20) {
  const db = await getDb();
  return db
    .collection('receipts')
    .find({ 'json.userId': userId } as any)
    .sort({ ts: -1 })
    .limit(limit)
    .toArray();
}
