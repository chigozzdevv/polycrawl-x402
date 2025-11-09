import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { cloudinarySignatureInput, siteVerifyInput, siteVerifyCheckInput } from '@/features/providers/providers.schema.js';
import { getOrCreateProvider, generateCloudinaryUploadSignature, getProviderByUserId, getProviderOverview, getProviderRequests, getProviderEarnings, verifySiteInit, verifySiteCheck, getProviderDomains, removeProviderDomain } from '@/features/providers/providers.service.js';

export async function createOrGetProviderController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const provider = await getOrCreateProvider(userId);
  return reply.send({ provider });
}

export async function getMeController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const provider = await getProviderByUserId(userId);
  if (!provider) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send({ provider });
}

export async function getOverviewController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const overview = await getProviderOverview(userId);
  if (!overview) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send(overview);
}

export async function getRequestsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const query = req.query as any;
  const limit = Math.min(Number(query.limit) || 100, 500);
  const status = query.status as string | undefined;
  const data = await getProviderRequests(userId, { limit, status });
  if (!data) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send({ requests: data });
}

export async function getEarningsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const earnings = await getProviderEarnings(userId);
  if (!earnings) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send({ earnings });
}

// Resource creation controller moved to resources.controller

export async function cloudinarySignatureController(req: FastifyRequest, reply: FastifyReply) {
  const body = cloudinarySignatureInput.parse(req.body);
  const sig = generateCloudinaryUploadSignature(body.public_id);
  return reply.send(sig);
}

export async function siteVerifyInitController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { domain, method } = siteVerifyInput.parse(req.body);
  const out = await verifySiteInit(userId, domain, method);
  if (!out) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send(out);
}

export async function siteVerifyCheckController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { domain, method, token } = siteVerifyCheckInput.parse(req.body);
  const out = await verifySiteCheck(userId, domain, method, token);
  return reply.send(out);
}

export async function getDomainsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const domains = await getProviderDomains(userId);
  if (!domains) return reply.code(404).send({ error: 'PROVIDER_NOT_FOUND' });
  return reply.send({ domains });
}

export async function deleteDomainController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const { domain } = req.params as { domain: string };
  const result = await removeProviderDomain(userId, domain);
  return reply.send(result);
}
