import type { FastifyInstance } from 'fastify';
import { requireUser } from '@/middleware/auth.js';
import { getOrInitWallet } from '@/features/wallets/wallets.model.js';
import { getUserSpendingStats } from '@/features/analytics/analytics.service.js';
import { getDb } from '@/config/db.js';

export async function registerUsersRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: userId } as any);
    if (!user) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    return reply.send({ id: user._id, name: user.name, email: user.email, roles: user.roles || ['user'] });
  });

  app.get('/users/overview', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const payer = await getOrInitWallet(userId, 'payer');
    const payout = await getOrInitWallet(userId, 'payout');
    const spending = await getUserSpendingStats(userId, 30);

    const db = await getDb();
    const recentReceipts = await db.collection('receipts')
      .find({ userId })
      .sort({ ts: -1 })
      .limit(5)
      .toArray();

    return reply.send({
      balance: { payer: { available: payer.available, blocked: payer.blocked }, payout: { available: payout.available, blocked: payout.blocked } },
      spending: { total30d: spending.totalSpent, avgCost: spending.avgCost, totalRequests: spending.totalRequests },
      recentReceipts,
    });
  });

  app.get('/users/transactions', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const wallets = await db.collection('wallets').find({ owner_user_id: userId }).toArray();
    const walletIds = wallets.map(w => w._id);
    const entries = await db.collection('ledger_entries')
      .find({ wallet_id: { $in: walletIds } })
      .sort({ ts: -1 })
      .limit(100)
      .toArray();
    return reply.send({ transactions: entries });
  });
}
