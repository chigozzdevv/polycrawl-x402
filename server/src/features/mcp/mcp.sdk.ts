import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { discoverService, fetchService } from '@/features/mcp/mcp.service.js';
import {
  discoverInput,
  discoverResult,
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
      inputSchema: discoverInput.shape,
      outputSchema: discoverResult.shape,
    },
    async (args: DiscoverInput, extra) => {
      try {
        const context = getSessionContext(extra?.sessionId);
        if (!context) {
          return {
            isError: true,
            structuredContent: { error: 'OAUTH_REQUIRED' },
            content: [{ type: 'text', text: 'OAuth authentication required. Please authenticate to use this tool.' }],
          };
        }
        const out = await discoverService({
          query: args.query,
          filters: args.filters,
          userId: context.userId,
          agentId: context.agentId
        });
        return {
          structuredContent: out,
          content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
        };
      } catch (err: any) {
        const msg = typeof err?.message === 'string' ? err.message : String(err);
        return {
          isError: true,
          structuredContent: { error: 'DISCOVERY_FAILED', detail: msg },
          content: [{ type: 'text', text: `Discovery failed: ${msg}` }],
        };
      }
    }
  );

  server.registerTool(
    'fetch_content',
    {
      title: 'Fetch provider content',
      description: 'Retrieve metered content from a provider resource with settlement',
      inputSchema: fetchInputShape,
      outputSchema: fetchResultShape,
    },
    async (args: FetchInput, extra) => {
      const { resourceId, mode, constraints } = args;
      if (!resourceId) {
        return {
          isError: true,
          structuredContent: { error: 'RESOURCE_ID_REQUIRED', detail: 'fetch_content currently requires resourceId' },
          content: [{ type: 'text', text: 'Resource ID is required to fetch content.' }],
        };
      }

      const context = getSessionContext(extra?.sessionId);
      if (!context) {
        return {
          isError: true,
          structuredContent: { error: 'OAUTH_REQUIRED' },
          content: [{ type: 'text', text: 'OAuth authentication required. Please authenticate to use this tool.' }],
        };
      }

      try {
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
            content: [{ type: 'text', text: `Fetch failed: ${out.error}${(out as any).quote ? ` (estimated cost: ${(out as any).quote})` : ''}` }],
          };
        }

        const payload = { content: out.content, receipt: out.receipt };
        return {
          structuredContent: payload,
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        };
      } catch (err: any) {
        const msg = typeof err?.message === 'string' ? err.message : String(err);
        return {
          isError: true,
          structuredContent: { error: 'FETCH_FAILED', detail: msg },
          content: [{ type: 'text', text: `Fetch failed: ${msg}` }],
        };
      }
    }
  );

  // Use stateless transport to maximize client compatibility (no Mcp-Session-Id required)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    // Session callbacks are unused in stateless mode; request-scoped context is set via runWithRequestContext
  });

  await server.connect(transport);

  return { server, transport };
}
