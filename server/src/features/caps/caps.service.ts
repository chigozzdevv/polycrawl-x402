import { getDb } from '@/config/db.js';
import { getUserCaps, getDefaultCaps } from './caps.model.js';

type CapCheckResult = {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
};

export async function checkSpendingCaps(
  userId: string,
  resourceId: string,
  mode: 'raw' | 'summary',
  estimatedCost: number
): Promise<CapCheckResult> {
  const db = await getDb();
  let caps = await getUserCaps(userId);
  if (!caps) caps = await getDefaultCaps();

  const now = new Date();

  if (caps.global_weekly_cap && caps.global_weekly_cap > 0) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySpend = await db
      .collection('requests')
      .aggregate([
        { $match: { user_id: userId, status: 'settled', ts: { $gte: weekAgo.toISOString() } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ])
      .toArray();

    const currentWeeklySpend = weeklySpend[0]?.total || 0;
    if (currentWeeklySpend + estimatedCost > caps.global_weekly_cap) {
      return {
        allowed: false,
        reason: 'GLOBAL_WEEKLY_CAP_EXCEEDED',
        limit: caps.global_weekly_cap,
        current: currentWeeklySpend,
      };
    }
  }

  if (caps.per_site_daily_cap && caps.per_site_daily_cap > 0) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailySiteSpend = await db
      .collection('requests')
      .aggregate([
        { $match: { user_id: userId, resource_id: resourceId, status: 'settled', ts: { $gte: dayAgo.toISOString() } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ])
      .toArray();

    const currentDailySiteSpend = dailySiteSpend[0]?.total || 0;
    if (currentDailySiteSpend + estimatedCost > caps.per_site_daily_cap) {
      return {
        allowed: false,
        reason: 'PER_SITE_DAILY_CAP_EXCEEDED',
        limit: caps.per_site_daily_cap,
        current: currentDailySiteSpend,
      };
    }
  }

  const modeCap = mode === 'raw' ? caps.per_mode_caps?.raw : caps.per_mode_caps?.summary;
  if (modeCap && modeCap > 0) {
    const modeSpend = await db
      .collection('requests')
      .aggregate([
        { $match: { user_id: userId, mode: mode, status: 'settled' } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ])
      .toArray();

    const currentModeSpend = modeSpend[0]?.total || 0;
    if (currentModeSpend + estimatedCost > modeCap) {
      return {
        allowed: false,
        reason: `${mode.toUpperCase()}_MODE_CAP_EXCEEDED`,
        limit: modeCap,
        current: currentModeSpend,
      };
    }
  }

  return { allowed: true };
}
