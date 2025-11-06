import { getDb } from '@/config/db.js';

export type DepositDoc = {
  _id: string;
  wallet_role: 'payer' | 'payout';
  user_id: string;
  amount: number;
  state: 'pending' | 'confirmed' | 'failed';
  instructions?: any;
  tx_hash?: string;
  created_at: string;
};

export async function insertDeposit(doc: DepositDoc) {
  const db = await getDb();
  await db.collection<DepositDoc>('deposits').insertOne(doc as any);
}

export async function updateDeposit(id: string, patch: Partial<DepositDoc>) {
  const db = await getDb();
  await db.collection<DepositDoc>('deposits').updateOne({ _id: id }, { $set: patch });
}
