import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { getUserSpendingController, getProviderEarningsController, getProviderSearchController } from '@/features/analytics/analytics.controller.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/analytics/user/spending', { preHandler: [requireUser] }, getUserSpendingController);
  r.get('/analytics/provider/earnings', { preHandler: [requireUser] }, getProviderEarningsController);
  r.get('/analytics/provider/search', { preHandler: [requireUser] }, getProviderSearchController);
}
