import { loadEnv } from '@/config/env.js';
import { createFacilitatorConfig } from '@coinbase/x402';

type VerifyPaymentRequest = {
  scheme: string;
  network: string;
  signature: string;
  authorization: string;
  amount: string;
  currency: string;
  from: string;
  to: string;
  nonce: string;
  validAfter: number;
  validBefore: number;
};

type VerifyPaymentResponse = {
  valid: boolean;
  reason?: string;
};

type SettlePaymentRequest = {
  scheme: string;
  network: string;
  signature: string;
  authorization: string;
  amount: string;
  currency: string;
  from: string;
  to: string;
  nonce: string;
  validAfter: number;
  validBefore: number;
};

type SettlePaymentResponse = {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
};

function getFacilitator(): ReturnType<typeof createFacilitatorConfig> {
  const env = loadEnv();
  if (!env.CDP_API_KEY_ID || !env.CDP_API_KEY_SECRET) {
    throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET are required');
  }
  return createFacilitatorConfig(env.CDP_API_KEY_ID, env.CDP_API_KEY_SECRET);
}

export async function verifyX402Payment(payment: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  const facilitator = getFacilitator();
  const authHeaders = await facilitator.createAuthHeaders?.();
  const headers = authHeaders?.verify || {};

  const res = await fetch(facilitator.url + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`X402 verify failed: ${error}`);
  }

  return await res.json();
}

export async function settleX402Payment(payment: SettlePaymentRequest): Promise<SettlePaymentResponse> {
  const facilitator = getFacilitator();
  const authHeaders = await facilitator.createAuthHeaders?.();
  const headers = authHeaders?.settle || {};

  const res = await fetch(facilitator.url + '/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`X402 settle failed: ${error}`);
  }

  return await res.json();
}

export async function getSupportedNetworks(): Promise<{ scheme: string; network: string }[]> {
  try {
    const facilitator = getFacilitator();
    const res = await fetch(facilitator.url + '/supported');
    if (!res.ok) return [];
    const data = await res.json();
    return data.networks || [];
  } catch {
    return [];
  }
}

export async function getSupportedKinds(): Promise<{ kinds: Array<{ scheme: string; network: string; extra?: any }> }> {
  try {
    const facilitator = getFacilitator();
    const res = await fetch(facilitator.url + '/supported');
    if (!res.ok) return { kinds: [] };
    const data = await res.json().catch(() => ({}));
    return { kinds: data.kinds || [] };
  } catch {
    return { kinds: [] };
  }
}

export type X402PaymentRequirements = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: any; // address or structured asset per network
  extra?: any;
};

export async function verifyX402Payload(payload: any, reqs: X402PaymentRequirements): Promise<{ isValid: boolean; invalidReason?: string; payer?: string }>
{
  const facilitator = getFacilitator();
  const authHeaders = await facilitator.createAuthHeaders?.();
  const headers = authHeaders?.verify || {};

  const body = { x402Version: payload?.x402Version ?? 1, paymentPayload: payload, paymentRequirements: reqs };
  console.log('[X402] Verifying with facilitator:', facilitator.url + '/verify');
  console.log('[X402] Payload keys:', Object.keys(payload || {}));
  console.log('[X402] Requirements:', JSON.stringify(reqs, null, 2));

  const res = await fetch(facilitator.url + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  console.log('[X402] Facilitator response status:', res.status);
  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    console.log('[X402] Facilitator error response:', error);
    throw new Error(`X402 verify failed: ${error}`);
  }
  const result = (await res.json()) as { isValid: boolean; invalidReason?: string; payer?: string };
  console.log('[X402] Facilitator result:', result);
  return result;
}

export async function settleX402Payload(payload: any, reqs: X402PaymentRequirements): Promise<{ success: boolean; error?: string | null; txHash?: string | null; networkId?: string | null }>
{
  const facilitator = getFacilitator();
  const authHeaders = await facilitator.createAuthHeaders?.();
  const headers = authHeaders?.settle || {};

  const res = await fetch(facilitator.url + '/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ x402Version: payload?.x402Version ?? 1, paymentPayload: payload, paymentRequirements: reqs }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`X402 settle failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data as { success: boolean; error?: string | null; txHash?: string | null; networkId?: string | null };
}
