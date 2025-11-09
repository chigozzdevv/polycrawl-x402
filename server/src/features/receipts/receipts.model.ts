import { SignJWT, importPKCS8 } from 'jose';
import { getDb } from '@/config/db.js';
import { loadEnv } from '@/config/env.js';

type ReceiptDoc = { _id: string; request_id: string; json: any; ed25519_sig: string; ts: string };
type SigningKey = Awaited<ReturnType<typeof importPKCS8>>;

// Lazily import the Ed25519 signing key once; used to bind a signed receipt to each fulfilled request
let keyPromise: Promise<SigningKey> | null = null;
async function getSigningKey() {
  if (!keyPromise) {
    const { ED25519_PRIVATE_KEY } = process.env as any;
    if (!ED25519_PRIVATE_KEY) throw new Error('ED25519_PRIVATE_KEY is required');
    keyPromise = importPKCS8(ED25519_PRIVATE_KEY, 'EdDSA');
  }
  return keyPromise;
}

// Persists a receipt and returns it with an Ed25519 JWT signature for verification by clients
export async function createSignedReceipt(payload: any) {
  const db = await getDb();
  const key = await getSigningKey();
  const ts = new Date().toISOString();
  const jwt = await new SignJWT(payload).setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' }).setIssuedAt().setExpirationTime('10y').sign(key);
  const doc: ReceiptDoc = { _id: payload.id, request_id: payload.request_id || payload.id, json: payload, ed25519_sig: jwt, ts };
  await db.collection<ReceiptDoc>('receipts').insertOne(doc as any);
  return { ...payload, sig: jwt };
}

export async function listRecentReceiptsByUserId(userId: string, limit = 5) {
  const db = await getDb();
  const cursor = db
    .collection<ReceiptDoc>('receipts')
    .find({ 'json.userId': userId } as any)
    .sort({ ts: -1 })
    .limit(limit);
  return cursor.toArray();
}
