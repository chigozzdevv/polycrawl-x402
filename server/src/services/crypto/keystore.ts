import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { loadEnv } from '@/config/env.js';

function keyBytes() {
  const { KEY_ENCRYPTION_KEY } = process.env as any;
  if (!KEY_ENCRYPTION_KEY) throw new Error('KEY_ENCRYPTION_KEY is required');
  // Derive 32 bytes from provided string
  const buf = Buffer.isBuffer(KEY_ENCRYPTION_KEY)
    ? KEY_ENCRYPTION_KEY
    : Buffer.from(KEY_ENCRYPTION_KEY, /^(?:[A-Za-z0-9+/=]+)$/.test(KEY_ENCRYPTION_KEY) ? 'base64' : 'utf8');
  const digest = createHash('sha256').update(buf).digest();
  return digest; // 32 bytes
}

export function encryptSecret(plaintext: Buffer | string) {
  const key = keyBytes();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(typeof plaintext === 'string' ? Buffer.from(plaintext) : plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: ct.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

export function decryptSecret(enc: { ciphertext: string; iv: string; tag: string }) {
  const key = keyBytes();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(enc.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(enc.tag, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(enc.ciphertext, 'base64')), decipher.final()]);
  return pt;
}
