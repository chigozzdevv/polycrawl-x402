import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { encryptSecret } from '@/services/crypto/keystore.js';
import { createConnectorInput, updateConnectorInput } from '@/features/connectors/connectors.schema.js';
import { insertConnector, listConnectorsByOwner, findConnectorById, updateConnector, disableConnector } from '@/features/connectors/connectors.model.js';

export async function createConnectorController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const body = createConnectorInput.parse(req.body);
  const id = 'conn_' + randomUUID();
  const enc = encryptSecret(JSON.stringify(body.config));
  await insertConnector({
    _id: id,
    owner_user_id: userId,
    type: body.type,
    enc_config: enc,
    status: 'active',
  } as any);
  return reply.send({ id });
}

export async function listConnectorsController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const items = await listConnectorsByOwner(userId);
  return reply.send({ items: items.map((c) => ({ id: c._id, type: c.type, status: c.status })) });
}

export async function getConnectorController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const id = String((req.params as any).id);
  const c = await findConnectorById(id);
  if (!c || c.owner_user_id !== userId) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
  return reply.send({ id: c._id, type: c.type, status: c.status });
}

export async function updateConnectorController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const id = String((req.params as any).id);
  const c = await findConnectorById(id);
  if (!c || c.owner_user_id !== userId) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
  const body = updateConnectorInput.parse(req.body);
  const patch: any = {};
  if (body.status) patch.status = body.status;
  if (body.config) patch.enc_config = encryptSecret(JSON.stringify(body.config));
  await updateConnector(id, patch);
  return reply.send({ id });
}

export async function deleteConnectorController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).userId as string;
  const id = String((req.params as any).id);
  const c = await findConnectorById(id);
  if (!c || c.owner_user_id !== userId) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
  await disableConnector(id);
  return reply.send({ id, status: 'disabled' });
}
