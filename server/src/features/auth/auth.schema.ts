import { z } from 'zod';

export const signupInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
