import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { listMyReceiptsController, getReceiptController } from '@/features/receipts/receipts.controller.js';

export async function registerReceiptsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.get('/receipts', { preHandler: [requireUser] }, listMyReceiptsController);
  r.get('/receipts/:id', { preHandler: [requireUser] }, getReceiptController);
}
