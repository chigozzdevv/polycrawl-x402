import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  MONGODB_URI: z.string().url().optional(),
  JWT_SECRET: z.string().min(16).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  TAP_JWKS_URL: z.string().url().optional(),
  TAP_TARGET_URL: z.string().url().optional(),
  TAP_PRIVATE_KEY_PATH: z.string().optional(),
  TAP_KEY_ID: z.string().optional(),
  ED25519_PRIVATE_KEY_PATH: z.string().optional(),
  KEY_ENCRYPTION_KEY: z.string().min(16).optional(),
  X402_FACILITATOR_URL: z.string().url().optional(),
  X402_NETWORK: z.string().optional(),
  X402_PAYTO: z.string().optional(),
  X402_USDC_MINT: z.string().optional(),
  X402_USDC_DECIMALS: z.string().optional(),
  X402_PLATFORM_PRIVATE_KEY: z.string().optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  SOLANA_WS_URL: z.string().url().optional(),
  FUND_AGENT_ON_SIGNUP: z.string().optional(),
  FUND_USDC_ON_SIGNUP: z.string().optional(),
  FUND_SOL_ON_SIGNUP: z.string().optional(),
  PLATFORM_FEE_BPS: z.string().optional(),
  OAUTH_ISSUER: z.string().url().optional(),
  OAUTH_RESOURCE: z.string().url().optional(),
  OAUTH_ACCESS_TOKEN_TTL: z.string().optional(),
  OAUTH_REFRESH_TOKEN_TTL: z.string().optional(),
  CLIENT_APP_URL: z.string().url().optional(),
  CLIENT_AUTH_PATH: z.string().optional(),
  SESSION_COOKIE_NAME: z.string().optional(),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  SESSION_COOKIE_SECURE: z.string().optional(),
  SESSION_COOKIE_MAX_AGE: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.toString());
  }
  cached = parsed.data;
  return cached;
}
