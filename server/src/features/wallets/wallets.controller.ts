import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getWallets, createDepositService, createWithdrawalService } from '@/features/wallets/wallets.service.js';

export async function getWalletsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const out = await getWallets(userId);
  return reply.send(out);
}

const depositInput = z.object({ role: z.enum(['payer', 'payout']).default('payer'), amount: z.number().positive(), simulate: z.boolean().optional() });
export async function createDepositController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { role, amount, simulate } = depositInput.parse(req.body);
  const out = await createDepositService(userId, role, amount, simulate);
  return reply.send(out);
}

const withdrawalInput = z.object({ role: z.enum(['payer', 'payout']).default('payout'), amount: z.number().positive(), to: z.string().min(10) });
export async function createWithdrawalController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { role, amount, to } = withdrawalInput.parse(req.body);
  const out = await createWithdrawalService(userId, role, amount, to);
  return reply.send(out);
}
