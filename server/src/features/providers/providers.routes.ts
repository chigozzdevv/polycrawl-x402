import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '@/middleware/auth.js';
import { createResourceInput, cloudinarySignatureInput } from '@/features/providers/providers.schema.js';
import { createResource, generateCloudinaryUploadSignature, getOrCreateProvider } from '@/features/providers/providers.service.js';
import { getDb } from '@/config/db.js';
import { getProviderEarningsStats } from '@/features/analytics/analytics.service.js';
import { getProviderSearchStats } from '@/features/analytics/analytics.model.js';
import { randomUUID } from 'node:crypto';

export async function registerProvidersRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/providers', {
    preHandler: [requireUser],
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const provider = await getOrCreateProvider(userId);
      return reply.send({ provider });
    },
  });

  r.get('/providers/me', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const provider = await db.collection('providers').findOne({ user_id: userId });
    if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
    return reply.send({ provider });
  });

  r.get('/providers/overview', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const provider = await db.collection('providers').findOne({ user_id: userId });
    if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

    const earnings = await getProviderEarningsStats(String(provider._id), 30);
    const searchStats = await getProviderSearchStats(String(provider._id), 30);

    const resources = await db.collection('resources').find({ provider_id: provider._id }).limit(10).toArray();

    return reply.send({
      earnings: { total30d: earnings.totalEarnings, avgEarning: earnings.avgEarning, totalRequests: earnings.totalRequests },
      searchStats,
      resources: resources.map(r => ({ id: r._id, title: r.title, type: r.type, verified: r.verified })),
    });
  });

  r.get('/providers/requests', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const provider = await db.collection('providers').findOne({ user_id: userId });
    if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

    const resources = await db.collection('resources').find({ provider_id: provider._id }).toArray();
    const resourceIds = resources.map(r => r._id);

    const requests = await db.collection('requests')
      .find({ resource_id: { $in: resourceIds } })
      .sort({ ts: -1 })
      .limit(100)
      .toArray();

    return reply.send({ requests });
  });

  r.get('/providers/earnings', { preHandler: [requireUser] }, async (req, reply) => {
    const userId = (req as any).userId as string;
    const db = await getDb();
    const provider = await db.collection('providers').findOne({ user_id: userId });
    if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

    const earnings = await getProviderEarningsStats(String(provider._id), 90);
    return reply.send({ earnings });
  });

  r.post('/resources', {
    preHandler: [requireUser],
    schema: { body: createResourceInput },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const doc = await createResource(userId, req.body as any);
      return reply.send(doc);
    },
  });

  r.post('/datasets/upload-signature', {
    preHandler: [requireUser],
    schema: { body: cloudinarySignatureInput },
    handler: async (req, reply) => {
      const { public_id } = req.body as any;
      const sig = generateCloudinaryUploadSignature(public_id);
      return reply.send(sig);
    },
  });

  r.post('/sites/verify', {
    preHandler: [requireUser],
    schema: { body: z.object({ domain: z.string(), method: z.enum(['dns', 'file']) }) },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const { domain, method } = req.body as any;
      const db = await getDb();
      const provider = await db.collection('providers').findOne({ user_id: userId });
      if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });

      const token = randomUUID();

      if (method === 'dns') {
        return reply.send({ method: 'dns', token, instructions: `Add TXT record: polycrawl-verify=${token}` });
      }

      return reply.send({ method: 'file', token, instructions: `Upload file at: https://${domain}/.well-known/polycrawl.txt with content: ${token}` });
    },
  });

  r.post('/sites/verify-check', {
    preHandler: [requireUser],
    schema: { body: z.object({ domain: z.string(), method: z.enum(['dns', 'file']), token: z.string() }) },
    handler: async (req, reply) => {
      const { domain, method, token } = req.body as any;

      if (method === 'file') {
        try {
          const res = await fetch(`https://${domain}/.well-known/polycrawl.txt`);
          const text = await res.text();
          if (text.trim() === token) {
            return reply.send({ verified: true });
          }
        } catch {
          return reply.send({ verified: false, error: 'FILE_NOT_FOUND' });
        }
      }

      return reply.send({ verified: false, error: 'DNS_CHECK_NOT_IMPLEMENTED' });
    },
  });
}
