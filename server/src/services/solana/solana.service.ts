import { loadEnv } from '@/config/env.js';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer as splTransfer } from '@solana/spl-token';
import { findWalletKey } from '@/features/wallets/keys.model.js';

// Creates a connection using our configured RPC/WS and network
function getConnection(): Connection {
  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const cluster = network === 'solana' ? 'mainnet-beta' : 'devnet';
  const endpoint = env.SOLANA_RPC_URL || clusterApiUrl(cluster);
  return new Connection(endpoint, { commitment: 'confirmed', wsEndpoint: env.SOLANA_WS_URL });
}

// Loads platform wallet from env; used to fund agents and pay providers
function getPlatformKeypair(): Keypair {
  const env = loadEnv();
  if (!env.X402_PLATFORM_PRIVATE_KEY) throw new Error('X402_PLATFORM_PRIVATE_KEY missing');
  return Keypair.fromSecretKey(Buffer.from(env.X402_PLATFORM_PRIVATE_KEY, 'base64'));
}

// Resolves the USDC mint + decimals for the active network
function getUsdcMint(): { mint: PublicKey; decimals: number } {
  const env = loadEnv();
  if (!env.X402_USDC_MINT) throw new Error('X402_USDC_MINT missing');
  const decimals = Number(env.X402_USDC_DECIMALS || 6);
  return { mint: new PublicKey(env.X402_USDC_MINT), decimals };
}

// Converts a UI string/number (e.g., 1.23) into atomic units bigint
function toAtomic(amountUi: string | number, decimals: number): bigint {
  const s = String(amountUi);
  const [ints, frac = ''] = s.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const joined = `${ints}${fracPadded}`.replace(/^0+/, '') || '0';
  return BigInt(joined);
}

// Returns SOL and USDC UI balances for a pubkey; USDC via associated token account
export async function getBalances(address: string) {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  const lamports = await conn.getBalance(pubkey, { commitment: 'confirmed' });
  const sol = lamports / LAMPORTS_PER_SOL;
  let usdc = 0;
  try {
    const { mint } = getUsdcMint();
    const ata = await (await import('@solana/spl-token')).getAssociatedTokenAddress(mint, pubkey);
    const bal = await conn.getTokenAccountBalance(ata, 'confirmed');
    usdc = bal.value.uiAmount || 0;
  } catch {}
  return { sol, usdc };
}

// Sends SOL from platform wallet to recipient (for fees/ATA creation)
export async function topUpSol(toAddress: string, amountSol: number): Promise<string> {
  const conn = getConnection();
  const payer = getPlatformKeypair();
  const toPub = new PublicKey(toAddress);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: toPub, lamports }));
  return await sendAndConfirmTransaction(conn, tx, [payer]);
}

// Transfers USDC (SPL) from platform wallet to recipient using associated token accounts
export async function transferUsdc(toAddress: string, amountUi: number | string): Promise<string> {
  const conn = getConnection();
  const payer = getPlatformKeypair();
  const { mint, decimals } = getUsdcMint();
  const toPub = new PublicKey(toAddress);
  const amount = toAtomic(amountUi, decimals);
  const fromAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, payer.publicKey);
  const toAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, toPub);
  return await splTransfer(conn, payer, fromAta.address, toAta.address, payer.publicKey, amount);
}

function isTrue(v?: string) {
  if (!v) return false;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

// Best-effort bootstrap for new agents: small SOL for fees and seeded USDC
export async function fundAgentOnSignup(userId: string) {
  const env = loadEnv();
  if (!isTrue(process.env.FUND_AGENT_ON_SIGNUP || env.FUND_AGENT_ON_SIGNUP)) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[signup-funding] skipped for ${userId} (FUND_AGENT_ON_SIGNUP disabled)`);
    }
    return;
  }
  const payerKey = await findWalletKey(userId, 'payer');
  if (!payerKey) {
    console.warn(`[signup-funding] payer wallet missing for ${userId}`);
    return;
  }
  const to = payerKey.public_key;
  const usdcAmt = Number(process.env.FUND_USDC_ON_SIGNUP || env.FUND_USDC_ON_SIGNUP || 1000);
  const solAmt = Number(process.env.FUND_SOL_ON_SIGNUP || env.FUND_SOL_ON_SIGNUP || 0.02);
  try {
    if (solAmt > 0) {
      await topUpSol(to, solAmt);
      console.info(`[signup-funding] sent ${solAmt} SOL fees to ${to}`);
    }
  } catch (err) {
    console.error(`[signup-funding] SOL top-up failed for ${userId}: ${(err as Error)?.message}`);
  }
  try {
    if (usdcAmt > 0) {
      await transferUsdc(to, usdcAmt);
      console.info(`[signup-funding] sent ${usdcAmt} USDC to ${to}`);

      // Also credit the internal platform wallet so balance shows in UI
      const { creditWallet } = await import('@/features/wallets/wallets.model.js');
      await creditWallet(userId, 'payer', usdcAmt, 'signup_bonus', 'initial_airdrop');
      console.info(`[signup-funding] credited ${usdcAmt} to internal wallet for ${userId}`);
    }
  } catch (err) {
    console.error(`[signup-funding] USDC transfer failed for ${userId}: ${(err as Error)?.message}`);
  }
}
