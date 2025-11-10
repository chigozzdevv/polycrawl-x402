import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { signupInput, loginInput, forgotPasswordInput, resetPasswordInput, walletChallengeInput, walletVerifyInput, changePasswordInput } from '@/features/auth/auth.schema.js';
import { signupController, loginController, forgotPasswordController, resetPasswordController, walletChallengeController, walletLinkController, walletLoginController, changePasswordController, logoutController } from '@/features/auth/auth.controller.js';
import { requireUser } from '@/middleware/auth.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.post('/signup', { schema: { body: signupInput } }, signupController);
  r.post('/login', { schema: { body: loginInput } }, loginController);
  r.post('/forgot_password', { schema: { body: forgotPasswordInput } }, forgotPasswordController);
  r.post('/reset_password', { schema: { body: resetPasswordInput } }, resetPasswordController);
  r.post('/change_password', { preHandler: [requireUser], schema: { body: changePasswordInput } }, changePasswordController);
  r.post('/wallet/challenge', { schema: { body: walletChallengeInput } }, walletChallengeController);
  r.post('/wallet/link', { preHandler: [requireUser], schema: { body: walletVerifyInput } }, walletLinkController);
  r.post('/wallet/login', { schema: { body: walletVerifyInput } }, walletLoginController);
  r.post('/logout', logoutController);
}
