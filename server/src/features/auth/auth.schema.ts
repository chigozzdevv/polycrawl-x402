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

export const forgotPasswordInput = z.object({
  email: z.string().email(),
});

export const resetPasswordInput = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const walletChallengeInput = z.object({
  chain: z.literal('solana'),
  address: z.string().min(32),
});

export const walletVerifyInput = z.object({
  chain: z.literal('solana'),
  address: z.string().min(32),
  signature: z.string().min(64),
  nonce: z.string().min(8),
});
