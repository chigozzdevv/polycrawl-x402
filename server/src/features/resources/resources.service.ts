import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';
import type { ResourceDoc } from '@/features/resources/resources.model.js';
import { isDomainVerified } from '@/features/providers/sites.model.js';
import { findConnectorById } from '@/features/connectors/connectors.model.js';

export async function createResourceForProvider(providerId: string, input: Omit<ResourceDoc, '_id' | 'provider_id' | 'updated_at' | 'verified'>) {
  const db = await getDb();
  if (input.type === 'site') {
    if (!input.domain) {
      throw new Error('DOMAIN_REQUIRED_FOR_SITE_RESOURCE');
    }
    const ok = await isDomainVerified(providerId, input.domain);
    if (!ok) {
      throw new Error('SITE_DOMAIN_NOT_VERIFIED');
    }
    if (!input.storage_ref) {
      // Enforce a connector for origin fetches
      if (!input.connector_id) {
        throw new Error('CONNECTOR_REQUIRED_FOR_SITE_FETCH');
      }
      const connector = await findConnectorById(input.connector_id);
      if (!connector) {
        throw new Error('CONNECTOR_NOT_FOUND');
      }
    }
  }
  const doc: ResourceDoc = {
    _id: 'res_' + randomUUID(),
    provider_id: providerId,
    title: input.title,
    type: input.type,
    format: input.format,
    domain: input.domain,
    path: input.path,
    tags: input.tags,
    summary: input.summary,
    schema: input.schema,
    size_bytes: input.size_bytes,
    price_per_kb: input.price_per_kb,
    price_flat: input.price_flat,
    visibility: input.visibility,
    modes: input.modes,
    policy: { visibility: input.visibility as any, allow: (input as any).allow_agent_ids, deny_paths: (input as any).deny_paths, modes: input.modes as any },
    updated_at: new Date().toISOString(),
    connector_id: input.connector_id,
    storage_ref: input.storage_ref,
    verified: true,
  };
  await db.collection<ResourceDoc>('resources').insertOne(doc as any);
  return doc;
}

export async function listResourcesByProvider(providerId: string, limit = 50) {
  const db = await getDb();
  return db
    .collection<ResourceDoc>('resources')
    .find({ provider_id: providerId } as any)
    .sort({ updated_at: -1 } as any)
    .limit(limit)
    .toArray();
}
