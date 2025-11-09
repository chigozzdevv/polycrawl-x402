import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireUser } from '@/middleware/auth.js';
import { getUserSpendingController, getProviderEarningsController, getProviderSearchController, getConsumerActivityController, getConsumerTopAgentsController, getConsumerTopSourcesController, getProviderResourcePerformanceController } from '@/features/analytics/analytics.controller.js';

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/analytics/user/spending', { preHandler: [requireUser] }, getUserSpendingController);
  r.get('/analytics/consumer/activity', { preHandler: [requireUser] }, getConsumerActivityController);
  r.get('/analytics/consumer/top-agents', { preHandler: [requireUser] }, getConsumerTopAgentsController);
  r.get('/analytics/consumer/top-sources', { preHandler: [requireUser] }, getConsumerTopSourcesController);
  r.get('/analytics/provider/earnings', { preHandler: [requireUser] }, getProviderEarningsController);
  r.get('/analytics/provider/search', { preHandler: [requireUser] }, getProviderSearchController);
  r.get('/analytics/provider/resources/performance', { preHandler: [requireUser] }, getProviderResourcePerformanceController);
}
