import { randomUUID } from 'node:crypto';
import { searchResources as repoSearch, getResourceById } from '@/features/mcp/mcp.model.js';
import { getDb } from '@/config/db.js';
import { createHold, releaseHold, captureHold } from '@/features/wallets/wallets.model.js';
import { findProviderById } from '@/features/providers/providers.model.js';
import { createSignedReceipt } from '@/features/receipts/receipts.model.js';
import { signCloudinaryUrl } from '@/utils/cloudinary.js';
import { findConnectorById } from '@/features/connectors/connectors.model.js';
import { fetchViaConnector } from '@/features/connectors/connectors.service.js';
import { checkSpendingCaps } from '@/features/caps/caps.service.js';
import { createAgent } from '@/features/agents/agents.service.js';
import { transferUsdc } from '@/services/solana/solana.service.js';
import { findWalletKey } from '@/features/wallets/keys.model.js';

export type PendingReceipt = { requestId: string; payload: Record<string, any> };

// Ranks resources for a query; we blend text relevance with coarse cost/latency to prefer "good-enough and cheaper".
export async function discoverService(params: { query: string; filters?: { format?: string[] }; userId?: string; agentId?: string }) {
  const list = await repoSearch(params.query, { format: params.filters?.format });

  const results = list.map((r) => {
    const priceEst = typeof r.price_flat === 'number' && r.price_flat > 0
      ? r.price_flat
      : typeof r.price_per_kb === 'number' && r.price_per_kb > 0 && typeof r.size_bytes === 'number'
        ? Number(((r.price_per_kb * (r.size_bytes / 1024))).toFixed(6))
        : 0;

    const relevanceScore = computeRelevanceScore(params.query, r);

    return {
      resourceId: r.id!,
      title: r.title,
      type: r.type,
      format: r.format,
      domain: r.domain,
      updatedAt: (r as any).updatedAt || (r as any).updated_at,
      summary: r.summary,
      samplePreview: (r as any).sample_preview,
      tags: r.tags,
      priceEstimate: priceEst,
      avgSizeKb: typeof r.size_bytes === 'number' ? Math.round(r.size_bytes / 1024) : undefined,
      relevanceScore,
      latencyMs: (r as any).avg_latency_ms || 500,
    };
  });

  // Simple heuristic scoring; higher relevance, lower price, lower latency → higher score.
  const scored = results.map(r => ({
    ...r,
    score: r.relevanceScore - (0.1 * (r.priceEstimate || 0)) - (0.0001 * r.latencyMs)
  })).sort((a, b) => b.score - a.score);

  if (params.userId) {
    const { randomUUID } = await import('node:crypto');
    const { recordDiscoveryQuery, recordSearchImpressions } = await import('@/features/analytics/analytics.model.js');
    const queryId = randomUUID();
    await recordDiscoveryQuery({
      _id: queryId,
      query: params.query,
      user_id: params.userId,
      agent_id: params.agentId,
      matched_resource_ids: scored.map(r => r.resourceId),
      created_at: new Date().toISOString(),
    });
    const impressions = scored.map((r, idx) => ({
      _id: randomUUID(),
      resource_id: r.resourceId,
      query_id: queryId,
      rank: idx + 1,
      selected: false,
      created_at: new Date().toISOString(),
    }));
    await recordSearchImpressions(impressions);
  }

  return { results: scored, recommended: scored[0]?.resourceId };
}

function computeRelevanceScore(query: string, resource: any): number {
  const q = query.toLowerCase();
  let score = 0;

  if (resource.title?.toLowerCase().includes(q)) score += 0.5;
  if (resource.summary?.toLowerCase().includes(q)) score += 0.3;
  if (resource.tags?.some((t: string) => t.toLowerCase().includes(q))) score += 0.2;

  return Math.min(score, 1.0);
}

