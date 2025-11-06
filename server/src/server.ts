import { buildApp } from '@/app.js';
import { loadEnv } from '@/config/env.js';
import { createNonceIndexes } from '@/features/tap/nonce.model.js';

async function main() {
  const env = loadEnv();
  const app = buildApp();
  const port = Number(env.PORT || 3000);
  try {
    await createNonceIndexes();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('TAP nonce index setup skipped:', (err as Error)?.message);
  }
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
