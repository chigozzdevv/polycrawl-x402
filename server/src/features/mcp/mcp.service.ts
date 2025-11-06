import { randomUUID } from 'node:crypto';
import { searchResources as repoSearch, getResourceById } from '@/features/mcp/mcp.model.js';
import { findAgentByKey } from '@/features/agents/agents.model.js';
import { getDb } from '@/config/db.js';
import { createHold, releaseHold, captureHold } from '@/features/wallets/wallets.model.js';
import { findProviderById } from '@/features/providers/providers.model.js';
import { createSignedReceipt } from '@/features/receipts/receipts.model.js';
import { signCloudinaryUrl } from '@/utils/cloudinary.js';
import { findConnectorById } from '@/features/connectors/connectors.model.js';
import { fetchViaConnector } from '@/features/connectors/connectors.service.js';
import { recordX402Settlement } from '@/features/payments/x402.service.js';
import { checkSpendingCaps } from '@/features/caps/caps.service.js';

export async function discoverService(params: { query: string; filters?: { format?: string[] } }) {
  const list = await repoSearch(params.query, { format: params.filters?.format });
  const results = list.map((r) => ({
    resourceId: r.id!,
    title: r.title,
    type: r.type,
    format: r.format,
    domain: r.domain,
    updatedAt: (r as any).updatedAt || (r as any).updated_at,
    summary: r.summary,
    tags: r.tags,
    priceEstimate:
      typeof r.price_flat === 'number' && r.price_flat > 0
        ? r.price_flat
        : typeof r.price_per_kb === 'number' && r.price_per_kb > 0 && typeof r.size_bytes === 'number'
          ? Number(((r.price_per_kb * (r.size_bytes / 1024))).toFixed(6))
          : undefined,
    avgSizeKb: typeof r.size_bytes === 'number' ? Math.round(r.size_bytes / 1024) : undefined,
  }));
  return { results, recommended: results[0]?.resourceId };
}

