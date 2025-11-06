import { z } from 'zod';

export const connectorType = z.enum(['api_key', 'jwt', 'oauth', 'internal']);

export const apiKeyConfig = z.object({
  header: z.string().optional(),
  scheme: z.string().optional(),
  token: z.string().min(1),
});

export const jwtConfig = z.object({
  header: z.string().optional(),
  token: z.string().min(1),
});

export const oauthConfig = z.object({
  access_token: z.string().min(1),
});

export const internalConfig = z.object({});

export const createConnectorInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('api_key'), config: apiKeyConfig }),
  z.object({ type: z.literal('jwt'), config: jwtConfig }),
  z.object({ type: z.literal('oauth'), config: oauthConfig }),
  z.object({ type: z.literal('internal'), config: internalConfig }),
]);

export const updateConnectorInput = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  config: z.union([apiKeyConfig, jwtConfig, oauthConfig, internalConfig]).optional(),
});
