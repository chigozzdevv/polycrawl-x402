import type { FastifyRequest, FastifyReply } from 'fastify';
import { listReceiptsQuery } from '@/features/receipts/receipts.schema.js';
import { listReceiptsByUserId, findReceiptById } from '@/features/receipts/receipts.service.js';

export async function listMyReceiptsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const q = listReceiptsQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 20;
  const items = await listReceiptsByUserId(userId, limit);
  return reply.send({ items });
}

export async function getReceiptController(req: FastifyRequest, reply: FastifyReply) {
  const id = String((req.params as any).id);
  const r = await findReceiptById(id);
  if (!r) return reply.code(404).send({ error: 'RECEIPT_NOT_FOUND' });
  const userId = (req as any).userId as string;
  if (r && (r as any).json?.userId && (r as any).json.userId !== userId) {
    return reply.code(403).send({ error: 'FORBIDDEN' });
  }
  return reply.send(r);
}
