import { z } from 'zod';

export const listReceiptsQuery = z.object({ limit: z.coerce.number().int().positive().max(100).default(20) }).partial();
