import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { createResourceInput, cloudinarySignatureInput } from '@/features/providers/providers.schema.js';
import { createResource, generateCloudinaryUploadSignature } from '@/features/providers/providers.service.js';

export async function registerProvidersRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

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
}
