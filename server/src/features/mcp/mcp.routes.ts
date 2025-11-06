import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireTap } from '@/features/tap/tap.middleware.js';
import { requireOAuth } from '@/middleware/oauth.js';
import { discoverInput, discoverResult, fetchInput, fetchResult } from '@/features/mcp/mcp.schema.js';
import { discoverController, fetchController } from '@/features/mcp/mcp.controller.js';
import { createMcpRuntime } from '@/features/mcp/mcp.sdk.js';
import { runWithRequestContext, setSessionContext } from '@/services/oauth/session-store.js';

export async function registerMcpRoutes(app: FastifyInstance) {
  const runtime = await createMcpRuntime();

  app.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/',
    handler: async (req, reply) => {
      await requireOAuth(req, reply);
      if (reply.sent) return;
      await requireTap(req, reply);
      if (reply.sent) return;

      reply.hijack();
      try {
        const oauth = (req as any).oauth;
        const incomingSession = req.headers['mcp-session-id'];
        if (oauth && typeof incomingSession === 'string') {
          setSessionContext(incomingSession, oauth);
        }
        const context = oauth;
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
    preHandler: [requireOAuth, requireTap],
    schema: { body: discoverInput, response: { 200: discoverResult } },
    handler: discoverController,
  });

  r.post('/tools/fetch_content', {
    preHandler: [requireOAuth, requireTap],
    schema: { body: fetchInput, response: { 200: fetchResult } },
    handler: fetchController,
  });
}
