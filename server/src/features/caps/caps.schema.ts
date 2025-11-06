import { z } from 'zod';

export const setCapsInput = z.object({
  global_weekly_cap: z.number().positive().optional(),
  per_site_daily_cap: z.number().positive().optional(),
  per_mode_caps: z
    .object({
      raw: z.number().positive().optional(),
      summary: z.number().positive().optional(),
    })
    .optional(),
});

export const capsResult = z.object({
  global_weekly_cap: z.number().optional(),
  per_site_daily_cap: z.number().optional(),
  per_mode_caps: z
    .object({
      raw: z.number().optional(),
      summary: z.number().optional(),
    })
    .optional(),
  updated_at: z.string(),
});

export type SetCapsInput = z.infer<typeof setCapsInput>;
export type CapsResult = z.infer<typeof capsResult>;
