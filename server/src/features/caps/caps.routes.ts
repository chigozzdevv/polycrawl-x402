import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { setCapsInput, capsResult } from './caps.schema.js';
import { getCapsController, setCapsController } from './caps.controller.js';

export async function registerCapsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/caps', { preHandler: [requireUser], schema: { response: { 200: capsResult } } }, getCapsController);

  r.put('/caps', { preHandler: [requireUser], schema: { body: setCapsInput, response: { 200: capsResult } } }, setCapsController);
}
