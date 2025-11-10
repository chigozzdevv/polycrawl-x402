import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, getProtectedResourceMetadataUrls } from '@/features/oauth/oauth.service.js';

function buildWwwAuthenticate(baseUrl: string) {
  const metadataUrls = getProtectedResourceMetadataUrls(baseUrl);
  const scopedUrl = metadataUrls[metadataUrls.length - 1];
  const baseMetadataUrl = metadataUrls[0];
  return `Bearer realm="Polycrawl MCP", resource_metadata="${scopedUrl}", authorization_uri="${baseMetadataUrl}"`;
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
