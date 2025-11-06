import { getDb } from '@/config/db.js';

export async function getUserSpendingStats(userId: string, days = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const requests = await db.collection('requests')
    .find({ user_id: userId, ts: { $gte: cutoff }, status: 'settled' })
    .toArray();

  const totalSpent = requests.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalRequests = requests.length;
  const avgCost = totalRequests > 0 ? totalSpent / totalRequests : 0;

  const byResource = requests.reduce((acc: any, r) => {
    const rid = r.resource_id;
    if (!acc[rid]) acc[rid] = { count: 0, spent: 0 };
    acc[rid].count++;
    acc[rid].spent += r.cost || 0;
    return acc;
  }, {});

  return { totalSpent, totalRequests, avgCost, byResource };
}

export async function getProviderEarningsStats(providerId: string, days = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const resources = await db.collection('resources').find({ provider_id: providerId }).toArray();
  const resourceIds = resources.map(r => r._id);

  const requests = await db.collection('requests')
    .find({ resource_id: { $in: resourceIds }, ts: { $gte: cutoff }, status: 'settled' })
    .toArray();

  const totalEarnings = requests.reduce((sum, r) => {
    const cost = r.cost || 0;
    const feeBps = Number(process.env.PLATFORM_FEE_BPS || 50);
    const providerShare = cost - (cost * feeBps / 10000);
    return sum + providerShare;
  }, 0);

  const totalRequests = requests.length;
  const avgEarning = totalRequests > 0 ? totalEarnings / totalRequests : 0;

  const byResource = requests.reduce((acc: any, r) => {
    const rid = r.resource_id;
    if (!acc[rid]) acc[rid] = { count: 0, earned: 0 };
    acc[rid].count++;
    const cost = r.cost || 0;
    const feeBps = Number(process.env.PLATFORM_FEE_BPS || 50);
    acc[rid].earned += cost - (cost * feeBps / 10000);
    return acc;
  }, {});

  return { totalEarnings, totalRequests, avgEarning, byResource };
}
