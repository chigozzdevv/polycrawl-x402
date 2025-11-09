import 'dotenv/config';
import { loadEnv } from '../config/env.js';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function airdrop(pubkeyStr: string, solAmountStr: string, usePublicFaucet: boolean) {
  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const cluster = network === 'solana' ? 'mainnet-beta' : 'devnet';
  const endpoint = usePublicFaucet ? clusterApiUrl(cluster) : (env.SOLANA_RPC_URL || clusterApiUrl(cluster));
  const connection = new Connection(endpoint, { commitment: 'confirmed', wsEndpoint: env.SOLANA_WS_URL });

  const toPub = new PublicKey(pubkeyStr);
  const lamports = Math.round(parseFloat(solAmountStr) * LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) throw new Error('Invalid SOL amount');

  const maxAttempts = 5;
  let lastErr: any;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const sig = await connection.requestAirdrop(toPub, lamports);
      await connection.confirmTransaction({ signature: sig, ...(await connection.getLatestBlockhash()) }, 'confirmed');
      console.log(JSON.stringify({ success: true, signature: sig }));
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  console.error(JSON.stringify({ success: false, error: String(lastErr) }));
  process.exit(1);
}

const args = process.argv.slice(2);
const usePublic = args.includes('--use-public-faucet');
const filtered = args.filter((a) => a !== '--use-public-faucet');
const [pubkeyStr, solAmountStr] = filtered;
if (!pubkeyStr || !solAmountStr) {
  console.error('Usage: node dist/scripts/airdrop.js <recipientPubkey> <solAmount> [--use-public-faucet]');
  process.exit(1);
}

airdrop(pubkeyStr, solAmountStr, usePublic).catch((err) => {
  console.error(err);
  process.exit(1);
});
