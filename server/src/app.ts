import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import formbody from '@fastify/formbody';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { registerMcpRoutes } from '@/features/mcp/mcp.routes.js';
import { registerAuthRoutes } from '@/features/auth/auth.routes.js';
import { registerAgentsRoutes } from '@/features/agents/agents.routes.js';
import { registerProvidersRoutes } from '@/features/providers/providers.routes.js';
import { registerWalletsRoutes } from '@/features/wallets/wallets.routes.js';
import { registerCapsRoutes } from '@/features/caps/caps.routes.js';
import { registerOAuthRoutes } from '@/features/oauth/oauth.routes.js';
import { registerUsersRoutes } from '@/features/users/users.routes.js';
import { registerAnalyticsRoutes } from '@/features/analytics/analytics.routes.js';
import { registerResourcesRoutes } from '@/features/resources/resources.routes.js';
import { registerReceiptsRoutes } from '@/features/receipts/receipts.routes.js';
import { registerConnectorsRoutes } from '@/features/connectors/connectors.routes.js';

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, { origin: true, credentials: true });
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(formbody);

  app.register(registerAuthRoutes, { prefix: '/auth' });
  app.register(registerUsersRoutes, { prefix: '/' });
  app.register(registerAgentsRoutes, { prefix: '/' });
  app.register(registerProvidersRoutes, { prefix: '/' });
  app.register(registerResourcesRoutes, { prefix: '/' });
  app.register(registerReceiptsRoutes, { prefix: '/' });
  app.register(registerConnectorsRoutes, { prefix: '/' });
  app.register(registerWalletsRoutes, { prefix: '/' });
  app.register(registerCapsRoutes, { prefix: '/' });
  app.register(registerAnalyticsRoutes, { prefix: '/' });
  app.register(registerOAuthRoutes);
  app.register(registerMcpRoutes, { prefix: '/mcp' });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/.well-known/mcp.json', async () => ({
    version: '2025-06-18',
    tools: [
      {
        name: 'discover_resources',
        description: 'Search and discover data resources by natural language query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 2, description: 'Search query' },
            mode: { type: 'string', enum: ['raw', 'summary'], default: 'raw' },
            filters: {
              type: 'object',
              properties: {
                format: { type: 'array', items: { type: 'string' } },
                maxCost: { type: 'number', minimum: 0 },
              },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'fetch_content',
        description: 'Fetch content from a resource with automatic payment',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            mode: { type: 'string', enum: ['raw', 'summary'] },
            constraints: {
              type: 'object',
              properties: {
                maxCost: { type: 'number', minimum: 0 },
                maxBytes: { type: 'number', minimum: 0 },
              },
            },
          },
          required: ['mode'],
          oneOf: [{ required: ['resourceId'] }, { required: ['url'] }],
        },
      },
    ],
  }));

  return app;
}
