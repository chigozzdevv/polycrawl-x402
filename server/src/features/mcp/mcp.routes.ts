import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireOAuth } from '@/middleware/oauth.js';
import { discoverInput, discoverResult, fetchInput, fetchResult } from '@/features/mcp/mcp.schema.js';
import { discoverController, fetchController } from '@/features/mcp/mcp.controller.js';
import { createMcpRuntime } from '@/features/mcp/mcp.sdk.js';
import { runWithRequestContext, setSessionContext } from '@/services/oauth/session-store.js';
import { requireX402ForMcpFetch } from '@/middleware/x402.js';
import { verifyTapMock } from '@/features/tap/tap-forwarder.js';

export async function registerMcpRoutes(app: FastifyInstance) {
  const runtime = await createMcpRuntime();

  app.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/',
    handler: async (req, reply) => {
      await requireOAuth(req, reply);
      if (reply.sent) return;
      try {
        await verifyTapMock(req);
      } catch (err) {
        app.log.error({ err }, 'tap_mock_failed');
        return reply.code(502).send({ error: 'TAP_VERIFICATION_FAILED', message: 'Unable to demonstrate TAP locally. Please retry.' });
      }

      const body = (req as any).body;
      if (body?.method === 'tools/call' && body?.params?.name === 'fetch_content') {
        await requireX402ForMcpFetch(req, reply);
        if (reply.sent) return;
      }

      reply.hijack();
      try {
        const oauth = (req as any).oauth;
        const x402 = (req as any)._x402;
        const incomingSession = req.headers['mcp-session-id'];
        if (oauth && typeof incomingSession === 'string') {
          setSessionContext(incomingSession, oauth);
        }
        const context = { ...oauth, _x402: x402 };
        await runWithRequestContext(context, async () => {
          await runtime.transport.handleRequest(req.raw, reply.raw, (req as any).body);
        });
      } catch (err) {
        app.log.error({ err }, 'mcp_transport_error');
        if (!reply.raw.headersSent) {
          reply.raw.writeHead(500, { 'content-type': 'application/json' });
          reply.raw.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Internal Server Error' }, id: null }));
        }
        runtime.transport.onerror?.(err as Error);
      }
    },
  });

  app.addHook('onClose', async () => {
    await runtime.server.close().catch(() => undefined);
  });

  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/tools/discover_resources', {
    preHandler: [requireOAuth],
    schema: { body: discoverInput, response: { 200: discoverResult } },
    handler: discoverController,
  });

  r.post('/tools/fetch_content', {
    preHandler: [requireOAuth, requireX402ForMcpFetch],
    schema: { body: fetchInput, response: { 200: fetchResult } },
    handler: fetchController,
  });
}
