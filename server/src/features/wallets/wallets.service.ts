import { Keypair } from '@solana/web3.js';
import { encryptSecret } from '@/services/crypto/keystore.js';
import { upsertWalletKey, findWalletKey } from '@/features/wallets/keys.model.js';
import { getOrInitWallet } from '@/features/wallets/wallets.model.js';

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
