import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { loadEnv } from '@/config/env.js';
import { extractSessionToken } from '@/utils/session-cookie.js';

async function decodeToken(token: string) {
  const env = loadEnv();
  if (!env.JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
    if (typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

function getTokenFromHeaders(req: FastifyRequest) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  const cookieHeader = req.headers.cookie;
  const cookieToken = extractSessionToken(cookieHeader);
  return cookieToken;
}

export async function resolveUserId(req: FastifyRequest) {
  const token = getTokenFromHeaders(req);
  if (!token) return null;
  return decodeToken(token);
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return reply.code(401).send({ error: 'AUTH_REQUIRED' });
  }
  (req as any).userId = userId;
}
