import type { FastifyRequest, FastifyReply } from 'fastify';
import { discoverInput, fetchInput } from '@/features/mcp/mcp.schema.js';
import { discoverService, fetchService } from '@/features/mcp/mcp.service.js';

export async function discoverController(req: FastifyRequest, reply: FastifyReply) {
  const body = discoverInput.parse(req.body);
  const out = await discoverService({ query: body.query, filters: body.filters });
  return reply.send(out);
}

export async function fetchController(req: FastifyRequest, reply: FastifyReply) {
  const body = fetchInput.parse(req.body);
  const auth = req.headers['authorization'];
  const headerKey = auth && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
  const agentKey = body.agentKey || headerKey;
  if (!agentKey) return reply.code(401).send({ error: 'AGENT_AUTH_REQUIRED' });

  if (!body.resourceId) return reply.code(400).send({ error: 'RESOURCE_ID_REQUIRED' });

  const out = await fetchService({ agentKey, resourceId: body.resourceId, mode: body.mode, constraints: body.constraints });
  if (out.status !== 200) return reply.code(out.status).send({ error: out.error, quote: (out as any).quote });
  return reply.send({ content: out.content, receipt: out.receipt });
}
