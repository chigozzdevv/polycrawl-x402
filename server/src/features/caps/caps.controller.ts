import type { FastifyRequest, FastifyReply } from 'fastify';
import { setCapsInput } from './caps.schema.js';
import { getUserCaps, setUserCaps, getDefaultCaps } from './caps.model.js';

export async function getCapsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  let caps = await getUserCaps(userId);
  if (!caps) caps = await getDefaultCaps();
  return reply.send(caps);
}

export async function setCapsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = setCapsInput.parse(req.body);
  await setUserCaps(userId, body as any);
  let updated = await getUserCaps(userId);
  if (!updated) updated = await getDefaultCaps();
  return reply.send(updated);
}
