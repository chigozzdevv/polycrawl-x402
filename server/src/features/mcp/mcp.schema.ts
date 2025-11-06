import { z } from 'zod';

export const discoverInput = z.object({
  query: z.string().min(2),
  mode: z.enum(['raw', 'summary']).default('raw'),
  filters: z
    .object({ format: z.array(z.string()).optional(), maxCost: z.number().positive().optional(), freshness: z.string().optional() })
    .optional(),
});

export const discoverResult = z.object({
  results: z.array(
    z.object({
      resourceId: z.string(),
      title: z.string(),
      type: z.string(),
      format: z.string(),
      domain: z.string().optional(),
      updatedAt: z.string().optional(),
      summary: z.string().optional(),
      tags: z.array(z.string()).optional(),
      priceEstimate: z.number().optional(),
      avgSizeKb: z.number().optional(),
      samplePreview: z.string().optional(),
      relevanceScore: z.number().optional(),
      latencyMs: z.number().optional(),
    })
  ),
  recommended: z.string().optional(),
});

export const fetchInput = z
  .object({
    resourceId: z.string().optional(),
    url: z.string().url().optional(),
    mode: z.enum(['raw', 'summary']),
    constraints: z
      .object({ maxCost: z.number().positive().optional(), maxBytes: z.number().positive().optional() })
      .optional(),
  })
  .refine((v) => !!(v.resourceId || v.url), { message: 'resourceId or url required' });

export const receiptSchema = z.object({
  id: z.string(),
  resource: z.object({ id: z.string(), title: z.string(), ref: z.string().optional() }),
  providerId: z.string(),
  userId: z.string(),
  agentId: z.string(),
  mode: z.enum(['raw', 'summary']),
  bytes_billed: z.number(),
  unit_price: z.number().optional(),
  flat_price: z.number().optional(),
  paid_total: z.number(),
  splits: z.array(z.object({ to: z.string(), amount: z.number() })),
  policy_version: z.string().optional(),
  x402_tx: z.string().optional(),
  tap_digest: z.string().optional(),
  ts: z.string(),
  sig: z.string(),
});

export const fetchResult = z.object({
  content: z.union([z.string(), z.object({ url: z.string().url() }), z.object({ chunks: z.array(z.string()) })]),
  receipt: receiptSchema,
});

export type DiscoverInput = z.infer<typeof discoverInput>;
export type DiscoverResult = z.infer<typeof discoverResult>;
export type FetchInput = z.infer<typeof fetchInput>;
export type FetchResult = z.infer<typeof fetchResult>;
