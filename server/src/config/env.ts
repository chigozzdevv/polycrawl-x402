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
  ED25519_PRIVATE_KEY: z.string().optional(),
  KEY_ENCRYPTION_KEY: z.string().min(16).optional(),
  X402_FACILITATOR_URL: z.string().url().optional(),
  PLATFORM_FEE_BPS: z.string().optional(),
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
