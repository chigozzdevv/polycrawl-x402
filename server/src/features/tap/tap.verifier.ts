import type { FastifyRequest } from 'fastify';
import { loadEnv } from '@/config/env.js';
import { importJWK, importSPKI } from 'jose';
import { createVerifier, httpbis, type Algorithm, type SignatureParameters } from 'http-message-signatures';
import { isNonceUsed, recordNonce } from '@/features/tap/nonce.model.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

type Jwk = {
  kty: string;
  kid?: string;
  alg?: string;
  e?: string;
  n?: string;
  crv?: string;
  x?: string;
  y?: string;
};

const JWKS_CACHE_TTL_MS = 60_000;
let jwksCache: { fetchedAt: number; keys: Jwk[] } | null = null;
let localPublicKey: { keyId: string; pem: string } | null = null;

async function loadLocalPublicKey(): Promise<{ keyId: string; pem: string } | null> {
  if (localPublicKey) return localPublicKey;

  const env = loadEnv();
  const localKeyPath = env.TAP_LOCAL_PUBLIC_KEY_PATH || (env as any).TAP_LOCAL_PUBLIC_KEY_PATH;
  if (!localKeyPath) return null;

  try {
    const fullPath = path.resolve(process.cwd(), localKeyPath);
    const pem = await fs.readFile(fullPath, 'utf-8');

    const normalized = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');

    const derivedKeyId = createHash('sha256').update(normalized).digest('base64url');
    const keyId = env.TAP_KEY_ID || derivedKeyId;
    if (env.TAP_KEY_ID && env.TAP_KEY_ID !== derivedKeyId) {
      console.warn('TAP key ID does not match local public key hash, falling back to configured key id');
    }
    localPublicKey = { keyId, pem };
    return localPublicKey;
  } catch (error) {
    console.warn('Failed to load local TAP public key:', error);
    return null;
  }
}

async function loadJwks(): Promise<Jwk[]> {
  const { TAP_JWKS_URL } = loadEnv();
  if (!TAP_JWKS_URL) throw new Error('TAP_JWKS_URL is required');
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(TAP_JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch TAP JWKS');
  const jwks = (await res.json()) as { keys: Jwk[] };
  jwksCache = { fetchedAt: now, keys: jwks.keys || [] };
  return jwksCache.keys;
}

async function resolveKey(keyId?: string): Promise<Jwk | { pem: string; keyId: string }> {
  const localKey = await loadLocalPublicKey();
  if (localKey && keyId === localKey.keyId) {
    return localKey;
  }

  try {
    const keys = await loadJwks();
    const jwk = keyId ? keys.find((k) => k.kid === keyId) : keys[0];
    if (jwk) return jwk;
  } catch (error) {
    console.warn('Failed to fetch JWKS, falling back to local key:', error);
  }

  if (localKey) {
    console.log('Using local TAP public key for verification');
    return localKey;
  }

  throw new Error('TAP key not found');
}

function validateTimestamps(created?: number, expires?: number): void {
  if (!created || !expires) {
    throw new Error('TAP signature missing created or expires timestamp');
  }

  const now = Math.floor(Date.now() / 1000);
  const maxWindow = 8 * 60;

  if (created > now) {
    throw new Error('TAP signature created timestamp is in the future');
  }

  if (expires < now) {
    throw new Error('TAP signature has expired');
  }

  const window = expires - created;
  if (window > maxWindow) {
    throw new Error('TAP signature window exceeds 8 minutes');
  }

  if (now - created > maxWindow) {
    throw new Error('TAP signature created timestamp is too old');
  }
}

function normalizeHeaders(headers: FastifyRequest['headers']): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const normalizedKey = key.toLowerCase();
    if (Array.isArray(value)) {
      result[normalizedKey] = value.map((entry) => String(entry));
    } else {
      result[normalizedKey] = String(value);
    }
  }
  return result;
}

export async function verifyTapRequest(req: FastifyRequest): Promise<string> {
  const signatureInput = req.headers['signature-input'];
  const signature = req.headers['signature'];
  if (!signatureInput || !signature) throw new Error('Missing TAP signature headers');

  let paramsCaptured: SignatureParameters | undefined;
  let nonceToRecord: string | undefined;

  const verificationResult = await httpbis.verifyMessage(
    {
      async keyLookup(params) {
        paramsCaptured = params;

        const tag = (params as any).tag ? String((params as any).tag) : undefined;
        if (!tag || (tag !== 'agent-browser-auth' && tag !== 'agent-payer-auth')) {
          throw new Error('TAP signature missing required tag (agent-browser-auth or agent-payer-auth)');
        }

        const created = typeof params.created === 'number' ? params.created : undefined;
        const expires = typeof params.expires === 'number' ? params.expires : undefined;
        validateTimestamps(created, expires);

        const nonce = params.nonce ? String(params.nonce) : undefined;
        if (nonce) {
          const used = await isNonceUsed(nonce);
          if (used) {
            throw new Error('TAP nonce has already been used (replay attack detected)');
          }
          nonceToRecord = nonce;
        }

        const keyId = params.keyid ? String(params.keyid) : undefined;
        const resolvedKey = await resolveKey(keyId);

        let keyObject: any;
        let algorithm: Algorithm;

        if ('pem' in resolvedKey) {
          keyObject = await importSPKI(resolvedKey.pem, 'Ed25519');
          algorithm = (params.alg ?? 'ed25519') as Algorithm;
        } else {
          keyObject = await importJWK(resolvedKey as any);
          algorithm = (params.alg ?? resolvedKey.alg ?? 'ed25519') as Algorithm;
        }

        return {
          id: keyId,
          alg: algorithm,
          verify: createVerifier(keyObject as any, algorithm),
        };
      },
    },
    {
      method: req.method ?? 'GET',
      url: req.url ?? '/',
      headers: normalizeHeaders(req.headers),
    }
  );

  if (!verificationResult) {
    throw new Error('Invalid TAP signature');
  }

  if (nonceToRecord) {
    await recordNonce(nonceToRecord, paramsCaptured?.keyid ? String(paramsCaptured.keyid) : 'unknown');
  }

  return paramsCaptured?.keyid ? String(paramsCaptured.keyid) : '';
}
