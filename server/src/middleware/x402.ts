import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchInput } from '@/features/mcp/mcp.schema.js';
import { getResourceById } from '@/features/mcp/mcp.model.js';
import { verifyX402Payload, type X402PaymentRequirements, getSupportedKinds } from '@/features/payments/x402.service.js';
import { loadEnv } from '@/config/env.js';
import { findProviderById } from '@/features/providers/providers.model.js';

// Reconstruct public base URL honoring reverse-proxy headers
function getBaseUrl(req: FastifyRequest) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedProto) return `${forwardedProto}://${forwardedHost || req.headers.host}`;
  return `${req.protocol}://${req.headers.host}`;
}

function usdToAtomic(amountUsd: number, decimals = 6) {
  return Math.round(amountUsd * Math.pow(10, decimals)).toString();
}

// Enforces x402 for MCP fetch: advertises requirements via 402, verifies X-PAYMENT when present, and attaches context for settlement
export async function requireX402ForMcpFetch(req: FastifyRequest, reply: FastifyReply) {
  const parsed = fetchInput.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST' });
  const body = parsed.data;
  if (!body.resourceId) return;

  const oauth = (req as any).oauth as { userId: string } | undefined;
  const resource = await getResourceById(body.resourceId);
  if (!resource) return;
  const provider = await findProviderById(resource.provider_id);
  if (!provider) return reply.code(500).send({ error: 'PROVIDER_NOT_FOUND' });

  const sameOwner = oauth && provider.user_id === oauth.userId;
  const isFlat = typeof resource.price_flat === 'number' && (resource as any).price_flat > 0;
  const unitPrice = (resource as any).price_per_kb ?? 0;
  const estBytes = (resource as any).size_bytes ?? Math.min(body.constraints?.maxBytes ?? 256 * 1024, 10 * 1024 * 1024);
  const estCost = sameOwner ? 0 : (isFlat ? (resource as any).price_flat! : Number(((unitPrice * (estBytes / 1024))).toFixed(6)));

  if (estCost <= 0) return;

  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const payTo = env.X402_PAYTO;
  const decimals = Number(env.X402_USDC_DECIMALS || 6);
  if (!payTo) return reply.code(500).send({ error: 'X402_PAYTO_MISSING' });

  if (network === 'solana' || network === 'solana-devnet') {
    const usdcMint = env.X402_USDC_MINT;
    if (!usdcMint) return reply.code(500).send({ error: 'X402_USDC_MINT_MISSING' });

    // Resolve facilitator feePayer for the selected network
    let feePayer: string | undefined;
    try {
      const kinds = await getSupportedKinds();
      for (const k of kinds.kinds) {
        if (k.network === network && k.scheme === 'exact') {
          feePayer = k?.extra?.feePayer;
          break;
        }
      }
    } catch {}

    if (!feePayer) {
      return reply.code(500).send({ error: 'FACILITATOR_FEEPAYER_MISSING' });
    }

    const requirements: X402PaymentRequirements = {
      scheme: 'exact',
      network,
      maxAmountRequired: usdToAtomic(estCost, decimals),
      resource: `${getBaseUrl(req)}${req.url}`,
      description: `Access ${resource.title}`,
      mimeType: 'application/json',
      payTo,
      maxTimeoutSeconds: 60,
      asset: usdcMint,
      extra: { feePayer },
    };
    
    const paymentHeader = req.headers['x-payment'];
    if (!paymentHeader || typeof paymentHeader !== 'string') {
      return reply.code(402).send({ x402Version: 1, error: 'X-PAYMENT header is required', accepts: [requirements] });
    }
  
    let payload: any;
    try {
      const json = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      payload = JSON.parse(json);
      if (typeof payload.x402Version !== 'number') payload.x402Version = 1;
    } catch (e) {
      return reply.code(402).send({ x402Version: 1, error: 'MALFORMED_X_PAYMENT', accepts: [requirements] });
    }
  
    try {
      const result = await verifyX402Payload(payload, requirements);
      if (!result.isValid) {
        return reply.code(402).send({ x402Version: 1, error: result.invalidReason || 'PAYMENT_INVALID', accepts: [requirements], payer: result.payer });
      }
    } catch (err: any) {
      return reply.code(402).send({ x402Version: 1, error: String(err?.message || 'VERIFY_FAILED'), accepts: [requirements] });
    }
  
    (req as any)._x402 = { payload, requirements };
    return;
  }

  return reply.code(500).send({ error: 'UNSUPPORTED_NETWORK' });
}
