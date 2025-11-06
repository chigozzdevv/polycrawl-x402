import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '@/middleware/auth.js';
import { getWalletsController, createDepositController, createWithdrawalController } from '@/features/wallets/wallets.controller.js';

export async function registerWalletsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/wallets', { preHandler: [requireUser] }, getWalletsController);

  r.post('/wallets/deposits', { preHandler: [requireUser], schema: { body: z.object({ role: z.enum(['payer', 'payout']).default('payer'), amount: z.number().positive(), simulate: z.boolean().optional() }) } }, createDepositController);

  r.post('/wallets/withdrawals', { preHandler: [requireUser], schema: { body: z.object({ role: z.enum(['payer', 'payout']).default('payout'), amount: z.number().positive(), to: z.string().min(10) }) } }, createWithdrawalController);
}
