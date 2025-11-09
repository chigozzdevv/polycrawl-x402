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

export async function getProviderEarningsTimeSeries(providerId: string, days = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const feeBps = Number(process.env.PLATFORM_FEE_BPS || 50);

  const resources = await db.collection('resources').find({ provider_id: providerId }).toArray();
  const resourceIds = resources.map(r => r._id);

  // Get all requests
  const allRequests = await db.collection('requests')
    .find({ resource_id: { $in: resourceIds }, status: 'settled' })
    .toArray();

  const recentRequests = await db.collection('requests')
    .find({ resource_id: { $in: resourceIds }, ts: { $gte: cutoff }, status: 'settled' })
    .toArray();

  // Calculate total all-time earnings
  const totalAllTime = allRequests.reduce((sum, r) => {
    const cost = r.cost || 0;
    return sum + (cost - (cost * feeBps / 10000));
  }, 0);

  // Calculate period total
  const periodTotal = recentRequests.reduce((sum, r) => {
    const cost = r.cost || 0;
    return sum + (cost - (cost * feeBps / 10000));
  }, 0);

  // Group by day
  const dailyMap: Record<string, { amount: number; count: number }> = {};
  for (const req of recentRequests) {
    const date = req.ts.split('T')[0]; // Extract YYYY-MM-DD
    if (!dailyMap[date]) dailyMap[date] = { amount: 0, count: 0 };
    const cost = req.cost || 0;
    dailyMap[date].amount += cost - (cost * feeBps / 10000);
    dailyMap[date].count++;
  }

  const daily = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, amount: data.amount, count: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by month
  const monthlyMap: Record<string, { amount: number; count: number }> = {};
  for (const req of recentRequests) {
    const month = req.ts.substring(0, 7); // Extract YYYY-MM
    if (!monthlyMap[month]) monthlyMap[month] = { amount: 0, count: 0 };
    const cost = req.cost || 0;
    monthlyMap[month].amount += cost - (cost * feeBps / 10000);
    monthlyMap[month].count++;
  }

  const monthly = Object.entries(monthlyMap)
    .map(([month, data]) => ({ month, amount: data.amount, count: data.count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    daily,
    monthly,
    total: totalAllTime,
    period_total: periodTotal,
  };
}

export async function getConsumerRecentActivity(userId: string, limit = 5) {
  const db = await getDb();
  const requests = await db
    .collection('requests')
    .find({ user_id: userId } as any)
    .sort({ ts: -1 } as any)
    .limit(limit)
    .toArray();

  const resourceIds = Array.from(new Set(requests.map((r) => r.resource_id).filter(Boolean)));
  let resourceMap: Record<string, { title?: string; domain?: string }> = {};
  if (resourceIds.length) {
    const resources = await db.collection('resources').find({ _id: { $in: resourceIds } } as any).toArray();
    resourceMap = Object.fromEntries(resources.map((r: any) => [r._id, { title: r.title, domain: r.domain }]))
  }

  return requests.map((req: any) => ({
    id: req._id,
    resource_id: req.resource_id,
    resource_title: resourceMap[req.resource_id]?.title,
    resource_domain: resourceMap[req.resource_id]?.domain,
    mode: req.mode,
    cost: req.cost || 0,
    status: req.status,
    ts: req.ts,
  }));
}

export async function getConsumerTopAgents(userId: string, limit = 5) {
  const db = await getDb();
  const rows = await db
    .collection('requests')
    .aggregate([
      { $match: { user_id: userId, agent_id: { $exists: true, $ne: null } } },
      { $group: { _id: '$agent_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
    .toArray();

  const agentIds = rows.map((row) => row._id).filter(Boolean);
  let agentMap: Record<string, { name?: string }> = {};
  if (agentIds.length) {
    const agents = await db.collection('agents').find({ _id: { $in: agentIds } } as any).toArray();
    agentMap = Object.fromEntries(agents.map((agent: any) => [agent._id, { name: agent.name }]));
  }

  return rows.map((row) => ({
    agent_id: row._id,
    agent_name: agentMap[row._id]?.name || row._id || 'Unknown agent',
    count: row.count,
  }));
}

export async function getConsumerTopSources(userId: string, limit = 5) {
  const db = await getDb();
  const rows = await db
    .collection('requests')
    .aggregate([
      { $match: { user_id: userId, resource_id: { $exists: true, $ne: null } } },
      { $group: { _id: '$resource_id', count: { $sum: 1 }, spent: { $sum: { $ifNull: ['$cost', 0] } } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
    .toArray();

  const resourceIds = rows.map((row) => row._id).filter(Boolean);
  let resourceMap: Record<string, { title?: string; domain?: string }> = {};
  if (resourceIds.length) {
    const resources = await db.collection('resources').find({ _id: { $in: resourceIds } } as any).toArray();
    resourceMap = Object.fromEntries(resources.map((r: any) => [r._id, { title: r.title, domain: r.domain }]));
  }

  return rows.map((row) => ({
    resource_id: row._id,
    resource_title: resourceMap[row._id]?.title || row._id || 'Unknown resource',
    resource_domain: resourceMap[row._id]?.domain,
    count: row.count,
    spent: row.spent,
  }));
}

export async function getProviderResourcePerformance(providerId: string, limit = 10) {
  const db = await getDb();
  const feeBps = Number(process.env.PLATFORM_FEE_BPS || 50);

  const resources = await db.collection('resources').find({ provider_id: providerId }).toArray();
  const resourceIds = resources.map(r => r._id);

  const requestStats = await db.collection('requests')
    .aggregate([
      { $match: { resource_id: { $in: resourceIds }, status: 'settled' } },
      {
        $group: {
          _id: '$resource_id',
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        },
      },
    ])
    .toArray();

  const impressionStats = await db.collection('search_impressions')
    .aggregate([
      { $match: { resource_id: { $in: resourceIds.map(String) } } },
      {
        $group: {
          _id: '$resource_id',
          impressions: { $sum: 1 },
          selections: { $sum: { $cond: ['$selected', 1, 0] } },
        },
      },
    ])
    .toArray();

  const resourceMap = Object.fromEntries(resources.map((r: any) => [String(r._id), r]));
  const requestMap = Object.fromEntries(requestStats.map((s: any) => [String(s._id), s]));
  const impressionMap = Object.fromEntries(impressionStats.map((s: any) => [s._id, s]));

  const performance = resourceIds.map((rid) => {
    const ridStr = String(rid);
    const resource = resourceMap[ridStr];
    const reqStat = requestMap[ridStr] || { count: 0, totalCost: 0 };
    const impStat = impressionMap[ridStr] || { impressions: 0, selections: 0 };

    const earned = reqStat.totalCost - (reqStat.totalCost * feeBps / 10000);
    const avgEarning = reqStat.count > 0 ? earned / reqStat.count : 0;
    const selectionRate = impStat.impressions > 0 ? impStat.selections / impStat.impressions : 0;

    return {
      resource_id: ridStr,
      title: resource?.title || 'Unknown',
      type: resource?.type,
      verified: resource?.verified || false,
      requests: reqStat.count,
      earned,
      avg_earning: avgEarning,
      impressions: impStat.impressions,
      selections: impStat.selections,
      selection_rate: selectionRate,
    };
  });

  return performance
    .sort((a, b) => b.earned - a.earned)
    .slice(0, limit);
}
