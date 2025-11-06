import { getDb } from '@/config/db.js';

export type DiscoveryQueryDoc = {
  _id: string;
  query: string;
  user_id: string;
  agent_id?: string;
  matched_resource_ids: string[];
  selected_resource_id?: string;
  created_at: string;
};

export type SearchImpressionDoc = {
  _id: string;
  resource_id: string;
  query_id: string;
  rank: number;
  selected: boolean;
  created_at: string;
};

export async function recordDiscoveryQuery(doc: DiscoveryQueryDoc) {
  const db = await getDb();
  await db.collection<DiscoveryQueryDoc>('discovery_queries').insertOne(doc as any);
}

export async function recordSearchImpressions(impressions: SearchImpressionDoc[]) {
  if (!impressions.length) return;
  const db = await getDb();
  await db.collection<SearchImpressionDoc>('search_impressions').insertMany(impressions as any);
}

export async function getProviderSearchStats(providerId: string, days = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const resources = await db.collection('resources').find({ provider_id: providerId }).toArray();
  const resourceIds = resources.map(r => String(r._id));

  const impressions = await db.collection<SearchImpressionDoc>('search_impressions')
    .find({ resource_id: { $in: resourceIds as any }, created_at: { $gte: cutoff } })
    .toArray();

  const totalImpressions = impressions.length;
  const totalSelected = impressions.filter(i => i.selected).length;
  const selectionRate = totalImpressions > 0 ? totalSelected / totalImpressions : 0;

  return { totalImpressions, totalSelected, selectionRate };
}
