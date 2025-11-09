import 'dotenv/config';
import { loadEnv } from '../config/env.js';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

async function main() {
  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const cluster = network === 'solana' ? 'mainnet-beta' : 'devnet';
  const endpoint = env.SOLANA_RPC_URL || clusterApiUrl(cluster);
  const connection = new Connection(endpoint, { commitment: 'confirmed', wsEndpoint: env.SOLANA_WS_URL });

  const address = env.X402_PAYTO;
  if (!address) throw new Error('X402_PAYTO is not set');
  const pubkey = new PublicKey(address);

  const lamports = await connection.getBalance(pubkey, { commitment: 'confirmed' });
  const sol = lamports / LAMPORTS_PER_SOL;

  let usdcUi: number | null = null;
  let usdcDecimals: number | null = null;
  const usdcMintStr = env.X402_USDC_MINT;
  if (usdcMintStr) {
    try {
      const usdcMint = new PublicKey(usdcMintStr);
      const ata = await getAssociatedTokenAddress(usdcMint, pubkey);
      const bal = await connection.getTokenAccountBalance(ata, 'confirmed');
      usdcUi = bal.value.uiAmount ?? 0;
      usdcDecimals = bal.value.decimals;
    } catch (_e) {
      usdcUi = 0;
      usdcDecimals = Number(env.X402_USDC_DECIMALS || 6);
    }
  }

  console.log(JSON.stringify({ address, endpoint, lamports, sol, usdc: usdcUi, usdcDecimals }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
