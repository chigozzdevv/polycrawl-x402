import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '@/config/db.js';
import { createResourceInput, updateResourceInput } from '@/features/resources/resources.schema.js';
import { listResourcesByProvider, createResourceForProvider, listPublicResources } from '@/features/resources/resources.service.js';
import { findResourceById } from '@/features/resources/resources.model.js';

const listQuery = z.object({ limit: z.coerce.number().int().positive().max(100).default(50) }).partial();

async function getProviderIdByUserId(userId: string) {
  const db = await getDb();
  const provider = await db.collection('providers').findOne({ user_id: userId });
  return provider ? String((provider as any)._id) : null;
}

export async function listResourcesController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const providerId = await getProviderIdByUserId(userId);
  if (!providerId) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  const q = listQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 50;
  const items = await listResourcesByProvider(providerId, limit);
  return reply.send({ items });
}

export async function listCatalogResourcesController(req: FastifyRequest, reply: FastifyReply) {
  const q = listQuery.safeParse(req.query);
  const limit = q.success && q.data.limit ? q.data.limit : 24;
  const items = await listPublicResources(limit);
  return reply.send({ items });
}

export async function getResourceController(req: FastifyRequest, reply: FastifyReply) {
  const id = String((req.params as any).id);
  const r = await findResourceById(id);
  if (!r) return reply.code(404).send({ error: 'RESOURCE_NOT_FOUND' });
  return reply.send(r);
}

// Note: POST /resources already exists in providers.routes. If we later move it here, reuse createResourceInput.
export async function createResourceController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const providerId = await getProviderIdByUserId(userId);
  if (!providerId) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  const body = createResourceInput.parse(req.body);
  try {
    const doc = await createResourceForProvider(providerId, body as any);
    return reply.send(doc);
  } catch (e: any) {
    const msg = String(e?.message || 'UNKNOWN_ERROR');
    if (msg === 'DOMAIN_REQUIRED_FOR_SITE_RESOURCE') return reply.code(400).send({ error: msg });
    if (msg === 'SITE_DOMAIN_NOT_VERIFIED') return reply.code(403).send({ error: msg });
    throw e;
  }
}

export async function updateResourceController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const providerId = await getProviderIdByUserId(userId);
  if (!providerId) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

  const id = String((req.params as any).id);
  const db = await getDb();

  // Verify ownership
  const existing = await db.collection('resources').findOne({ _id: id } as any);
  if (!existing) return reply.code(404).send({ error: 'RESOURCE_NOT_FOUND' });
  if ((existing as any).provider_id !== providerId) {
    return reply.code(403).send({ error: 'FORBIDDEN' });
  }

  const body = updateResourceInput.parse(req.body);
  const updateDoc: any = { ...body, updated_at: new Date().toISOString() };

  await db.collection('resources').updateOne({ _id: id } as any, { $set: updateDoc });
  const updated = await db.collection('resources').findOne({ _id: id } as any);
  return reply.send(updated);
}

export async function deleteResourceController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const providerId = await getProviderIdByUserId(userId);
  if (!providerId) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

  const id = String((req.params as any).id);
  const db = await getDb();

  const existing = await db.collection('resources').findOne({ _id: id } as any);
  if (!existing) return reply.code(404).send({ error: 'RESOURCE_NOT_FOUND' });
  if ((existing as any).provider_id !== providerId) {
    return reply.code(403).send({ error: 'FORBIDDEN' });
  }

  if ((existing as any).storage_ref) {
    try {
      const { getCloudinary } = await import('@/utils/cloudinary.js');
      const cloudinary = getCloudinary();
      const storageRef = (existing as any).storage_ref;
      const publicId = storageRef.startsWith('http')
        ? storageRef.split('/upload/').pop()?.split('?')[0] || storageRef
        : storageRef;
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
    } catch (err) {
      console.error('Failed to delete from Cloudinary:', err);
    }
  }

  await db.collection('resources').deleteOne({ _id: id } as any);
  return reply.send({ success: true });
}
