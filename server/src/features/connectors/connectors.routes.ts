import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { createConnectorController, listConnectorsController, getConnectorController, updateConnectorController, deleteConnectorController } from '@/features/connectors/connectors.controller.js';
import { createConnectorInput, updateConnectorInput } from '@/features/connectors/connectors.schema.js';

export async function registerConnectorsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/connectors', { preHandler: [requireUser] }, listConnectorsController);
  r.post('/connectors', { preHandler: [requireUser], schema: { body: createConnectorInput } }, createConnectorController);
  r.get('/connectors/:id', { preHandler: [requireUser] }, getConnectorController);
  r.put('/connectors/:id', { preHandler: [requireUser], schema: { body: updateConnectorInput } }, updateConnectorController);
  r.delete('/connectors/:id', { preHandler: [requireUser] }, deleteConnectorController);
}
