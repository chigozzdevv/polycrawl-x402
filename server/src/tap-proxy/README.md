# TAP Agent Proxy

A middleware service that signs HTTP requests with Visa Trusted Agent Protocol (TAP) headers using RFC 9421 HTTP Message Signatures.

## Quick Start

```bash
# 1. Generate keys
npm run tap:keygen

# 2. Configure .env
TAP_PRIVATE_KEY_PATH=.tap-keys/tap-agent-private.pem
TAP_KEY_ID=<your-key-id>
TAP_TARGET_URL=http://localhost:3000
TAP_PROXY_PORT=8080

# 3. Start proxy
npm run tap:proxy

# 4. Use proxy
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/proxy/mcp/discovery?query=datasets
```

## Files

- **`keygen.ts`** - Generate Ed25519 key pairs for TAP signing
- **`tap-signer.ts`** - RFC 9421 signature generation (core TAP logic)
- **`proxy-server.ts`** - Fastify proxy server with TAP signing
- **`index.ts`** - CLI entry point

## How It Works

```
Request Flow:
1. Claude → Proxy with OAuth token
2. Proxy validates OAuth
3. Proxy signs with TAP (RFC 9421)
4. Proxy → Polycrawl with TAP headers
5. Polycrawl verifies TAP signature
6. Polycrawl → Proxy → Claude with response
```

## TAP Signature Example

```http
GET /mcp/discovery?query=datasets HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJS...
Signature-Input: sig2=("@authority" "@path");created=1735689600;keyid="poqkL...";alg="Ed25519";expires=1735693200;nonce="e8N7S...";tag="agent-browser-auth"
Signature: sig2=:jdq0SqOwHdyHr9+r5jw3iYZH6aNGKijYp/EstF4RQTQdi5N5YYKrD+mCT1HA1nZDsi6nJKuHxUi/5Syp3rLWBA==:
```

## Tag Auto-Detection

- **`agent-payer-auth`**: checkout, payment, pay, purchase, order, cart, wallet, receipt
- **`agent-browser-auth`**: all other paths

## Algorithms Supported

- **Ed25519** (default, recommended)
- PS256 (RSA-PSS)
- RS256 (RSA PKCS#1)
- ES256 (ECDSA P-256)

## Security Notes

- Private keys are **never** transmitted
- Signatures expire after 8 minutes (configurable)
- Nonces prevent replay attacks
- Timestamps prevent stale requests

## Full Documentation

See [../../TAP_PROXY_SETUP.md](../../TAP_PROXY_SETUP.md) for complete setup guide.
