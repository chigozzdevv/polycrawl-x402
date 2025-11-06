import { z } from 'zod';

export const createResourceInput = z
  .object({
  title: z.string().min(2),
  type: z.enum(['site', 'dataset', 'file']),
  format: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  schema: z.array(z.string()).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  price_per_kb: z.number().nonnegative().optional(),
  price_flat: z.number().nonnegative().optional(),
  visibility: z.enum(['public', 'restricted']).default('public'),
  modes: z.array(z.enum(['raw', 'summary'])).default(['raw']),
  storage_ref: z.string().optional(),
  connector_id: z.string().optional(),
  allow_agent_ids: z.array(z.string()).optional(),
  deny_paths: z.array(z.string()).optional(),
})
  .superRefine((val, ctx) => {
    if (val.type === 'site' && (!val.domain || val.domain.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'domain is required for site resources', path: ['domain'] });
    }
  });

export const getResourceQuery = z.object({ id: z.string().min(1) });
