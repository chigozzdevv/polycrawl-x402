import type { FastifyRequest, FastifyReply } from 'fastify';
import { discoverInput, fetchInput } from '@/features/mcp/mcp.schema.js';
import { discoverService, fetchService } from '@/features/mcp/mcp.service.js';

export async function discoverController(req: FastifyRequest, reply: FastifyReply) {
  const body = discoverInput.parse(req.body);
  const oauth = (req as any).oauth as { userId: string; clientId: string; agentId?: string };
  const out = await discoverService({ query: body.query, filters: body.filters, userId: oauth?.userId, agentId: oauth?.agentId });
  return reply.send(out);
}

export async function fetchController(req: FastifyRequest, reply: FastifyReply) {
  const body = fetchInput.parse(req.body);
  if (!body.resourceId) return reply.code(400).send({ error: 'RESOURCE_ID_REQUIRED' });
  const oauth = (req as any).oauth as { userId: string; clientId: string; scopes: string[]; resource: string; agentId?: string };
  if (!oauth) return reply.code(401).send({ error: 'OAUTH_REQUIRED' });

  const out = await fetchService({
    userId: oauth.userId,
    clientId: oauth.clientId,
    resourceId: body.resourceId,
    mode: body.mode,
    constraints: body.constraints,
    agentId: oauth.agentId,
  });
  if (out.status !== 200) return reply.code(out.status).send({ error: out.error, quote: (out as any).quote });
  return reply.send({ content: out.content, receipt: out.receipt });
}
