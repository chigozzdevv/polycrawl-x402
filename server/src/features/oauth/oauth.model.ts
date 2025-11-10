import { getDb } from '@/config/db.js';
import { randomBytes, createHash } from 'node:crypto';

export type OAuthClientDoc = {
  _id: string;
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none' | 'client_secret_post';
  client_secret_hash?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
};

export type AuthorizationCodeDoc = {
  _id: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  resource: string;
  scope: string[];
  expires_at: Date;
  created_at: Date;
  consumed?: boolean;
  agent_id?: string;
};

export type RefreshTokenDoc = {
  _id: string;
  client_id: string;
  user_id: string;
  hashed_token: string;
  scope: string[];
  resource: string;
  created_at: Date;
  expires_at: Date;
  revoked?: boolean;
  replacement_for?: string;
  agent_id?: string;
};

export function generateClientId() {
  return 'cl_' + randomBytes(24).toString('hex');
}

export function generateAuthorizationCode() {
  return 'ac_' + randomBytes(24).toString('hex');
}

export function generateRefreshTokenValue() {
  return randomBytes(48).toString('base64url');
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('base64url');
}

export async function insertClient(doc: OAuthClientDoc) {
  const db = await getDb();
  await db.collection<OAuthClientDoc>('oauth_clients').insertOne(doc as any);
  return doc;
}

export async function findClientById(id: string) {
  const db = await getDb();
  const doc = await db.collection<OAuthClientDoc>('oauth_clients').findOne({ _id: id });
  return doc || null;
}

export async function insertAuthorizationCode(doc: AuthorizationCodeDoc) {
  const db = await getDb();
  await db.collection<AuthorizationCodeDoc>('oauth_authorization_codes').insertOne(doc as any);
  return doc;
}

export async function consumeAuthorizationCode(code: string) {
  const db = await getDb();
  const coll = db.collection<AuthorizationCodeDoc>('oauth_authorization_codes');
  const result = await coll.findOneAndUpdate(
    { _id: code, consumed: { $ne: true } } as any,
    { $set: { consumed: true } },
    { returnDocument: 'after' }
  );
  return (result as any)?.value || null;
}

export async function deleteAuthorizationCode(code: string) {
  const db = await getDb();
  await db.collection('oauth_authorization_codes').deleteOne({ _id: code } as any);
}

export async function insertRefreshToken(doc: RefreshTokenDoc) {
  const db = await getDb();
  await db.collection<RefreshTokenDoc>('oauth_refresh_tokens').insertOne(doc as any);
  return doc;
}

export async function findRefreshToken(hashed: string) {
  const db = await getDb();
  const doc = await db.collection<RefreshTokenDoc>('oauth_refresh_tokens').findOne({ hashed_token: hashed, revoked: { $ne: true } } as any);
  return doc || null;
}

export async function revokeRefreshToken(id: string) {
  const db = await getDb();
  await db.collection('oauth_refresh_tokens').updateOne({ _id: id } as any, { $set: { revoked: true } });
}
