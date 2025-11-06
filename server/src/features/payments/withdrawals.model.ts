import { getDb } from '@/config/db.js';

export type WithdrawalDoc = {
  _id: string;
  wallet_role: 'payer' | 'payout';
  user_id: string;
  amount: number;
  to: string;
  state: 'pending' | 'sent' | 'failed';
  tx_hash?: string;
  created_at: string;
};

export async function insertWithdrawal(doc: WithdrawalDoc) {
  const db = await getDb();
  await db.collection<WithdrawalDoc>('withdrawals').insertOne(doc as any);
}

export async function updateWithdrawal(id: string, patch: Partial<WithdrawalDoc>) {
  const db = await getDb();
  await db.collection<WithdrawalDoc>('withdrawals').updateOne({ _id: id }, { $set: patch });
}
