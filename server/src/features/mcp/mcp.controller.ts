import type { FastifyRequest, FastifyReply } from 'fastify';
import { discoverInput, fetchInput } from '@/features/mcp/mcp.schema.js';
import { discoverService, fetchService, finalizeExternalReceipt, markRequestSettlementFailed } from '@/features/mcp/mcp.service.js';
import { settleX402Payload } from '@/features/payments/x402.service.js';

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

  const x402 = (req as any)._x402 as { payload: any; requirements: any } | undefined;
  const tapDigest = (req as any)._tapDigest as string | undefined;

  const out = await fetchService({
    userId: oauth.userId,
    clientId: oauth.clientId,
    resourceId: body.resourceId,
    mode: body.mode,
    constraints: body.constraints,
    agentId: oauth.agentId,
  }, { settlementMode: x402 ? 'external' : 'internal', tapDigest });
  if (out.status !== 200) return reply.code(out.status).send({ error: out.error, quote: (out as any).quote });

  // If X402 present, settle and attach response header
  if (x402) {
    if (!out.pendingReceipt) return reply.code(500).send({ error: 'SETTLEMENT_STATE_MISSING' });
    try {
      const res = await settleX402Payload(x402.payload, x402.requirements);
      req.log.info({ requestId: out.pendingReceipt.requestId, success: !!res.success, txHash: res.txHash, networkId: res.networkId, error: res.error }, 'x402_settlement_result');
      const header = Buffer.from(JSON.stringify({ success: !!res.success, txHash: res.txHash, networkId: res.networkId, error: res.error || undefined })).toString('base64');
      reply.header('X-PAYMENT-RESPONSE', header);
      const receipt = await finalizeExternalReceipt(out.pendingReceipt, { x402Tx: res.txHash ?? null });
      return reply.send({ content: out.content, receipt });
    } catch (err) {
      req.log.warn({ requestId: out.pendingReceipt.requestId, err: String((err as any)?.message || err) }, 'x402_settlement_failed');
      await markRequestSettlementFailed(out.pendingReceipt.requestId, 'SETTLEMENT_FAILED');
      return reply.code(402).send({ x402Version: x402.payload?.x402Version ?? 1, error: 'SETTLEMENT_FAILED' });
    }
  }

  return reply.send({ content: out.content, receipt: out.receipt });
}
