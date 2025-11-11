import type { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';

function getAbsoluteUrl(req: FastifyRequest): string | null {
  const protoHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host;
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const scheme = (proto || req.protocol || 'https') as string;
  const path = req.url?.startsWith('/') ? req.url : `/${req.url ?? ''}`;
  if (host) return `${scheme}://${host}${path}`;
  if (req.url?.startsWith('http://') || req.url?.startsWith('https://')) return req.url;
  const fallbackHost = req.hostname || 'localhost';
  return `${scheme}://${fallbackHost}${path}`;
}

export function computeTapDigestFromRequest(req: FastifyRequest): string | undefined {
  const sigInputHeader = req.headers['signature-input'];
  const sigInput = typeof sigInputHeader === 'string' ? sigInputHeader.trim() : undefined;
  if (!sigInput) return undefined;

  const absolute = getAbsoluteUrl(req);
  if (!absolute) return undefined;
  const u = new URL(absolute);
  const authority = u.host;
  const path = u.pathname + (u.search || '');

  // Extract the signature params value after the first '=' (e.g., "sig2=(...)...")
  const eqIdx = sigInput.indexOf('=');
  const sigParams = eqIdx >= 0 ? sigInput.slice(eqIdx + 1).trim() : sigInput;

  const signatureBase = `"@authority": ${authority}\n"@path": ${path}\n"@signature-params": ${sigParams}`;
  const digest = createHash('sha256').update(signatureBase, 'utf8').digest('base64url');
  return digest;
}
