import { createSign, sign as nodeSign, constants, createPrivateKey } from 'node:crypto';
import { randomBytes } from 'node:crypto';

export type TapSignOptions = {
  privateKey: string; // PEM (PKCS#8 for Ed25519, PKCS#1/8 for RSA, SPKI for EC)
  keyId: string;
  tag: 'agent-browser-auth' | 'agent-payer-auth';
  // RFC 9421 algorithm identifiers (lowercase)
  // Keep optional to default to 'ed25519'
  algorithm?: 'ed25519' | 'rsa-pss-sha256' | 'rsa-sha256' | 'ecdsa-p256-sha256';
  expiresIn?: number; // seconds
};

export function generateNonce(): string {
  return randomBytes(48).toString('base64');
}

export function signTapRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  options: TapSignOptions
): { signatureInput: string; signature: string } {
  const parsedUrl = new URL(url);
  const authority = parsedUrl.host;
  const path = parsedUrl.pathname + parsedUrl.search;

  const created = Math.floor(Date.now() / 1000);
  const expires = created + (options.expiresIn || 480);
  const nonce = generateNonce();
  const alg = (options.algorithm || 'ed25519');

  const coveredComponents = [`"@authority"`, `"@path"`];

  const signatureBase = buildSignatureBase({
    method,
    authority,
    path,
    headers,
    body,
    coveredComponents,
    created,
    expires,
    keyId: options.keyId,
    alg,
    nonce,
    tag: options.tag,
  });

  // Produce signature bytes per selected algorithm
  let signatureBytes: Buffer;

  if (alg === 'ed25519') {
    // For Ed25519, Node's crypto.sign must be called with algorithm=null
    // and a private key of type 'ed25519' (PKCS#8 PEM supported)
    signatureBytes = nodeSign(null, Buffer.from(signatureBase, 'utf-8'), options.privateKey);
  } else if (alg === 'rsa-pss-sha256') {
    const signer = createSign('RSA-SHA256');
    signer.update(signatureBase, 'utf-8');
    signer.end();
    signatureBytes = signer.sign({
      key: options.privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_MAX_SIGN,
    });
  } else if (alg === 'rsa-sha256') {
    const signer = createSign('RSA-SHA256');
    signer.update(signatureBase, 'utf-8');
    signer.end();
    signatureBytes = signer.sign(options.privateKey);
  } else if (alg === 'ecdsa-p256-sha256') {
    const signer = createSign('SHA256');
    signer.update(signatureBase, 'utf-8');
    signer.end();
    signatureBytes = signer.sign(options.privateKey);
  } else {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }
  const signatureB64 = signatureBytes.toString('base64');

  const signatureInputValue = [
    `(${coveredComponents.join(' ')})`,
    `created=${created}`,
    `keyid="${options.keyId}"`,
    `alg="${alg}"`,
    `expires=${expires}`,
    `nonce="${nonce}"`,
    `tag="${options.tag}"`,
  ].join(';');

  return {
    signatureInput: `sig2=${signatureInputValue}`,
    signature: `sig2=:${signatureB64}:`,
  };
}

function buildSignatureBase(params: {
  method: string;
  authority: string;
  path: string;
  headers: Record<string, string>;
  body: string | undefined;
  coveredComponents: string[];
  created: number;
  expires: number;
  keyId: string;
  alg: string;
  nonce: string;
  tag: string;
}): string {
  const lines: string[] = [];

  for (const component of params.coveredComponents) {
    const cleaned = component.replace(/"/g, '');
    if (cleaned === '@authority') {
      lines.push(`"@authority": ${params.authority}`);
    } else if (cleaned === '@path') {
      lines.push(`"@path": ${params.path}`);
    } else if (cleaned === '@method') {
      lines.push(`"@method": ${params.method.toUpperCase()}`);
    } else {
      const headerValue = params.headers[cleaned.toLowerCase()];
      if (headerValue !== undefined) {
        lines.push(`"${cleaned}": ${headerValue}`);
      }
    }
  }

  const signatureParams = [
    `(${params.coveredComponents.join(' ')})`,
    `created=${params.created}`,
    `keyid="${params.keyId}"`,
    `alg="${params.alg}"`,
    `expires=${params.expires}`,
    `nonce="${params.nonce}"`,
    `tag="${params.tag}"`,
  ].join(';');

  lines.push(`"@signature-params": ${signatureParams}`);

  return lines.join('\n');
}

