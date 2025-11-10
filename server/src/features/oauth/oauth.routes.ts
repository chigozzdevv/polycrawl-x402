import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  registerClient,
  ensureClientExists,
  createAuthorizationCode,
  issueTokensFromCode,
  issueTokensFromRefreshToken,
  buildProtectedResourceMetadata,
  buildAuthorizationServerMetadata,
  getJwksResponse,
  getResourcePathSuffix,
  assertClientSecret,
} from '@/features/oauth/oauth.service.js';
import { resolveUserId } from '@/middleware/auth.js';
import { loadEnv } from '@/config/env.js';

const registrationInput = z
  .object({
    redirect_uris: z.array(z.string().url()).min(1),
    client_name: z.string().optional(),
    token_endpoint_auth_method: z.enum(['none', 'client_secret_post']).optional(),
    scope: z.string().optional(),
  })
  .passthrough();

const authorizeQuery = z.object({
  response_type: z.literal('code'),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  state: z.string().optional(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.enum(['S256']),
  resource: z.string().url().optional(),
  scope: z.string().optional(),
  response_mode: z.enum(['json', 'query']).optional(),
});

const tokenBody = z
  .object({
    grant_type: z.enum(['authorization_code', 'refresh_token']),
    code: z.string().optional(),
    redirect_uri: z.string().url().optional(),
    code_verifier: z.string().optional(),
    refresh_token: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    resource: z.string().url().optional(),
  })
  .passthrough();

function getBaseUrl(req: FastifyRequest) {
  const origin = req.headers['x-forwarded-proto']
    ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
    : `${req.protocol}://${req.headers.host}`;
  return origin;
}

function sendAuthError(reply: FastifyReply, error: string, description?: string) {
  reply.status(400).send({
    error,
    error_description: description,
  });
}

export async function registerOAuthRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const resourceSuffix = getResourcePathSuffix();

  r.post('/oauth/register', {
    schema: { body: registrationInput },
    handler: async (req, reply) => {
      const body = registrationInput.parse(req.body);
      const result = await registerClient({
        client_name: body.client_name,
        redirect_uris: body.redirect_uris,
        scope: body.scope,
        token_endpoint_auth_method: body.token_endpoint_auth_method,
      });
      return reply.status(201).send(result);
    },
  });

  r.get('/oauth/authorize', {
    schema: { querystring: authorizeQuery },
    handler: async (req, reply) => {
      const query = authorizeQuery.parse(req.query);
      const env = loadEnv();
      const resource = env.OAUTH_RESOURCE || `${getBaseUrl(req)}/mcp`;
      const requestedResource = query.resource || resource;
      if (requestedResource !== resource) {
        return sendAuthError(reply, 'invalid_target', 'Unsupported resource');
      }
      let userId = (req as any).userId as string | undefined | null;
      if (!userId) {
        userId = await resolveUserId(req);
      }
      if (!userId) {
        const clientAppUrl = process.env.CLIENT_APP_URL || 'https://polycrawl.com';
        const authPath = process.env.CLIENT_AUTH_PATH || '/auth';
        const redirectTarget = new URL(clientAppUrl);
        redirectTarget.pathname = authPath;
        redirectTarget.searchParams.set('return_to', `${getBaseUrl(req)}${req.url}`);
        return reply.redirect(redirectTarget.toString(), 302);
      }
      (req as any).userId = userId;
      const client = await ensureClientExists(query.client_id);
      if (!client.redirect_uris.includes(query.redirect_uri)) {
        return sendAuthError(reply, 'invalid_request', 'redirect_uri mismatch');
      }
      const scope = query.scope ? query.scope.split(' ').filter(Boolean) : ['mcp'];
      const code = await createAuthorizationCode({
        client_id: query.client_id,
        user_id: userId,
        redirect_uri: query.redirect_uri,
        code_challenge: query.code_challenge,
        code_challenge_method: query.code_challenge_method,
        resource: requestedResource,
        scope,
      });
      if (query.response_mode === 'json') {
        return reply.send({
          code,
          state: query.state,
        });
      }
      const redirectUrl = new URL(query.redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (query.state) redirectUrl.searchParams.set('state', query.state);
      reply.header('Cache-Control', 'no-store');
      reply.status(302).header('Location', redirectUrl.toString()).send();
      return;
    },
  });

  r.post('/oauth/token', {
    schema: { body: tokenBody },
    handler: async (req, reply) => {
      const body = tokenBody.parse(req.body);
      const baseUrl = getBaseUrl(req);
      const env = loadEnv();
      const resource = body.resource || env.OAUTH_RESOURCE || `${baseUrl}/mcp`;
      try {
        if (body.grant_type === 'authorization_code') {
          if (!body.code || !body.redirect_uri || !body.code_verifier) {
            return sendAuthError(reply, 'invalid_request', 'Missing parameters');
          }
          if (body.client_id) {
            const client = await ensureClientExists(body.client_id);
            assertClientSecret(client, body.client_secret);
          }
          const tokens = await issueTokensFromCode(body.code, body.redirect_uri, body.code_verifier, resource);
          reply.header('Cache-Control', 'no-store');
          return reply.send({
            access_token: tokens.access_token,
            token_type: 'Bearer',
            expires_in: tokens.expires_in,
            refresh_token: tokens.refresh_token,
            refresh_token_expires_in: tokens.refresh_token_expires_in,
            scope: tokens.scope,
            resource: tokens.resource,
          });
        }
        if (body.grant_type === 'refresh_token') {
          if (!body.refresh_token || !body.client_id) return sendAuthError(reply, 'invalid_request', 'Missing parameters');
          const client = await ensureClientExists(body.client_id);
          assertClientSecret(client, body.client_secret);
          const tokens = await issueTokensFromRefreshToken(body.refresh_token, body.client_id, resource);
          reply.header('Cache-Control', 'no-store');
          return reply.send({
            access_token: tokens.access_token,
            token_type: 'Bearer',
            expires_in: tokens.expires_in,
            refresh_token: tokens.refresh_token,
            refresh_token_expires_in: tokens.refresh_token_expires_in,
            scope: tokens.scope,
            resource: tokens.resource,
          });
        }
        return sendAuthError(reply, 'unsupported_grant_type');
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : 'invalid_grant';
        const error = message === 'invalid_target' ? 'invalid_target' : 'invalid_grant';
        return sendAuthError(reply, error);
      }
    },
  });

  app.get('/.well-known/oauth-protected-resource', async (req, reply) => {
    const metadata = buildProtectedResourceMetadata(getBaseUrl(req));
    reply.header('Cache-Control', 'no-store');
    return reply.send(metadata);
  });
  if (resourceSuffix) {
    app.get(`/.well-known/oauth-protected-resource${resourceSuffix}`, async (req, reply) => {
      const metadata = buildProtectedResourceMetadata(getBaseUrl(req));
      reply.header('Cache-Control', 'no-store');
      return reply.send(metadata);
    });
  }

  app.get('/.well-known/oauth-authorization-server', async (req, reply) => {
    const metadata = buildAuthorizationServerMetadata(getBaseUrl(req));
    reply.header('Cache-Control', 'no-store');
    return reply.send(metadata);
  });
  if (resourceSuffix) {
    app.get(`/.well-known/oauth-authorization-server${resourceSuffix}`, async (req, reply) => {
      const metadata = buildAuthorizationServerMetadata(getBaseUrl(req));
      reply.header('Cache-Control', 'no-store');
      return reply.send(metadata);
    });
  }

  app.get('/.well-known/oauth-jwks.json', async (_req, reply) => {
    const jwks = await getJwksResponse();
    reply.header('Cache-Control', 'no-store');
    return reply.send(jwks);
  });
}
