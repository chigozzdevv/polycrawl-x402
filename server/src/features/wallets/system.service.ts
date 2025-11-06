import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';
import type { WalletDoc } from '@/features/wallets/wallets.model.js';

export async function getFeeWallet() {
  const db = await getDb();
  const id = '__system_fee__';
  let w = await db.collection<WalletDoc>('wallets').findOne({ owner_user_id: id, role: 'payout' });
  if (w) return w;
  const doc: WalletDoc = { _id: 'w_' + randomUUID(), owner_user_id: id, role: 'payout', currency: 'USD', available: 0, blocked: 0, status: 'active' };
  await db.collection<WalletDoc>('wallets').insertOne(doc as any);
  return doc;
}
