import Fastify from 'fastify';
import cors from '@fastify/cors';
import { signTapRequest, type TapSignOptions } from './tap-signer.js';
import fs from 'node:fs/promises';
import { generateKeyId } from './keygen.js';

type ProxyConfig = {
  privateKeyPath: string;
  keyId?: string;
  targetUrl: string;
  port: number;
  oauthClientId?: string;
  oauthClientSecret?: string;
};

export async function buildProxyServer(config: ProxyConfig) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });

  const privateKey = await fs.readFile(config.privateKeyPath, 'utf-8');
  const keyId = config.keyId || generateKeyId(privateKey);

  app.all('/proxy/*', async (request, reply) => {
    const proxyPath = (request.params as any)['*'];
    const targetUrl = `${config.targetUrl}/${proxyPath}${request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : ''}`;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' });
    }

    const tag = inferTagFromPath(proxyPath);

    const headersToForward: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string' && !key.toLowerCase().startsWith('signature')) {
        headersToForward[key] = value;
      }
    }

    const body = request.body ? JSON.stringify(request.body) : undefined;

    const { signatureInput, signature } = signTapRequest(
      request.method,
      targetUrl,
      headersToForward,
      body,
      {
        privateKey,
        keyId,
        tag,
        algorithm: 'Ed25519',
        expiresIn: 480,
      }
    );

    headersToForward['signature-input'] = signatureInput;
    headersToForward['signature'] = signature;
    headersToForward['content-type'] = 'application/json';

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headersToForward,
        body,
      });

      const responseBody = await response.text();
      const contentType = response.headers.get('content-type') || 'text/plain';

      reply.code(response.status).header('content-type', contentType);

      if (contentType.includes('application/json')) {
        try {
          return reply.send(JSON.parse(responseBody));
        } catch {
          return reply.send(responseBody);
        }
      }

      return reply.send(responseBody);
    } catch (error: any) {
      app.log.error({ error, targetUrl }, 'Proxy request failed');
      return reply.code(502).send({ error: 'BAD_GATEWAY', message: error.message });
    }
  });

  app.get('/health', async () => ({ status: 'ok', keyId }));

  return app;
}

function inferTagFromPath(path: string): 'agent-browser-auth' | 'agent-payer-auth' {
  const lowerPath = path.toLowerCase();

  const payerKeywords = ['checkout', 'payment', 'pay', 'purchase', 'order', 'cart', 'wallet', 'receipt'];
  for (const keyword of payerKeywords) {
    if (lowerPath.includes(keyword)) {
      return 'agent-payer-auth';
    }
  }

  return 'agent-browser-auth';
}

export async function startProxyServer(config: ProxyConfig) {
  const app = await buildProxyServer(config);

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`TAP Agent Proxy running on http://0.0.0.0:${config.port}`);
    console.log(`Forwarding to: ${config.targetUrl}`);
    console.log(`Key ID: ${config.keyId || 'auto-generated'}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
