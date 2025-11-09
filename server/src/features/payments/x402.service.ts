import { loadEnv } from '@/config/env.js';

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

export async function verifyX402Payment(payment: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) throw new Error('X402_FACILITATOR_URL not configured');

  const res = await fetch(X402_FACILITATOR_URL + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`X402 verify failed: ${error}`);
  }

  return await res.json();
}

export async function settleX402Payment(payment: SettlePaymentRequest): Promise<SettlePaymentResponse> {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) throw new Error('X402_FACILITATOR_URL not configured');

  const res = await fetch(X402_FACILITATOR_URL + '/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`X402 settle failed: ${error}`);
  }

  return await res.json();
}

// Discovery helper for facilitator capabilities
export async function getSupportedNetworks(): Promise<{ scheme: string; network: string }[]> {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) return [];

  try {
    const res = await fetch(X402_FACILITATOR_URL + '/supported');
    if (!res.ok) return [];
    const data = await res.json();
    return data.networks || [];
  } catch {
    return [];
  }
}

export async function getSupportedKinds(): Promise<{ kinds: Array<{ scheme: string; network: string; extra?: any }> }> {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) return { kinds: [] };
  const res = await fetch(X402_FACILITATOR_URL + '/supported');
  if (!res.ok) return { kinds: [] };
  const data = await res.json().catch(() => ({}));
  return { kinds: data.kinds || [] };
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

// Verifies that a client-signed X-PAYMENT matches our advertised requirements; does not settle on-chain.
export async function verifyX402Payload(payload: any, reqs: X402PaymentRequirements): Promise<{ isValid: boolean; invalidReason?: string; payer?: string }>
{
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) throw new Error('X402_FACILITATOR_URL not configured');

  const res = await fetch(X402_FACILITATOR_URL + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x402Version: payload?.x402Version ?? 1, paymentPayload: payload, paymentRequirements: reqs }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`X402 verify failed: ${error}`);
  }
  return (await res.json()) as { isValid: boolean; invalidReason?: string; payer?: string };
}

// Broadcasts settlement after successful verification; facilitator returns network/tx information.
export async function settleX402Payload(payload: any, reqs: X402PaymentRequirements): Promise<{ success: boolean; error?: string | null; txHash?: string | null; networkId?: string | null }>
{
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) throw new Error('X402_FACILITATOR_URL not configured');

  const res = await fetch(X402_FACILITATOR_URL + '/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x402Version: payload?.x402Version ?? 1, paymentPayload: payload, paymentRequirements: reqs }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`X402 settle failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data as { success: boolean; error?: string | null; txHash?: string | null; networkId?: string | null };
}
