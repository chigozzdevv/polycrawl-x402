import type { FastifyRequest, FastifyReply } from 'fastify';
import { signupInput, loginInput, forgotPasswordInput, resetPasswordInput, walletChallengeInput, walletVerifyInput, changePasswordInput } from '@/features/auth/auth.schema.js';
import { createWalletChallenge, performPasswordReset, requestPasswordReset, verifyWalletLink, walletLogin, signupService, loginService, changeUserPassword } from '@/features/auth/auth.service.js';

export async function signupController(req: FastifyRequest, reply: FastifyReply) {
  const body = signupInput.parse(req.body);
  const res = await signupService(body.name, body.email, body.password);
  if (!res.ok) return reply.code(409).send({ error: res.error });
  return reply.send(res.auth);
}

export async function loginController(req: FastifyRequest, reply: FastifyReply) {
  const body = loginInput.parse(req.body);
  const res = await loginService(body.email, body.password);
  if (!res.ok) return reply.code(401).send({ error: res.error });
  return reply.send(res.auth);
}

export async function forgotPasswordController(req: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordInput.parse(req.body);
  await requestPasswordReset(body.email);
  return reply.send({ ok: true });
}

export async function resetPasswordController(req: FastifyRequest, reply: FastifyReply) {
  const body = resetPasswordInput.parse(req.body);
  const res = await performPasswordReset(body.token, body.password);
  if (!res.ok) return reply.code(400).send({ error: res.error });
  return reply.send({ ok: true });
}

export async function changePasswordController(req: FastifyRequest, reply: FastifyReply) {
  const body = changePasswordInput.parse(req.body);
  const userId = (req as any).userId as string;
  const res = await changeUserPassword(userId, body.currentPassword, body.newPassword);
  if (!res.ok) {
    const status = res.error === 'INVALID_CURRENT_PASSWORD' ? 400 : 404;
    return reply.code(status).send({ error: res.error });
  }
  return reply.send({ ok: true });
}

export async function walletChallengeController(req: FastifyRequest, reply: FastifyReply) {
  const body = walletChallengeInput.parse(req.body);
  const ch = await createWalletChallenge(body.address, body.chain);
  return reply.send(ch);
}

export async function walletLinkController(req: FastifyRequest, reply: FastifyReply) {
  const body = walletVerifyInput.parse(req.body);
  const userId = (req as any).userId as string;
  const res = await verifyWalletLink(userId, body.address, body.chain, body.signature, body.nonce);
  if (!res.ok) return reply.code(400).send({ error: res.error });
  return reply.send({ ok: true });
}

export async function walletLoginController(req: FastifyRequest, reply: FastifyReply) {
  const body = walletVerifyInput.parse(req.body);
  const res = await walletLogin(body.address, body.chain, body.signature, body.nonce);
  if (!res.ok) return reply.code(400).send({ error: res.error });
  return reply.send(res.auth);
}
