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
