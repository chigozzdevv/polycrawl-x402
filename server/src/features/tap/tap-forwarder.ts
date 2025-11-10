import type { FastifyRequest } from 'fastify'
import fs from 'node:fs/promises'
import { createPublicKey } from 'node:crypto'
import { loadEnv } from '@/config/env.js'
import { signTapRequest } from '@/tap-proxy/tap-signer.js'
import { generateKeyId } from '@/tap-proxy/keygen.js'

let cachedConfig: Promise<{ privateKey: string; keyId: string }> | null = null

async function loadConfig() {
  if (cachedConfig) return cachedConfig
  cachedConfig = (async () => {
    const env = loadEnv()
    const privateKeyPath = env.TAP_PRIVATE_KEY_PATH || '.tap-keys/tap-agent-private.pem'
    const privateKey = await fs.readFile(privateKeyPath, 'utf-8')
    let keyId = env.TAP_KEY_ID
    if (!keyId) {
      const pub = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) as string
      keyId = generateKeyId(pub)
    }
    return { privateKey, keyId }
  })()
  return cachedConfig
}

function getBaseUrl(req: FastifyRequest) {
  const proto = (Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto']) || req.protocol
  const host = (Array.isArray(req.headers['x-forwarded-host']) ? req.headers['x-forwarded-host'][0] : req.headers['x-forwarded-host']) || req.headers.host
  if (!proto || !host) return null
  return `${proto}://${host}`
}

export async function verifyTapMock(req: FastifyRequest) {
  const baseUrl = getBaseUrl(req)
  if (!baseUrl) return
  const targetUrl = `${baseUrl}/tap/mock`
  const { privateKey, keyId } = await loadConfig()

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  const body = JSON.stringify({ method: req.method, path: req.url })
  const { signatureInput, signature } = signTapRequest('POST', targetUrl, headers, body, {
    privateKey,
    keyId,
    tag: 'agent-browser-auth',
    algorithm: 'ed25519',
    expiresIn: 480,
  })
  headers['signature-input'] = signatureInput
  headers['signature'] = signature

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body,
  })
  if (!res.ok) {
    throw new Error('Tap mock verification failed')
  }
}
