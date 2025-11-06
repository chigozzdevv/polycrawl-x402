import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { setCapsInput, capsResult } from './caps.schema.js';
import { getUserCaps, setUserCaps, getDefaultCaps } from './caps.model.js';

export async function registerCapsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/caps', {
    preHandler: [requireUser],
    schema: { response: { 200: capsResult } },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      let caps = await getUserCaps(userId);
      if (!caps) caps = await getDefaultCaps();
      return reply.send(caps);
    },
  });

  r.put('/caps', {
    preHandler: [requireUser],
    schema: { body: setCapsInput, response: { 200: capsResult } },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      await setUserCaps(userId, req.body as any);
      let updated = await getUserCaps(userId);
      if (!updated) updated = await getDefaultCaps();
      return reply.send(updated);
    },
  });
}
