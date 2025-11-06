import { getDb } from '@/config/db.js';

export type NonceDoc = {
  _id: string; // nonce value
  keyid: string; // TAP key identifier
  created_at: Date;
  expires_at: Date;
};

export async function isNonceUsed(nonce: string): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection<NonceDoc>('tap_nonces').findOne({ _id: nonce });
  return !!doc;
}

export async function recordNonce(nonce: string, keyid: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 1000);
  await db.collection<NonceDoc>('tap_nonces').insertOne({
    _id: nonce,
    keyid,
    created_at: now,
    expires_at: expiresAt,
  } as any);
}

export async function createNonceIndexes() {
  const db = await getDb();

  // TTL index to auto-delete expired nonces after 8 minutes
  await db.collection('tap_nonces').createIndex(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
  );

  // Index for efficient lookup
  await db.collection('tap_nonces').createIndex({ _id: 1 });
}
