import type { FastifyRequest, FastifyReply } from 'fastify';
import { signupInput, loginInput } from '@/features/auth/auth.schema.js';
import { findUserByEmail, insertUser } from '@/features/auth/auth.model.js';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { loadEnv } from '@/config/env.js';
import { initUserWallets } from '@/features/wallets/wallets.service.js';

export async function signupController(req: FastifyRequest, reply: FastifyReply) {
  const body = signupInput.parse(req.body);
  const existing = await findUserByEmail(body.email);
  if (existing) return reply.code(409).send({ error: 'EMAIL_EXISTS' });
  const hash = await argon2.hash(body.password);
  const userId = 'u_' + randomUUID();
  await insertUser({ _id: userId, name: body.name, email: body.email, password_hash: hash, created_at: new Date().toISOString() });
  await initUserWallets(userId);
  return reply.send({ userId });
}

export async function loginController(req: FastifyRequest, reply: FastifyReply) {
  const body = loginInput.parse(req.body);
  const user = await findUserByEmail(body.email);
  if (!user) return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
  const ok = await argon2.verify(user.password_hash, body.password);
  if (!ok) return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
  const env = loadEnv();
  if (!env.JWT_SECRET) return reply.code(500).send({ error: 'JWT_SECRET_MISSING' });
  const token = await new SignJWT({ sub: user._id }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(new TextEncoder().encode(env.JWT_SECRET));
  return reply.send({ token, userId: user._id });
}
