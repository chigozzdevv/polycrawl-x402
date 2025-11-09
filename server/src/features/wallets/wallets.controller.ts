import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getWallets, createDepositService, createWithdrawalService, listWithdrawalsService, listDepositsService } from '@/features/wallets/wallets.service.js';

export async function getWalletsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const out = await getWallets(userId);
  return reply.send(out);
}

const depositInput = z.object({ role: z.enum(['payer', 'payout']).default('payer'), amount: z.number().positive() });
export async function createDepositController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { role, amount } = depositInput.parse(req.body);
  const out = await createDepositService(userId, role, amount);
  return reply.send(out);
}

const withdrawalInput = z.object({ role: z.enum(['payer', 'payout']).default('payout'), amount: z.number().positive(), to: z.string().min(10) });
export async function createWithdrawalController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { role, amount, to } = withdrawalInput.parse(req.body);
  const out = await createWithdrawalService(userId, role, amount, to);
  return reply.send(out);
}

export async function listWithdrawalsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const limit = Number((req.query as any).limit || 50);
  const withdrawals = await listWithdrawalsService(userId, limit);
  return reply.send({ withdrawals });
}

export async function listDepositsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const limit = Number((req.query as any).limit || 50);
  const deposits = await listDepositsService(userId, limit);
  return reply.send({ deposits });
}
