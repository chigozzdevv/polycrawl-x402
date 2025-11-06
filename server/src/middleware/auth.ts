import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { loadEnv } from '@/config/env.js';

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const env = loadEnv();
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
  const token = auth.slice('Bearer '.length).trim();
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
    (req as any).userId = payload.sub;
  } catch {
    return reply.code(401).send({ error: 'AUTH_INVALID' });
  }
}
