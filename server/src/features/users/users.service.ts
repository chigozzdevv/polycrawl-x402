import { findUserById } from '@/features/auth/auth.model.js';
import { getOrInitWallet } from '@/features/wallets/wallets.model.js';
import { getUserSpendingStats } from '@/features/analytics/analytics.service.js';
import { listRecentReceiptsByUserId } from '@/features/receipts/receipts.model.js';
import { listWalletsByOwnerUserId, listLedgerEntriesByWalletIds } from '@/features/wallets/wallets.model.js';

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) return null;
  return { id: user._id, name: user.name, email: user.email, roles: user.roles || ['user'] };
}

export async function getOverview(userId: string) {
  const payer = await getOrInitWallet(userId, 'payer');
  const payout = await getOrInitWallet(userId, 'payout');
  const spending = await getUserSpendingStats(userId, 30);
  const recentReceipts = await listRecentReceiptsByUserId(userId, 5);
  return {
    balance: {
      payer: { available: payer.available, blocked: payer.blocked },
      payout: { available: payout.available, blocked: payout.blocked },
    },
    spending: {
      total30d: spending.totalSpent,
      avgCost: spending.avgCost,
      totalRequests: spending.totalRequests,
    },
    recentReceipts,
  };
}

export async function getTransactions(userId: string) {
  const wallets = await listWalletsByOwnerUserId(userId);
  const walletIds = wallets.map((w) => w._id);
  const entries = await listLedgerEntriesByWalletIds(walletIds, 100);
  return { transactions: entries };
}
