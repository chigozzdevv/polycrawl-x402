import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { signupInput, loginInput, forgotPasswordInput, resetPasswordInput, walletChallengeInput, walletVerifyInput, changePasswordInput } from '@/features/auth/auth.schema.js';
import { createWalletChallenge, performPasswordReset, requestPasswordReset, verifyWalletLink, walletLogin, signupService, loginService, changeUserPassword } from '@/features/auth/auth.service.js';
import { buildSessionCookie, buildSessionClearCookie } from '@/utils/session-cookie.js';
import { loadEnv } from '@/config/env.js';
import { jwtVerify } from 'jose';

export async function signupController(req: FastifyRequest, reply: FastifyReply) {
  const body = signupInput.parse(req.body);
  const res = await signupService(body.name, body.email, body.password);
  if (!res.ok) return reply.code(409).send({ error: res.error });
  reply.header('Set-Cookie', buildSessionCookie(res.auth.token, req.headers.host));
  return reply.send(res.auth);
}

export async function loginController(req: FastifyRequest, reply: FastifyReply) {
  const body = loginInput.parse(req.body);
  const res = await loginService(body.email, body.password);
  if (!res.ok) return reply.code(401).send({ error: res.error });
  reply.header('Set-Cookie', buildSessionCookie(res.auth.token, req.headers.host));
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
  reply.header('Set-Cookie', buildSessionCookie(res.auth.token, req.headers.host));
  return reply.send(res.auth);
}

export async function logoutController(req: FastifyRequest, reply: FastifyReply) {
  reply.header('Set-Cookie', buildSessionClearCookie(req.headers.host));
  return reply.send({ ok: true });
}

const sessionExchangeInput = z.object({
  token: z.string(),
  return_to: z.string().optional(),
});

export async function sessionExchangeController(req: FastifyRequest, reply: FastifyReply) {
  const body = sessionExchangeInput.parse(req.body);
  const env = loadEnv();
  if (!env.JWT_SECRET) {
    return reply.code(500).send({ error: 'SERVER_MISCONFIGURED' });
  }
  try {
    await jwtVerify(body.token, new TextEncoder().encode(env.JWT_SECRET));
  } catch {
    return reply.code(401).send({ error: 'AUTH_INVALID' });
  }

  reply.header('Set-Cookie', buildSessionCookie(body.token, req.headers.host));

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const baseUrl = `${proto}://${req.headers.host}`;
  let target = body.return_to;
  if (!target) {
    target = env.CLIENT_APP_URL || baseUrl;
  } else {
    try {
      const url = new URL(target);
      if (url.origin !== baseUrl) {
        const allowed = (process.env.OAUTH_ALLOWED_RETURN_TO_ORIGINS || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (!allowed.includes(url.origin)) {
          target = url.pathname + url.search;
        }
      }
    } catch {
      target = '/';
    }
  }

  return reply.redirect(target, 302);
}
