import type { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'node:fs/promises'
import { createPublicKey } from 'node:crypto'
import { loadEnv } from '@/config/env.js'
import { signTapRequest } from '@/tap-proxy/tap-signer.js'
import { generateKeyId } from '@/tap-proxy/keygen.js'

type TapForwardConfig = {
  baseUrl: string
  privateKey: string
  keyId: string
}

let configPromise: Promise<TapForwardConfig | null> | null = null

async function loadConfig(): Promise<TapForwardConfig | null> {
  if (configPromise) return configPromise
  configPromise = (async () => {
    const env = loadEnv()
    const target = env.TAP_TARGET_URL
    if (!target) return null

    const privateKeyPath = env.TAP_PRIVATE_KEY_PATH || '.tap-keys/tap-agent-private.pem'
    let privateKey: string
    try {
      privateKey = await fs.readFile(privateKeyPath, 'utf-8')
    } catch (error) {
      console.error('tap-forwarder: unable to read private key', error)
      return null
    }

    let keyId = env.TAP_KEY_ID
    if (!keyId) {
      try {
        const pub = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) as string
        keyId = generateKeyId(pub)
      } catch (error) {
        console.error('tap-forwarder: failed to derive key id', error)
        return null
      }
    }

    return {
      baseUrl: target.replace(/\/$/, ''),
      privateKey,
      keyId,
    }
  })()
  return configPromise
}

export async function forwardTapIfConfigured(req: FastifyRequest, reply: FastifyReply) {
  const cfg = await loadConfig()
  if (!cfg) return false

  const originalUrl = req.raw.url || req.url || '/'
  const targetUrl = `${cfg.baseUrl}${originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl}`

  const headersToForward: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value !== 'string') continue
    if (key.toLowerCase().startsWith('signature')) continue
    headersToForward[key] = value
  }

  const body =
    req.body === undefined || req.body === null
      ? undefined
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body)

  const tag = inferTagFromPath(originalUrl)

  const { signature, signatureInput } = signTapRequest(req.method || 'GET', targetUrl, headersToForward, body, {
    privateKey: cfg.privateKey,
    keyId: cfg.keyId,
    tag,
    algorithm: 'ed25519',
    expiresIn: 480,
  })

  headersToForward['signature-input'] = signatureInput
  headersToForward['signature'] = signature
  if (body && !headersToForward['content-type']) {
    headersToForward['content-type'] = 'application/json'
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headersToForward,
      body,
    })

    const text = await response.text()
    const contentType = response.headers.get('content-type') || 'text/plain'
    reply.code(response.status).header('content-type', contentType)
    if (contentType.includes('application/json')) {
      try {
        reply.send(JSON.parse(text))
      } catch {
        reply.send(text)
      }
    } else {
      reply.send(text)
    }
  } catch (error: any) {
    console.error('tap-forwarder: request failed', error)
    reply.code(502).send({ error: 'BAD_GATEWAY', message: error?.message || 'Tap forward failed' })
  }

  return true
}

function inferTagFromPath(path: string) {
  const lower = path.toLowerCase()
  const payerKeywords = ['checkout', 'payment', 'pay', 'purchase', 'order', 'cart', 'wallet', 'receipt']
  return payerKeywords.some((keyword) => lower.includes(keyword)) ? 'agent-payer-auth' : 'agent-browser-auth'
}
