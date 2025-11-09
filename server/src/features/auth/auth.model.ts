import { getDb } from '@/config/db.js';

export type UserDoc = { _id: string; name: string; email: string; password_hash: string; roles: string[]; created_at: string };

export async function findUserByEmail(email: string) {
  const db = await getDb();
  return (await db.collection<UserDoc>('users').findOne({ email })) || null;
}

export async function insertUser(doc: UserDoc) {
  const db = await getDb();
  await db.collection<UserDoc>('users').insertOne(doc as any);
}

export async function findUserById(id: string) {
  const db = await getDb();
  return (await db.collection<UserDoc>('users').findOne({ _id: id } as any)) || null;
}

export async function updateUserPassword(id: string, password_hash: string) {
  const db = await getDb();
  await db.collection<UserDoc>('users').updateOne({ _id: id } as any, { $set: { password_hash } });
}

// Wallet link + challenge (Solana)
export type WalletLinkDoc = {
  _id: string;
  user_id: string;
  chain: 'solana';
  address: string;
  created_at: string;
  last_verified_at?: string;
};

export type WalletChallengeDoc = {
  _id: string;
  chain: 'solana';
  address: string;
  nonce: string;
  expires_at: string;
  used: boolean;
  created_at: string;
};

export async function upsertWalletLink(doc: WalletLinkDoc) {
  const db = await getDb();
  await db.collection<WalletLinkDoc>('wallet_links').updateOne(
    { chain: doc.chain, address: doc.address },
    { $setOnInsert: { _id: doc._id, created_at: doc.created_at }, $set: { user_id: doc.user_id, last_verified_at: doc.last_verified_at } },
    { upsert: true }
  );
}

export async function findWalletLinkByAddress(chain: 'solana', address: string) {
  const db = await getDb();
  return (await db.collection<WalletLinkDoc>('wallet_links').findOne({ chain, address })) || null;
}

export async function createOrReplaceChallenge(doc: WalletChallengeDoc) {
  const db = await getDb();
  await db.collection<WalletChallengeDoc>('wallet_challenges').updateOne(
    { chain: doc.chain, address: doc.address },
    { $setOnInsert: { _id: doc._id, created_at: doc.created_at }, $set: { nonce: doc.nonce, expires_at: doc.expires_at, used: doc.used } },
    { upsert: true }
  );
}

export async function findValidChallenge(chain: 'solana', address: string, nonce: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  return (await db
    .collection<WalletChallengeDoc>('wallet_challenges')
    .findOne({ chain, address, nonce, used: false, expires_at: { $gt: now } } as any)) || null;
}

export async function markChallengeUsed(id: string) {
  const db = await getDb();
  await db.collection<WalletChallengeDoc>('wallet_challenges').updateOne({ _id: id }, { $set: { used: true } });
}

// Password reset tokens
export type PasswordResetDoc = {
  _id: string; // token id
  user_id: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
};

export async function insertResetToken(doc: PasswordResetDoc) {
  const db = await getDb();
  await db.collection<PasswordResetDoc>('password_resets').insertOne(doc as any);
}

export async function findValidResetToken(token_hash: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  return (await db
    .collection<PasswordResetDoc>('password_resets')
    .findOne({ token_hash, used: false, expires_at: { $gt: now } } as any)) || null;
}

export async function markResetUsed(id: string) {
  const db = await getDb();
  await db.collection<PasswordResetDoc>('password_resets').updateOne({ _id: id }, { $set: { used: true } });
}
