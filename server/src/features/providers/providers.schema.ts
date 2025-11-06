import { z } from 'zod';
import { createResourceInput as _createResourceInput } from '@/features/resources/resources.schema.js';

export const createResourceInput = _createResourceInput; // backward compatibility

export const cloudinarySignatureInput = z.object({
  public_id: z.string().min(1),
});

export const siteVerifyInput = z.object({
  domain: z.string(),
  method: z.enum(['dns', 'file']),
});

export const siteVerifyCheckInput = z.object({
  domain: z.string(),
  method: z.enum(['dns', 'file']),
  token: z.string(),
});
