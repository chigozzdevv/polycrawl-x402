import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { listResourcesController, getResourceController, createResourceController } from '@/features/resources/resources.controller.js';
import { createResourceInput } from '@/features/resources/resources.schema.js';

export async function registerResourcesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/resources', { preHandler: [requireUser] }, listResourcesController);
  r.get('/resources/:id', { preHandler: [requireUser] }, getResourceController);
  r.post('/resources', { preHandler: [requireUser], schema: { body: createResourceInput } }, createResourceController);
}
