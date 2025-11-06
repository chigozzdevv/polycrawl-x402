import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getUserSpendingStats, getProviderEarningsStats } from '@/features/analytics/analytics.service.js';
import { getProviderSearchStats } from '@/features/analytics/analytics.model.js';
import { getDb } from '@/config/db.js';

const daysQuery = z.object({ days: z.string().transform((v) => Number(v)).catch(30) }).partial();

export async function getUserSpendingController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const q = daysQuery.safeParse(req.query);
  const days = q.success && q.data.days ? q.data.days : 30;
  const out = await getUserSpendingStats(userId, days);
  return reply.send(out);
}

async function getProviderIdByUserId(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  return provider ? String((provider as any)._id) : null;
}

export async function getProviderEarningsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const pid = await getProviderIdByUserId(userId);
  if (!pid) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  const q = daysQuery.safeParse(req.query);
  const days = q.success && q.data.days ? q.data.days : 30;
  const out = await getProviderEarningsStats(pid, days);
  return reply.send(out);
}

export async function getProviderSearchController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const pid = await getProviderIdByUserId(userId);
  if (!pid) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  const q = daysQuery.safeParse(req.query);
  const days = q.success && q.data.days ? q.data.days : 30;
  const out = await getProviderSearchStats(pid, days);
  return reply.send(out);
}
