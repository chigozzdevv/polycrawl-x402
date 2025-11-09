import 'dotenv/config';
import { loadEnv } from '../config/env.js';
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
import {
  getOrCreateAssociatedTokenAccount,
  transfer as splTransfer,
} from '@solana/spl-token';

function parseAtomic(amountStr: string, decimals: number): bigint {
  if (!amountStr) throw new Error('USDC amount is required');
  const [ints, frac = ''] = amountStr.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const s = `${ints}${fracPadded}`.replace(/^0+/, '') || '0';
  return BigInt(s);
}

async function main() {
  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const usdcMintStr = env.X402_USDC_MINT;
  const decimals = Number(env.X402_USDC_DECIMALS || 6);
  const platformSkB64 = env.X402_PLATFORM_PRIVATE_KEY;

  const [recipient, usdcAmountStr, solAmountStr] = process.argv.slice(2);
  if (!recipient || !usdcAmountStr) {
    console.error('Usage: node dist/scripts/fund-agent.js <recipientPubkey> <usdcAmount> [solAmount]');
    process.exit(1);
  }
  if (!platformSkB64) throw new Error('X402_PLATFORM_PRIVATE_KEY is missing');
  if (!usdcMintStr) throw new Error('X402_USDC_MINT is missing');

  const cluster = network === 'solana' ? 'mainnet-beta' : 'devnet';
  const endpoint = env.SOLANA_RPC_URL || clusterApiUrl(cluster);
  const connection = new Connection(endpoint, { commitment: 'confirmed', wsEndpoint: env.SOLANA_WS_URL });

  const payer = Keypair.fromSecretKey(Buffer.from(platformSkB64, 'base64'));
  const toPub = new PublicKey(recipient);
  const usdcMint = new PublicKey(usdcMintStr);
  const usdcAmount = parseAtomic(usdcAmountStr, decimals);

  let solSig: string | null = null;
  if (solAmountStr) {
    const lamports = Math.round(parseFloat(solAmountStr) * LAMPORTS_PER_SOL);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: toPub, lamports })
    );
    solSig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(JSON.stringify({ solSig }));
  }

  let usdcSig: string | null = null;
  if (usdcAmount > 0n) {
    const fromAta = await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);
    const toAta = await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, toPub);
    usdcSig = await splTransfer(connection, payer, fromAta.address, toAta.address, payer.publicKey, usdcAmount);
  }

  console.log(JSON.stringify({ usdcSig, solSig }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
