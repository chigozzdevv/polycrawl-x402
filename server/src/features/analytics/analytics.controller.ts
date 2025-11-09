import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getUserSpendingStats, getProviderEarningsTimeSeries, getConsumerRecentActivity, getConsumerTopAgents, getConsumerTopSources, getProviderResourcePerformance } from '@/features/analytics/analytics.service.js';
import { getProviderSearchStats } from '@/features/analytics/analytics.model.js';
import { getDb } from '@/config/db.js';

const daysQuery = z.object({ days: z.string().transform((v) => Number(v)).catch(30) }).partial();
const limitQuery = z.object({ limit: z.coerce.number().int().positive().max(50).default(5) }).partial();

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
  const out = await getProviderEarningsTimeSeries(pid, days);
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

export async function getConsumerActivityController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const q = limitQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 5;
  const items = await getConsumerRecentActivity(userId, limit);
  return reply.send({ items });
}

export async function getConsumerTopAgentsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const q = limitQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 5;
  const items = await getConsumerTopAgents(userId, limit);
  return reply.send({ items });
}

export async function getConsumerTopSourcesController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const q = limitQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 5;
  const items = await getConsumerTopSources(userId, limit);
  return reply.send({ items });
}

export async function getProviderResourcePerformanceController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const pid = await getProviderIdByUserId(userId);
  if (!pid) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  const q = limitQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 10;
  const items = await getProviderResourcePerformance(pid, limit);
  return reply.send({ items });
}
