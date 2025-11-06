import { buildApp } from '@/app.js';
import { loadEnv } from '@/config/env.js';

async function main() {
  const env = loadEnv();
  const app = buildApp();
  const port = Number(env.PORT || 3000);
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
