import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyTapRequest } from '@/features/tap/tap.verifier.js';

export async function requireTap(req: FastifyRequest, reply: FastifyReply) {
  try {
    await verifyTapRequest(req);
  } catch (err) {
    req.log.error(
      {
        err,
        signatureInput: req.headers['signature-input'],
        signature: req.headers.signature,
      },
      'tap_verification_failed'
    );
    return reply.code(401).send({ error: 'TAP_VERIFICATION_FAILED' });
  }
}
