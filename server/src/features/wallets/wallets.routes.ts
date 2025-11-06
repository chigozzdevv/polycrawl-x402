import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '@/middleware/auth.js';
import { getOrInitWallet, creditWallet, debitWallet } from '@/features/wallets/wallets.model.js';
import { insertDeposit, updateDeposit } from '@/features/payments/deposits.model.js';
import { insertWithdrawal, updateWithdrawal } from '@/features/payments/withdrawals.model.js';

export async function registerWalletsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/wallets', {
    preHandler: [requireUser],
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const payer = await getOrInitWallet(userId, 'payer');
      const payout = await getOrInitWallet(userId, 'payout');
      return reply.send({ payer, payout });
    },
  });

  r.post('/wallets/deposits', {
    preHandler: [requireUser],
    schema: { body: z.object({ role: z.enum(['payer', 'payout']).default('payer'), amount: z.number().positive(), simulate: z.boolean().optional() }) },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const { role, amount, simulate } = req.body as any;
      const depId = 'dep_' + randomUUID();
      await insertDeposit({ _id: depId, user_id: userId, wallet_role: role, amount, state: simulate ? 'confirmed' : 'pending', instructions: null, created_at: new Date().toISOString() });
      if (simulate) {
        await creditWallet(userId, role, amount, 'deposit', depId);
      }
      return reply.send({ id: depId, instructions: null });
    },
  });

  r.post('/wallets/withdrawals', {
    preHandler: [requireUser],
    schema: { body: z.object({ role: z.enum(['payer', 'payout']).default('payout'), amount: z.number().positive(), to: z.string().min(10) }) },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const { role, amount, to } = req.body as any;
      const wId = 'wd_' + randomUUID();
      await debitWallet(userId, role, amount, 'withdrawal', wId);
      await insertWithdrawal({ _id: wId, user_id: userId, wallet_role: role, amount, to, state: 'pending', created_at: new Date().toISOString() });
      await updateWithdrawal(wId, { state: 'sent', tx_hash: undefined });
      return reply.send({ id: wId, tx_hash: null });
    },
  });
}
