import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { discoverService, fetchService } from '@/features/mcp/mcp.service.js';
import {
  discoverInputShape,
  discoverResultShape,
  fetchInputShape,
  fetchResultShape,
  type DiscoverInput,
  type FetchInput,
} from '@/features/mcp/mcp.schema.js';
import { getSessionContext, setSessionContext, clearSessionContext } from '@/services/oauth/session-store.js';

export type McpRuntime = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

export async function createMcpRuntime(): Promise<McpRuntime> {
  const server = new McpServer({
    name: 'polycrawl-mcp',
    version: '1.0.0',
    description: 'MCP tools for Polycrawl data discovery and monetized fetch',
  });

  server.registerTool(
    'discover_resources',
    {
      title: 'Discover provider resources',
      description: 'Search Polycrawl catalog for provider resources that match a query',
      inputSchema: discoverInputShape,
      outputSchema: discoverResultShape,
    } as any,
    (async (args: DiscoverInput, extra: any) => {
      const context = getSessionContext(extra?.sessionId);
      if (!context) {
        return {
          isError: true,
          structuredContent: { error: 'OAUTH_REQUIRED' },
          content: [{ type: 'text' as const, text: 'OAUTH_REQUIRED' }],
        };
      }
      const out = await discoverService({ query: args.query, filters: args.filters });
      return {
        structuredContent: out,
        content: [{ type: 'text' as const, text: JSON.stringify(out) }],
      };
    }) as any
  );

  server.registerTool(
    'fetch_content',
    {
      title: 'Fetch provider content',
      description: 'Retrieve metered content from a provider resource with settlement',
      inputSchema: fetchInputShape,
      outputSchema: fetchResultShape,
    } as any,
    (async (args: FetchInput, extra: any) => {
      const { resourceId, mode, constraints } = args;
      if (!resourceId) {
        return {
          isError: true,
          structuredContent: { error: 'RESOURCE_ID_REQUIRED', detail: 'fetch_content currently requires resourceId' },
          content: [{ type: 'text' as const, text: 'RESOURCE_ID_REQUIRED' }],
        };
      }

      const context = getSessionContext(extra?.sessionId);
      if (!context) {
        return {
          isError: true,
          structuredContent: { error: 'OAUTH_REQUIRED' },
          content: [{ type: 'text' as const, text: 'OAUTH_REQUIRED' }],
        };
      }

      const out = await fetchService({
        userId: context.userId,
        clientId: context.clientId,
        agentId: context.agentId,
        resourceId,
        mode,
        constraints,
      });

      if (out.status !== 200) {
        const payload = { error: out.error, quote: (out as any).quote };
        return {
          isError: true,
          structuredContent: payload,
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        };
      }

      const payload = { content: out.content, receipt: out.receipt };
      return {
        structuredContent: payload,
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    }) as any
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (sessionId: string) => {
      const ctx = getSessionContext();
      if (ctx) setSessionContext(sessionId, ctx);
    },
    onsessionclosed: (sessionId: string) => {
      clearSessionContext(sessionId);
    },
  });

  await server.connect(transport);

  return { server, transport };
}
