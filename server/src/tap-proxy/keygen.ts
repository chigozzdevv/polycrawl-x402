import { generateKeyPair, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const generateKeyPairAsync = promisify(generateKeyPair);

export async function generateTapAgentKeyPair() {
  const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { publicKey, privateKey };
}

export async function generateAndSaveKeyPair(outputDir: string) {
  const { publicKey, privateKey } = await generateTapAgentKeyPair();

  await fs.mkdir(outputDir, { recursive: true });

  const publicKeyPath = path.join(outputDir, 'tap-agent-public.pem');
  const privateKeyPath = path.join(outputDir, 'tap-agent-private.pem');

  await fs.writeFile(publicKeyPath, publicKey, 'utf-8');
  await fs.writeFile(privateKeyPath, privateKey, 'utf-8');

  const keyId = generateKeyId(publicKey);

  console.log('TAP Agent Key Pair Generated!');
  console.log('Public Key:', publicKeyPath);
  console.log('Private Key:', privateKeyPath);
  console.log('Key ID:', keyId);
  console.log('\nIMPORTANT: Register this public key with Visa TAP at https://developer.visa.com/');

  return { publicKey, privateKey, keyId, publicKeyPath, privateKeyPath };
}

export function generateKeyId(publicKey: string): string {
  const normalized = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  const hash = createHash('sha256').update(normalized).digest('base64url');
  return hash;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const outputDir = process.argv[2] || path.join(process.cwd(), '.tap-keys');
  generateAndSaveKeyPair(outputDir).catch(console.error);
}
