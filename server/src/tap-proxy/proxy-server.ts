import Fastify from 'fastify';
import cors from '@fastify/cors';
import { signTapRequest, type TapSignOptions } from './tap-signer.js';
import fs from 'node:fs/promises';
import { generateKeyId } from './keygen.js';
import { createPublicKey } from 'node:crypto';

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
  // Derive public key PEM from the private key to compute a stable keyId
  let derivedPublicKeyPem: string | undefined;
  try {
    const pub = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) as string;
    derivedPublicKeyPem = pub;
  } catch {
    if (!config.keyId) {
      throw new Error(
        'Failed to derive public key from TAP private key. Provide TAP_KEY_ID or use a PKCS#8 Ed25519 private key.'
      );
    }
  }
  const keyId = config.keyId || generateKeyId(derivedPublicKeyPem!);

  // Pass through OAuth discovery and registration endpoints without authentication
  app.get('/.well-known/oauth-authorization-server', async (request, reply) => {
    try {
      const response = await fetch(`${config.targetUrl}/.well-known/oauth-authorization-server`);
      const data = await response.json();
      return reply.code(response.status).send(data);
    } catch (error: any) {
      app.log.error({ error }, 'OAuth discovery failed');
      return reply.code(502).send({ error: 'BAD_GATEWAY', message: error.message });
    }
  });

  app.get('/.well-known/oauth-protected-resource/*', async (request, reply) => {
    const path = (request.params as any)['*'];
    try {
      const response = await fetch(`${config.targetUrl}/.well-known/oauth-protected-resource/${path}`);
      const data = await response.json();
      return reply.code(response.status).send(data);
    } catch (error: any) {
      app.log.error({ error }, 'OAuth resource discovery failed');
      return reply.code(502).send({ error: 'BAD_GATEWAY', message: error.message });
    }
  });

  app.post('/register', async (request, reply) => {
    try {
      const response = await fetch(`${config.targetUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      const data = await response.json();
      return reply.code(response.status).send(data);
    } catch (error: any) {
      app.log.error({ error }, 'OAuth registration failed');
      return reply.code(502).send({ error: 'BAD_GATEWAY', message: error.message });
    }
  });

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
        algorithm: 'ed25519',
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

  app.get('/', async () => ({
    status: 'ok',
    message: 'Polycrawl TAP proxy',
    forwardTarget: config.targetUrl,
  }));

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
