import type { FastifyInstance } from 'fastify';
import { requireUser } from '@/middleware/auth.js';
import { getMeController, getOverviewController, getTransactionsController } from '@/features/users/users.controller.js';

export async function registerUsersRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [requireUser] }, getMeController);
  app.get('/users/overview', { preHandler: [requireUser] }, getOverviewController);
  app.get('/users/transactions', { preHandler: [requireUser] }, getTransactionsController);
}
