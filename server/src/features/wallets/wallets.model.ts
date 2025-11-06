import { randomUUID } from 'node:crypto';
import { getDb } from '@/config/db.js';
import { getFeeWallet } from '@/features/wallets/system.service.js';

export type WalletDoc = {
  _id: string;
  owner_user_id: string;
  role: 'payer' | 'payout';
  currency: 'USD' | string;
  available: number;
  blocked: number;
  status: 'active' | 'frozen';
};

export type HoldDoc = { _id: string; wallet_id: string; request_id: string; amount: number; state: 'held' | 'released' | 'captured'; };
export type LedgerDoc = { _id: string; wallet_id: string; type: 'debit' | 'credit'; amount: number; ref_type: string; ref_id: string; ts: string };

export async function getOrInitWallet(userId: string, role: 'payer' | 'payout') {
  const db = await getDb();
  const coll = db.collection<WalletDoc>('wallets');
  const found = await coll.findOne({ owner_user_id: userId, role });
  if (found) return found;
  const doc: WalletDoc = {
    _id: randomUUID(),
    owner_user_id: userId,
    role,
    currency: 'USD',
    available: 0,
    blocked: 0,
    status: 'active',
  };
  await coll.insertOne(doc as any);
  return doc;
}

export async function createHold(userId: string, requestId: string, amount: number) {
  const db = await getDb();
  const payer = await getOrInitWallet(userId, 'payer');
  if (payer.available < amount) throw new Error('INSUFFICIENT_FUNDS');
  await db.collection<WalletDoc>('wallets').updateOne({ _id: payer._id }, { $inc: { available: -amount, blocked: amount } });
  const hold: HoldDoc = { _id: randomUUID(), wallet_id: payer._id, request_id: requestId, amount, state: 'held' };
  await db.collection<HoldDoc>('holds').insertOne(hold as any);
  await db.collection<LedgerDoc>('ledger_entries').insertOne({
    _id: randomUUID(), wallet_id: payer._id, type: 'debit', amount, ref_type: 'hold', ref_id: hold._id, ts: new Date().toISOString(),
  } as any);
  return hold;
}

export async function releaseHold(holdId: string) {
  const db = await getDb();
  const hold = await db.collection<HoldDoc>('holds').findOne({ _id: holdId });
  if (!hold || hold.state !== 'held') return;
  const wallet = await db.collection<WalletDoc>('wallets').findOne({ _id: hold.wallet_id });
  if (!wallet) return;
  await db.collection<WalletDoc>('wallets').updateOne({ _id: wallet._id }, { $inc: { available: hold.amount, blocked: -hold.amount } });
  await db.collection<HoldDoc>('holds').updateOne({ _id: holdId }, { $set: { state: 'released' } });
}

export async function captureHold(holdId: string, finalAmount: number, providerUserId: string, feeAmount = 0) {
  const db = await getDb();
  const hold = await db.collection<HoldDoc>('holds').findOne({ _id: holdId });
  if (!hold || hold.state !== 'held') throw new Error('HOLD_NOT_AVAILABLE');
  const payerWallet = await db.collection<WalletDoc>('wallets').findOne({ _id: hold.wallet_id });
  if (!payerWallet) throw new Error('PAYER_WALLET_MISSING');

  const delta = hold.amount - finalAmount;
  const ops: any[] = [];
  // decrease blocked by hold.amount, if delta>0 return to available
  ops.push({ updateOne: { filter: { _id: payerWallet._id }, update: { $inc: { blocked: -hold.amount, available: Math.max(0, delta) } } } });

  // credit provider payout
  const providerPayout = await getOrInitWallet(providerUserId, 'payout');
  ops.push({ updateOne: { filter: { _id: providerPayout._id }, update: { $inc: { available: finalAmount - feeAmount } } } });

  // credit fee pool (system wallet)
  if (feeAmount > 0) {
    const feeWallet = await getFeeWallet();
    ops.push({ updateOne: { filter: { _id: feeWallet._id }, update: { $inc: { available: feeAmount } } } });
  }

  await db.collection('wallets').bulkWrite(ops as any);
  await db.collection<HoldDoc>('holds').updateOne({ _id: holdId }, { $set: { state: 'captured' } });

  const now = new Date().toISOString();
  const entries: LedgerDoc[] = [
    { _id: randomUUID(), wallet_id: payerWallet._id, type: 'debit', amount: finalAmount, ref_type: 'capture', ref_id: hold.request_id, ts: now } as any,
    { _id: randomUUID(), wallet_id: providerPayout._id, type: 'credit', amount: finalAmount - feeAmount, ref_type: 'capture', ref_id: hold.request_id, ts: now } as any,
  ];
  if (feeAmount > 0) {
    const feeWallet = await getFeeWallet();
    entries.push({ _id: randomUUID(), wallet_id: feeWallet._id, type: 'credit', amount: feeAmount, ref_type: 'fee', ref_id: hold.request_id, ts: now } as any);
  }
  await db.collection<LedgerDoc>('ledger_entries').insertMany(entries as any);
}

export async function creditWallet(userId: string, role: 'payer' | 'payout', amount: number, refType: string, refId: string) {
  const db = await getDb();
  const w = await getOrInitWallet(userId, role);
  await db.collection<WalletDoc>('wallets').updateOne({ _id: w._id }, { $inc: { available: amount } });
  await db.collection<LedgerDoc>('ledger_entries').insertOne({ _id: randomUUID(), wallet_id: w._id, type: 'credit', amount, ref_type: refType, ref_id: refId, ts: new Date().toISOString() } as any);
}

export async function debitWallet(userId: string, role: 'payer' | 'payout', amount: number, refType: string, refId: string) {
  const db = await getDb();
  const w = await getOrInitWallet(userId, role);
  if (w.available < amount) throw new Error('INSUFFICIENT_FUNDS');
  await db.collection<WalletDoc>('wallets').updateOne({ _id: w._id }, { $inc: { available: -amount } });
  await db.collection<LedgerDoc>('ledger_entries').insertOne({ _id: randomUUID(), wallet_id: w._id, type: 'debit', amount, ref_type: refType, ref_id: refId, ts: new Date().toISOString() } as any);
}
