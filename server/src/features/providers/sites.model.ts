import { getDb } from '@/config/db.js';

export type SiteVerificationDoc = {
  _id: string; // providerId:domain
  provider_id: string;
  domain: string;
  method: 'dns' | 'file';
  token: string;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
  verified_at?: string;
  last_checked_at?: string;
};

function key(providerId: string, domain: string) {
  return `${providerId}:${domain}`;
}

export async function getSiteVerification(providerId: string, domain: string): Promise<SiteVerificationDoc | null> {
  const db = await getDb();
  return (await db.collection<SiteVerificationDoc>('site_verifications').findOne({ _id: key(providerId, domain) } as any)) || null;
}

export async function upsertSiteVerification(doc: Omit<SiteVerificationDoc, '_id' | 'created_at' | 'status'> & { status?: SiteVerificationDoc['status'] }) {
  const db = await getDb();
  const _id = key(doc.provider_id, doc.domain);
  const now = new Date().toISOString();
  const toSet = {
    provider_id: doc.provider_id,
    domain: doc.domain,
    method: doc.method,
    token: doc.token,
    status: doc.status ?? 'pending',
    created_at: now,
  } as any;
  await db.collection<SiteVerificationDoc>('site_verifications').updateOne({ _id }, { $set: toSet }, { upsert: true });
  return { _id, ...toSet } as SiteVerificationDoc;
}

export async function markSiteVerified(providerId: string, domain: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<SiteVerificationDoc>('site_verifications').updateOne(
    { _id: key(providerId, domain) },
    { $set: { status: 'verified', verified_at: now, last_checked_at: now } as any }
  );
}

export async function isDomainVerified(providerId: string, domain: string) {
  const doc = await getSiteVerification(providerId, domain);
  return !!doc && doc.status === 'verified';
}
