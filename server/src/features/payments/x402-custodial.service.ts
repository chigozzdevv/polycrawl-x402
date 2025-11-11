import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from '@solana/spl-token';
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
): Promise<{ x402Version: number; kind: any; signedTransaction: string; extra?: any }> {
  const env = loadEnv();
  const conn = getConnection();

  const walletKey = await findWalletKey(userId, 'payer', 'solana');
  if (!walletKey) throw new Error('USER_WALLET_NOT_FOUND');

  const secretKeyBuffer = decryptSecret(walletKey.enc);
  const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);

  const payTo = new PublicKey(requirements.payTo);
  const usdcMint = new PublicKey(requirements.asset);
  const amountAtomic = BigInt(requirements.maxAmountRequired);

  const fromAta = await getOrCreateAssociatedTokenAccount(
    conn,
    userKeypair,
    usdcMint,
    userKeypair.publicKey
  );

  const toAta = await getOrCreateAssociatedTokenAccount(
    conn,
    userKeypair,
    usdcMint,
    payTo
  );

  const tx = new Transaction();
  tx.add(
    createTransferInstruction(
      fromAta.address,
      toAta.address,
      userKeypair.publicKey,
      amountAtomic,
      [],
      undefined
    )
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  const feePayer = requirements.extra?.feePayer;
  if (feePayer) {
    tx.feePayer = new PublicKey(feePayer);
    tx.partialSign(userKeypair);
  } else {
    tx.feePayer = userKeypair.publicKey;
    tx.sign(userKeypair);
  }

  const serialized = tx.serialize({
    requireAllSignatures: !feePayer,
    verifySignatures: false
  });
  const signedTransaction = Buffer.from(serialized).toString('base64');

  return {
    x402Version: 1,
    kind: {
      scheme: requirements.scheme,
      network: requirements.network,
    },
    signedTransaction,
    extra: requirements.extra,
  };
}
