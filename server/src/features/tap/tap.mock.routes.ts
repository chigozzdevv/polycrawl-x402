import type { FastifyInstance } from 'fastify';
import { requireTap } from '@/features/tap/tap.middleware.js';

export async function registerTapMockRoutes(app: FastifyInstance) {
  const handler = async () => ({ status: 'ok', message: 'TAP signature verified' });

  app.get('/tap/mock', { preHandler: [requireTap] }, handler);
  app.post('/tap/mock', { preHandler: [requireTap] }, handler);
}
