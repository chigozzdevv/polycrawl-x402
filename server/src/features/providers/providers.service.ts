import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';
import type { ResourceDoc } from '@/features/resources/resources.model.js';
import { getCloudinary } from '@/utils/cloudinary.js';

export async function createResource(userId: string, input: Omit<ResourceDoc, '_id' | 'provider_id' | 'updated_at' | 'verified'>) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  const providerId = provider?._id ? String((provider as any)._id) : 'prov_' + randomUUID();
  if (!provider) {
    await db.collection('providers').insertOne({ _id: providerId, user_id: userId, created_at: new Date().toISOString() } as any);
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

export function generateCloudinaryUploadSignature(publicId: string) {
  const c = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: any = { public_id: publicId, timestamp, resource_type: 'raw' };
  const signature = c.utils.api_sign_request(paramsToSign, (c.config() as any).api_secret);
  return { timestamp, signature, cloud_name: (c.config() as any).cloud_name, api_key: (c.config() as any).api_key };
}
