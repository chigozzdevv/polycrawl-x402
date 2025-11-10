import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';
import type { ResourceDoc } from '@/features/resources/resources.model.js';
import { getCloudinary } from '@/utils/cloudinary.js';
import { createResourceForProvider } from '@/features/resources/resources.service.js';
import dns from 'node:dns/promises';
import { getProviderEarningsStats } from '@/features/analytics/analytics.service.js';
import { getProviderSearchStats } from '@/features/analytics/analytics.model.js';
import { getSiteVerification, upsertSiteVerification, markSiteVerified, getAllProviderDomains, deleteDomain } from '@/features/providers/sites.model.js';

export async function getOrCreateProvider(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (provider) return provider;
  const providerId = 'prov_' + randomUUID();
  const doc = { _id: providerId, user_id: userId, created_at: new Date().toISOString() };
  await db.collection('providers').insertOne(doc as any);
  return doc;
}

export async function createResource(userId: string, input: Omit<ResourceDoc, '_id' | 'provider_id' | 'updated_at' | 'verified'>) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  const providerId = provider?._id ? String((provider as any)._id) : 'prov_' + randomUUID();
  if (!provider) {
    await db.collection('providers').insertOne({ _id: providerId, user_id: userId, created_at: new Date().toISOString() } as any);
  }
  return createResourceForProvider(providerId, input);
}

export function generateCloudinaryUploadSignature(publicId: string) {
  const c = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: any = { public_id: publicId, timestamp };
  const signature = c.utils.api_sign_request(paramsToSign, (c.config() as any).api_secret);
  return { timestamp, signature, cloud_name: (c.config() as any).cloud_name, api_key: (c.config() as any).api_key };
}

export async function getProviderByUserId(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  return provider || null;
}

export async function getProviderOverview(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return null;
  const earnings = await getProviderEarningsStats(String((provider as any)._id), 30);
  const searchStats = await getProviderSearchStats(String((provider as any)._id), 30);
  const resources = await db.collection('resources').find({ provider_id: (provider as any)._id }).limit(10).toArray();
  return {
    earnings: { total30d: earnings.totalEarnings, avgEarning: earnings.avgEarning, totalRequests: earnings.totalRequests },
    searchStats,
    resources: resources.map((r: any) => ({ id: r._id, title: r.title, type: r.type, verified: r.verified })),
  };
}

export async function getProviderRequests(userId: string, options?: { limit?: number; status?: string }) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return null;
  const resources = await db.collection('resources').find({ provider_id: (provider as any)._id }).toArray();
  const resourceIds = resources.map((r: any) => r._id);

  const filter: any = { resource_id: { $in: resourceIds } };
  if (options?.status) {
    filter.status = options.status;
  }

  const requests = await db
    .collection('requests')
    .find(filter)
    .sort({ ts: -1 })
    .limit(options?.limit || 100)
    .toArray();
  return requests;
}

export async function getProviderEarnings(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return null;
  return getProviderEarningsStats(String((provider as any)._id), 90);
}

export async function verifySiteInit(userId: string, domain: string, method: 'dns' | 'file') {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return null;
  const providerId = String((provider as any)._id);
  const existing = await getSiteVerification(providerId, domain);
  if (existing && existing.status === 'verified') {
    return { method: existing.method as any, token: existing.token, verified: true };
  }
  const token = randomUUID();
  await upsertSiteVerification({ provider_id: providerId, domain, method, token });
  if (method === 'dns') {
    return { method: 'dns' as const, token, instructions: `Add TXT record: polycrawl-verify=${token}` };
  }
  return { method: 'file' as const, token, instructions: `Upload file at: https://${domain}/.well-known/polycrawl.txt with content: ${token}` };
}

export async function verifySiteCheck(userId: string, domain: string, method: 'dns' | 'file', token: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return { verified: false } as const;
  const providerId = String((provider as any)._id);
  const existing = await getSiteVerification(providerId, domain);
  if (!existing || existing.token !== token) {
    return { verified: false, error: 'TOKEN_MISMATCH' } as const;
  }
  if (method === 'file') {
    try {
      const res = await fetch(`https://${domain}/.well-known/polycrawl.txt`);
      const text = await res.text();
      if (text.trim() === token) {
        await markSiteVerified(providerId, domain);
        return { verified: true } as const;
      }
      return { verified: false, error: 'FILE_CONTENT_MISMATCH' };
    } catch {
      return { verified: false, error: 'FILE_NOT_FOUND' } as const;
    }
  }
  if (method === 'dns') {
    try {
      const records = await dns.resolveTxt(domain);
      const flattened = records.map((parts) => parts.join(''));
      const match = flattened.find((txt) => txt.trim() === `polycrawl-verify=${token}`);
      if (match) {
        await markSiteVerified(providerId, domain);
        return { verified: true } as const;
      }
      return { verified: false, error: 'DNS_RECORD_NOT_FOUND' } as const;
    } catch {
      return { verified: false, error: 'DNS_LOOKUP_FAILED' } as const;
    }
  }
  return { verified: false, error: 'UNSUPPORTED_METHOD' } as const;
}

export async function getProviderDomains(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return null;
  const providerId = String((provider as any)._id);
  return getAllProviderDomains(providerId);
}

export async function removeProviderDomain(userId: string, domain: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  if (!provider) return { ok: false };
  const providerId = String((provider as any)._id);
  await deleteDomain(providerId, domain);
  return { ok: true };
}
