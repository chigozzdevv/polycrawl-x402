import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '@/middleware/auth.js';
import { createAgent, listAgentsByUser } from '@/features/agents/agents.service.js';

export async function registerAgentsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.post('/agents', {
    preHandler: [requireUser],
    schema: { body: z.object({ name: z.string().min(2) }) },
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const agent = await createAgent(userId, (req.body as any).name);
      return reply.send(agent);
    },
  });

  r.get('/agents', {
    preHandler: [requireUser],
    handler: async (req, reply) => {
      const userId = (req as any).userId as string;
      const items = await listAgentsByUser(userId);
      return reply.send({ items });
    },
  });
}
