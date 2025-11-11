import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getMint, createTransferCheckedInstruction } from '@solana/spl-token';
import { loadEnv } from '@/config/env.js';
import { findWalletKey } from '@/features/wallets/keys.model.js';
import { decryptSecret } from '@/services/crypto/keystore.js';
import type { X402PaymentRequirements } from './x402.service.js';

function getConnection(): Connection {
  const env = loadEnv();
  const network = env.X402_NETWORK || 'solana-devnet';
  const endpoint = env.SOLANA_RPC_URL || (network === 'solana' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');
  return new Connection(endpoint, { commitment: 'confirmed' });
}

export async function createCustodialX402Payment(
  userId: string,
  requirements: X402PaymentRequirements
): Promise<{ x402Version: number; scheme: string; network: string; payload: { transaction: string }; extra?: any }> {
  const conn = getConnection();

  const walletKey = await findWalletKey(userId, 'payer', 'solana');
  if (!walletKey) throw new Error('USER_WALLET_NOT_FOUND');

  const secretKeyBuffer = decryptSecret(walletKey.enc);
  const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);

  const payTo = new PublicKey(requirements.payTo);
  const usdcMint = new PublicKey(requirements.asset);
  const amountAtomic = BigInt(requirements.maxAmountRequired);

  console.log('[X402 Custodial] User wallet:', walletKey.public_key);
  console.log('[X402 Custodial] Payment details:', {
    to: payTo.toBase58(),
    mint: usdcMint.toBase58(),
    amount: amountAtomic.toString(),
  });

  const mintAccountInfo = await conn.getAccountInfo(usdcMint, 'confirmed');
  if (!mintAccountInfo) throw new Error('USDC_MINT_NOT_FOUND');
  const tokenProgramId = mintAccountInfo.owner;

  const fromAta = getAssociatedTokenAddressSync(
    usdcMint,
    userKeypair.publicKey,
    false,
    tokenProgramId,
  );

  const toAta = getAssociatedTokenAddressSync(
    usdcMint,
    payTo,
    true,
    tokenProgramId,
  );

  const mintInfo = await getMint(conn, usdcMint, 'confirmed', tokenProgramId);

  const transferInstruction = createTransferCheckedInstruction(
    fromAta,
    usdcMint,
    toAta,
    userKeypair.publicKey,
    amountAtomic,
    mintInfo.decimals,
    undefined,
    tokenProgramId,
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const feePayer = requirements.extra?.feePayer;
  const feePayerPubkey = feePayer ? new PublicKey(feePayer) : userKeypair.publicKey;

  const messageV0 = new TransactionMessage({
    payerKey: feePayerPubkey,
    recentBlockhash: blockhash,
    instructions: [transferInstruction],
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0);

  versionedTx.sign([userKeypair]);

  const serialized = versionedTx.serialize();
  const transaction = Buffer.from(serialized).toString('base64');

  const result = {
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      transaction,
    },
    extra: requirements.extra,
  };

  console.log('[X402 Custodial] Created payment:', {
    from: userKeypair.publicKey.toBase58(),
    to: payTo.toBase58(),
    amount: amountAtomic.toString(),
    hasFeePayer: !!feePayer,
    txLength: serialized.length,
  });

  return result;
}
