import type { FastifyRequest, FastifyReply } from 'fastify';
import { getMe, getOverview, getTransactions } from '@/features/users/users.service.js';

export async function getMeController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const me = await getMe(userId);
  if (!me) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
  return reply.send(me);
}

export async function getOverviewController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const overview = await getOverview(userId);
  return reply.send(overview);
}

export async function getTransactionsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const tx = await getTransactions(userId);
  return reply.send(tx);
}
