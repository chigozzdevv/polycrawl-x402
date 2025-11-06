import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '@/features/oauth/oauth.service.js';

function buildWwwAuthenticate(baseUrl: string) {
  return `Bearer realm="Polycrawl MCP", authorization_uri="${baseUrl}/.well-known/oauth-protected-resource"`;
}

export async function requireOAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    reply.header('WWW-Authenticate', buildWwwAuthenticate(getBaseUrl(req)));
    return reply.code(401).send({ error: 'invalid_token' });
  }
  const token = auth.slice('Bearer '.length).trim();
  try {
    const payload = await verifyAccessToken(token);
    (req as any).oauth = payload;
  } catch {
    reply.header('WWW-Authenticate', buildWwwAuthenticate(getBaseUrl(req)));
    return reply.code(401).send({ error: 'invalid_token' });
  }
}

function getBaseUrl(req: FastifyRequest) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedProto) {
    return `${forwardedProto}://${forwardedHost || req.headers.host}`;
  }
  return `${req.protocol}://${req.headers.host}`;
}
