import { z } from 'zod';

const discoverInputSchema = z.object({
  query: z.string().min(2),
  mode: z.enum(['raw', 'summary']).default('raw'),
  filters: z
    .object({ format: z.array(z.string()).optional(), maxCost: z.number().positive().optional(), freshness: z.string().optional() })
    .optional(),
});
export const discoverInput = discoverInputSchema;
export const discoverInputShape = discoverInputSchema.shape;

const discoverResultSchema = z.object({
  results: z.array(
    z.object({
      resourceId: z.string(),
      title: z.string(),
      type: z.string(),
      format: z.string(),
      domain: z.string().nullish(),
      updatedAt: z.string().nullish(),
      summary: z.string().nullish(),
      tags: z.array(z.string()).nullish(),
      priceEstimate: z.number().nullish(),
      avgSizeKb: z.number().nullish(),
      samplePreview: z.string().nullish(),
      relevanceScore: z.number().nullish(),
      latencyMs: z.number().nullish(),
      score: z.number().nullish(),
    })
  ),
  recommended: z.string().nullish(),
});
export const discoverResult = discoverResultSchema;
export const discoverResultShape = discoverResultSchema.shape;

const fetchInputSchema = z.object({
  resourceId: z.string().optional(),
  url: z.string().url().optional(),
  mode: z.enum(['raw', 'summary']),
  constraints: z
    .object({ maxCost: z.number().positive().optional(), maxBytes: z.number().positive().optional() })
    .optional(),
});
export const fetchInput = fetchInputSchema.refine((v) => !!(v.resourceId || v.url), { message: 'resourceId or url required' });
export const fetchInputShape = fetchInputSchema.shape;

export const receiptSchema = z.object({
  id: z.string(),
  resource: z.object({ id: z.string(), title: z.string(), ref: z.string().optional() }),
  providerId: z.string(),
  userId: z.string(),
  agentId: z.string(),
  mode: z.enum(['raw', 'summary']),
  requested_mode: z.enum(['raw', 'summary']).optional(),
  bytes_billed: z.number(),
  unit_price: z.number().optional(),
  flat_price: z.number().optional(),
  paid_total: z.number(),
  splits: z.array(z.object({ to: z.string(), amount: z.number() })),
  policy_version: z.string().optional(),
  x402_tx: z.string().optional(),
  provider_onchain_tx: z.string().optional(),
  tap_digest: z.string().optional(),
  ts: z.string(),
  sig: z.string(),
});

const fetchResultSchema = z.object({
  content: z.union([z.string(), z.object({ url: z.string().url() }), z.object({ chunks: z.array(z.string()) })]),
  receipt: receiptSchema,
});
export const fetchResult = fetchResultSchema;
export const fetchResultShape = fetchResultSchema.shape;

export type DiscoverInput = z.infer<typeof discoverInput>;
export type DiscoverResult = z.infer<typeof discoverResult>;
export type FetchInput = z.infer<typeof fetchInput>;
export type FetchResult = z.infer<typeof fetchResult>;
