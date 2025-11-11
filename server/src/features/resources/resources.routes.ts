import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { listResourcesController, getResourceController, createResourceController, updateResourceController, deleteResourceController, listCatalogResourcesController } from '@/features/resources/resources.controller.js';
import { createResourceInput, updateResourceInput } from '@/features/resources/resources.schema.js';

export async function registerResourcesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/resources', { preHandler: [requireUser] }, listResourcesController);
  r.get('/resources/:id', { preHandler: [requireUser] }, getResourceController);
  r.post('/resources', { preHandler: [requireUser], schema: { body: createResourceInput } }, createResourceController);
  r.put('/resources/:id', { preHandler: [requireUser], schema: { body: updateResourceInput } }, updateResourceController);
  r.delete('/resources/:id', { preHandler: [requireUser] }, deleteResourceController);
  r.get('/catalog/resources', { schema: { } }, listCatalogResourcesController);
}