// fetch content via connector, compute final cost, settle (internal or x402), then optionally pay provider on-chain and issue a signed receipt.
export async function fetchService(
  params: { userId: string; clientId: string; agentId?: string; resourceId: string; mode: 'raw' | 'summary'; constraints?: { maxCost?: number; maxBytes?: number } },
  opts?: { settlementMode?: 'internal' | 'external' }
) {
  const { userId, clientId, agentId, resourceId, mode, constraints } = params;
  const db = await getDb();
  const agentsColl = db.collection<any>('agents');
  // Resolve or create an active agent context for this client/user
  let agent: any | null =
    agentId
      ? await agentsColl.findOne({ _id: agentId, user_id: userId, client_id: clientId, status: { $ne: 'revoked' } } as any)
      : await agentsColl.findOne({ user_id: userId, client_id: clientId, status: { $ne: 'revoked' } } as any);
  if (!agent) {
    agent = await createAgent(userId, `OAuth Client ${clientId.slice(-6)}`, clientId);
  }
  const activeAgent = agent as any;
  const resource = await getResourceById(resourceId);
  if (!resource) return { status: 404 as const, error: 'RESOURCE_NOT_FOUND' };

  // Policy enforcement (modes + visibility allowlist)
  const modes = (resource.modes || resource.policy?.modes) as any;
  if (modes && !modes.includes(mode)) return { status: 403 as const, error: 'MODE_NOT_ALLOWED' };
  const visibility = (resource.policy?.visibility || resource.visibility) as any;
  if (visibility === 'restricted') {
    const allow = resource.policy?.allow || [];
    if (!allow.includes(activeAgent._id)) return { status: 403 as const, error: 'PROVIDER_POLICY_DENY' };
  }

  // Persist request lifecycle; we will update status/cost after fetch/settlement
  const requestId = 'rq_' + randomUUID();
  const requests = db.collection<any>('requests');
  await requests.insertOne({
    _id: requestId,
    user_id: activeAgent.user_id,
    agent_id: activeAgent._id,
    resource_id: resourceId,
    mode,
    status: 'initiated',
    ts: new Date().toISOString(),
  } as any);

  const provider = await findProviderById(resource.provider_id);
  if (!provider) {
    await requests.updateOne({ _id: requestId } as any, { $set: { status: 'failed', failure_reason: 'PROVIDER_NOT_FOUND' } } as any);
    return { status: 500 as const, error: 'PROVIDER_NOT_FOUND' };
  }

  // If the requester owns the resource, we waive pricing
  const sameOwner = provider.user_id === activeAgent.user_id;
  const isFlat = typeof resource.price_flat === 'number' && resource.price_flat! > 0;
  const unitPrice = resource.price_per_kb ?? 0;
  const estBytes = resource.size_bytes ?? Math.min(constraints?.maxBytes ?? 256 * 1024, 10 * 1024 * 1024);
  const estCost = sameOwner ? 0 : (isFlat ? resource.price_flat! : Number(((unitPrice * (estBytes / 1024))).toFixed(6)));

  if (estCost > 0 && !sameOwner) {
    const capCheck = await checkSpendingCaps(activeAgent.user_id, resourceId, mode, estCost);
    if (!capCheck.allowed) {
      return {
        status: 402 as const,
        error: capCheck.reason || 'SPENDING_CAP_EXCEEDED',
        quote: estCost,
        cap: { limit: capCheck.limit, current: capCheck.current },
      };
    }
  }

  const settlementMode = opts?.settlementMode ?? 'internal';

  let holdId: string | null = null;
  if (settlementMode === 'internal' && estCost > 0) {
    try {
      const hold = await createHold(activeAgent.user_id, requestId, estCost);
      holdId = hold._id;
    } catch (e: any) {
      if (e && String(e.message).includes('INSUFFICIENT_FUNDS')) return { status: 402 as const, error: 'PAYMENT_REQUIRED', quote: estCost };
      throw e;
    }
  }

  try {
    let content: any = '';
    let bytesBilled = resource.size_bytes ?? estBytes;

    // Retrieve content either via connector (stream/binary) or signed URL to stored asset
    if (resource.connector_id) {
      const connector = await findConnectorById(resource.connector_id);
      if (!connector) throw new Error('CONNECTOR_NOT_FOUND');
      const fetched = await fetchViaConnector(resource as any, connector);
      if (fetched.kind === 'internal') {
        const signedUrl = signCloudinaryUrl(resource.storage_ref!);
        if (bytesBilled <= 10 * 1024 * 1024) {
          const response = await fetch(signedUrl);
          if (!response.ok) throw new Error(`Failed to fetch content: ${response.statusText}`);
          const buffer = await response.arrayBuffer();
          bytesBilled = buffer.byteLength;
          content = { chunks: [Buffer.from(buffer).toString('base64')] };
        } else {
          content = { url: signedUrl };
        }
      } else {
        bytesBilled = fetched.bytes;
        content = { chunks: [Buffer.from(fetched.body).toString('base64')] };
      }
    } else if (resource.storage_ref) {
      const signedUrl = signCloudinaryUrl(resource.storage_ref);
      if (bytesBilled <= 10 * 1024 * 1024) {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`Failed to fetch content: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        bytesBilled = buffer.byteLength;
        content = { chunks: [Buffer.from(buffer).toString('base64')] };
      } else {
        content = { url: signedUrl };
      }
    } else {
      if (holdId) await releaseHold(holdId);
      return { status: 501 as const, error: 'NO_CONNECTOR' };
    }

    const finalCost = sameOwner ? 0 : (isFlat ? resource.price_flat! : Number(((unitPrice * (bytesBilled / 1024))).toFixed(6)));
    // Internal wallets: capture the hold and split fee to platform
    if (settlementMode === 'internal' && finalCost > 0 && holdId) {
      const bps = Number(process.env.PLATFORM_FEE_BPS || '0');
      const feeAmount = Number(((finalCost * bps) / 10000).toFixed(6));
      await captureHold(holdId, finalCost, provider.user_id, feeAmount);
      // prevent releasing a captured hold if subsequent steps throw
      holdId = null;
    }

    // Immediate on-chain payout to provider (USDC via Solana) using platform wallet
    let providerSettlementTx: string | undefined;
    if (settlementMode === 'internal' && finalCost > 0 && !sameOwner) {
      const bps = Number(process.env.PLATFORM_FEE_BPS || '0');
      const providerShare = Number((finalCost - Number(((finalCost * bps) / 10000).toFixed(6))).toFixed(6));
      if (providerShare > 0) {
        const key = await findWalletKey(provider.user_id, 'payout');
        if (!key?.public_key) {
          throw new Error('PROVIDER_PAYOUT_ADDRESS_MISSING');
        }
        providerSettlementTx = await transferUsdc(key.public_key, providerShare);
      }
    }

    const receiptPayload = {
      id: 'rcpt_' + randomUUID(),
      request_id: requestId,
      resource: { id: resourceId, title: resource.title },
      providerId: resource.provider_id,
      userId: activeAgent.user_id,
      agentId: activeAgent._id,
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
      x402_tx: undefined,
      provider_onchain_tx: providerSettlementTx,
    };

    if (settlementMode === 'external') {
      await requests.updateOne(
        { _id: requestId } as any,
        { $set: { status: 'awaiting_settlement', bytes_billed: bytesBilled, cost: finalCost } } as any
      );
      return { status: 200 as const, content, pendingReceipt: { requestId, payload: receiptPayload } };
    }

    await requests.updateOne(
      { _id: requestId } as any,
      { $set: { status: 'settled', bytes_billed: bytesBilled, cost: finalCost } } as any
    );
    const receipt = await createSignedReceipt(receiptPayload);
    return { status: 200 as const, content, receipt, requestId };
  } catch (err) {
    if (holdId) await releaseHold(holdId);
    throw err;
  }
}

export async function finalizeExternalReceipt(pending: PendingReceipt, opts?: { x402Tx?: string | null }) {
  const db = await getDb();
  const payload = { ...pending.payload, x402_tx: opts?.x402Tx ?? undefined };
  await db.collection('requests').updateOne(
    { _id: pending.requestId } as any,
    { $set: { status: 'settled', x402_tx: opts?.x402Tx ?? null } } as any
  );
  return createSignedReceipt(payload);
}

export async function markRequestSettlementFailed(requestId: string, reason: string) {
  const db = await getDb();
  await db.collection('requests').updateOne(
    { _id: requestId } as any,
    { $set: { status: 'failed', failure_reason: reason } } as any
  );
}
