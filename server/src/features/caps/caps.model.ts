import { getDb } from '@/config/db.js';

export type SpendingCapsDoc = {
  _id: string;
  global_weekly_cap?: number;
  per_site_daily_cap?: number;
  per_mode_caps?: {
    raw?: number;
    summary?: number;
  };
  updated_at: string;
};

export async function getUserCaps(userId: string): Promise<SpendingCapsDoc | null> {
  const db = await getDb();
  return (await db.collection<SpendingCapsDoc>('spending_caps').findOne({ _id: userId })) || null;
}

export async function setUserCaps(userId: string, caps: Partial<Omit<SpendingCapsDoc, '_id'>>): Promise<void> {
  const db = await getDb();
  await db.collection<SpendingCapsDoc>('spending_caps').updateOne(
    { _id: userId },
    { $set: { ...caps, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function getDefaultCaps(): Promise<SpendingCapsDoc> {
  return {
    _id: 'default',
    global_weekly_cap: 100,
    per_site_daily_cap: 10,
    per_mode_caps: { raw: 50, summary: 20 },
    updated_at: new Date().toISOString(),
  };
}
