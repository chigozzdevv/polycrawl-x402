import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '@/middleware/auth.js';
import { cloudinarySignatureInput, siteVerifyInput, siteVerifyCheckInput } from '@/features/providers/providers.schema.js';
import {
  createOrGetProviderController,
  getMeController,
  getOverviewController,
  getRequestsController,
  getEarningsController,
  cloudinarySignatureController,
  siteVerifyInitController,
  siteVerifyCheckController,
  getDomainsController,
  deleteDomainController,
} from '@/features/providers/providers.controller.js';

export async function registerProvidersRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/providers', { preHandler: [requireUser] }, createOrGetProviderController);

  r.get('/providers/me', { preHandler: [requireUser] }, getMeController);

  r.get('/providers/overview', { preHandler: [requireUser] }, getOverviewController);

  r.get('/providers/requests', { preHandler: [requireUser] }, getRequestsController);

  r.get('/providers/earnings', { preHandler: [requireUser] }, getEarningsController);

  r.post('/datasets/upload-signature', { preHandler: [requireUser], schema: { body: cloudinarySignatureInput } }, cloudinarySignatureController);

  r.post('/sites/verify', { preHandler: [requireUser], schema: { body: siteVerifyInput } }, siteVerifyInitController);

  r.post('/sites/verify-check', { preHandler: [requireUser], schema: { body: siteVerifyCheckInput } }, siteVerifyCheckController);

  r.get('/domains', { preHandler: [requireUser] }, getDomainsController);

  r.delete('/domains/:domain', { preHandler: [requireUser] }, deleteDomainController);
}
