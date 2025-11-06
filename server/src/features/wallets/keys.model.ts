import { getDb } from '@/config/db.js';

export type WalletKeyDoc = {
  _id: string;
  owner_user_id: string;
  role: 'payer' | 'payout';
  chain: 'solana';
  public_key: string;
  enc: { ciphertext: string; iv: string; tag: string };
  created_at: string;
};

export async function upsertWalletKey(doc: WalletKeyDoc) {
  const db = await getDb();
  await db.collection<WalletKeyDoc>('wallet_keys').updateOne(
    { owner_user_id: doc.owner_user_id, role: doc.role, chain: doc.chain },
    { $set: doc },
    { upsert: true }
  );
}

export async function findWalletKey(ownerUserId: string, role: 'payer' | 'payout', chain: 'solana' = 'solana') {
  const db = await getDb();
  const doc = await db.collection<WalletKeyDoc>('wallet_keys').findOne({ owner_user_id: ownerUserId, role, chain });
  return doc || null;
}
