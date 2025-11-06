import { loadEnv } from '@/config/env.js';

export async function recordX402Settlement(params: { requestId: string; amount: number; payerUserId: string; providerUserId: string }) {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) return null;
  const res = await fetch(X402_FACILITATOR_URL + '/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tx_hash?: string };
  return data.tx_hash || null;
}

export async function createDepositInstructions(params: { userId: string; role: 'payer' | 'payout'; amount: number }) {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) return { instructions: null };
  const res = await fetch(X402_FACILITATOR_URL + '/deposits', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  if (!res.ok) return { instructions: null };
  const data = await res.json();
  return { instructions: data };
}

export async function performWithdrawal(params: { userId: string; role: 'payer' | 'payout'; amount: number; to: string }) {
  const { X402_FACILITATOR_URL } = loadEnv();
  if (!X402_FACILITATOR_URL) return { tx_hash: null };
  const res = await fetch(X402_FACILITATOR_URL + '/withdrawals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  if (!res.ok) return { tx_hash: null };
  const data = await res.json();
  return { tx_hash: data?.tx_hash ?? null };
}
