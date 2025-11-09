import { Keypair } from '@solana/web3.js';
import { encryptSecret } from '@/services/crypto/keystore.js';
import { upsertWalletKey, findWalletKey } from '@/features/wallets/keys.model.js';
import { getOrInitWallet, debitWallet } from '@/features/wallets/wallets.model.js';
import { insertDeposit } from '@/features/payments/deposits.model.js';
import { insertWithdrawal, updateWithdrawal } from '@/features/payments/withdrawals.model.js';

export async function initUserWallets(userId: string) {
  await getOrInitWallet(userId, 'payer');
  await getOrInitWallet(userId, 'payout');
  await ensureSolanaKey(userId, 'payer');
  await ensureSolanaKey(userId, 'payout');
}

export async function ensureSolanaKey(userId: string, role: 'payer' | 'payout') {
  const existing = await findWalletKey(userId, role);
  if (existing) return existing;
  const kp = Keypair.generate();
  const enc = encryptSecret(Buffer.from(kp.secretKey));
  const doc = {
    _id: crypto.randomUUID(),
    owner_user_id: userId,
    role,
    chain: 'solana' as const,
    public_key: kp.publicKey.toBase58(),
    enc,
    created_at: new Date().toISOString(),
  };
  await upsertWalletKey(doc);
  return doc;
}

export async function getWallets(userId: string) {
  const payer = await getOrInitWallet(userId, 'payer');
  const payout = await getOrInitWallet(userId, 'payout');
  return { payer, payout };
}

export async function createDepositService(userId: string, role: 'payer' | 'payout', amount: number) {
  const depId = 'dep_' + crypto.randomUUID();
  await insertDeposit({ _id: depId, user_id: userId, wallet_role: role, amount, state: 'pending', instructions: null as any, created_at: new Date().toISOString() });
  return { id: depId, instructions: null as any };
}

export async function createWithdrawalService(userId: string, role: 'payer' | 'payout', amount: number, to: string) {
  const wId = 'wd_' + crypto.randomUUID();
  await debitWallet(userId, role, amount, 'withdrawal', wId);
  await insertWithdrawal({ _id: wId, user_id: userId, wallet_role: role, amount, to, state: 'pending', created_at: new Date().toISOString() });
  await updateWithdrawal(wId, { state: 'sent', tx_hash: undefined });
  return { id: wId, tx_hash: null as any };
}

export async function listWithdrawalsService(userId: string, limit = 50) {
  const { getDb } = await import('@/config/db.js');
  const db = await getDb();
  return db.collection('withdrawals')
    .find({ user_id: userId } as any)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

export async function listDepositsService(userId: string, limit = 50) {
  const { getDb } = await import('@/config/db.js');
  const db = await getDb();
  return db.collection('deposits')
    .find({ user_id: userId } as any)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}