export async function fetchService(params: { agentKey: string; resourceId: string; mode: 'raw' | 'summary'; constraints?: { maxCost?: number; maxBytes?: number } }) {
  const { agentKey, resourceId, mode, constraints } = params;
  const agent = await findAgentByKey(agentKey);
  if (!agent) return { status: 401 as const, error: 'AGENT_INVALID' };
  const resource = await getResourceById(resourceId);
  if (!resource) return { status: 404 as const, error: 'RESOURCE_NOT_FOUND' };

  // Policy enforcement
  const modes = (resource.modes || resource.policy?.modes) as any;
  if (modes && !modes.includes(mode)) return { status: 403 as const, error: 'MODE_NOT_ALLOWED' };
  const visibility = (resource.policy?.visibility || resource.visibility) as any;
  if (visibility === 'restricted') {
    const allow = resource.policy?.allow || [];
    if (!allow.includes(agent._id)) return { status: 403 as const, error: 'PROVIDER_POLICY_DENY' };
  }

  const requestId = 'rq_' + randomUUID();
  const db = await getDb();
  const requests = db.collection<any>('requests');
  await requests.insertOne({
    _id: requestId,
    user_id: agent.user_id,
    agent_id: agent._id,
    resource_id: resourceId,
    mode,
    status: 'initiated',
    ts: new Date().toISOString(),
  } as any);

  const sameOwner = resource.provider_id === agent.user_id;
  const isFlat = typeof resource.price_flat === 'number' && resource.price_flat! > 0;
  const unitPrice = resource.price_per_kb ?? 0;
  const estBytes = resource.size_bytes ?? Math.min(constraints?.maxBytes ?? 256 * 1024, 10 * 1024 * 1024);
  const estCost = sameOwner ? 0 : (isFlat ? resource.price_flat! : Number(((unitPrice * (estBytes / 1024))).toFixed(6)));

  if (estCost > 0 && !sameOwner) {
    const capCheck = await checkSpendingCaps(agent.user_id, resourceId, mode, estCost);
    if (!capCheck.allowed) {
      return {
        status: 402 as const,
        error: capCheck.reason || 'SPENDING_CAP_EXCEEDED',
        quote: estCost,
        cap: { limit: capCheck.limit, current: capCheck.current },
      };
    }
  }

  let holdId: string | null = null;
  if (estCost > 0) {
    try {
      const hold = await createHold(agent.user_id, requestId, estCost);
      holdId = hold._id;
    } catch (e: any) {
      if (e && String(e.message).includes('INSUFFICIENT_FUNDS')) return { status: 402 as const, error: 'PAYMENT_REQUIRED', quote: estCost };
      throw e;
    }
  }

  try {
    let content: any = '';
    let bytesBilled = resource.size_bytes ?? estBytes;

    if (resource.connector_id) {
      const connector = await findConnectorById(resource.connector_id);
      if (!connector) throw new Error('CONNECTOR_NOT_FOUND');
      const fetched = await fetchViaConnector(resource as any, connector);
      if (fetched.kind === 'internal') {
        content = { url: signCloudinaryUrl(resource.storage_ref!) };
      } else {
        bytesBilled = fetched.bytes;
        // For large binaries, you might store to Cloudinary and return a URL; return minimal for now
        content = { chunks: [Buffer.from(fetched.body).toString('base64')] };
      }
    } else if (resource.storage_ref) {
      content = { url: signCloudinaryUrl(resource.storage_ref) };
    } else {
      if (holdId) await releaseHold(holdId);
      return { status: 501 as const, error: 'NO_CONNECTOR' };
    }

    const provider = await findProviderById(resource.provider_id);
    if (!provider) {
      if (holdId) await releaseHold(holdId);
      return { status: 500 as const, error: 'PROVIDER_NOT_FOUND' };
    }

    const finalCost = sameOwner ? 0 : (isFlat ? resource.price_flat! : Number(((unitPrice * (bytesBilled / 1024))).toFixed(6)));
    let x402_tx: string | null = null;
    if (finalCost > 0 && holdId) {
      const bps = Number(process.env.PLATFORM_FEE_BPS || '0');
      const feeAmount = Number(((finalCost * bps) / 10000).toFixed(6));
      await captureHold(holdId, finalCost, provider.user_id, feeAmount);
      x402_tx = await recordX402Settlement({ requestId, amount: finalCost, payerUserId: agent.user_id, providerUserId: provider.user_id });
    }
    await requests.updateOne(
      { _id: requestId } as any,
      { $set: { status: 'settled', bytes_billed: bytesBilled, cost: finalCost } } as any
    );

    const base = {
      id: 'rcpt_' + randomUUID(),
      request_id: requestId,
      resource: { id: resourceId, title: resource.title },
      providerId: resource.provider_id,
      userId: agent.user_id,
      agentId: agent._id,
      mode,
      bytes_billed: bytesBilled,
      unit_price: sameOwner ? undefined : (isFlat ? undefined : unitPrice),
      flat_price: sameOwner ? undefined : (isFlat ? finalCost : undefined),
      paid_total: finalCost,
      splits: finalCost > 0
        ? ((): any[] => {
            const bps = Number(process.env.PLATFORM_FEE_BPS || '0');
            const fee = Number(((finalCost * bps) / 10000).toFixed(6));
            return fee > 0
              ? [
                  { to: 'wallet:provider_payout', amount: Number((finalCost - fee).toFixed(6)) },
                  { to: 'wallet:platform_fee', amount: fee },
                ]
              : [{ to: 'wallet:provider_payout', amount: finalCost }];
          })()
        : [],
      x402_tx: x402_tx || undefined,
      ts: new Date().toISOString(),
    };
    const receipt = await createSignedReceipt(base);
    return { status: 200 as const, content, receipt };
  } catch (err) {
    if (holdId) await releaseHold(holdId);
    throw err;
  }
}
