import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { signupInput, loginInput } from '@/features/auth/auth.schema.js';
import { signupController, loginController } from '@/features/auth/auth.controller.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.post('/signup', { schema: { body: signupInput } }, signupController);
  r.post('/login', { schema: { body: loginInput } }, loginController);
}
