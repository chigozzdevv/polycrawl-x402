# Polycrawl - The Gateway Between AI Agents and Protected IPs.

 Polycrawl is an MCP‑native, pay‑per‑crawl platform that lets AI agents fetch permissioned, verified data and licensed content — with instant settlement and cryptographic receipts — powered by TAP message signatures and X402 payments on Solana USDC.

## Table of contents

1) The problem we solve
2) The solution: Polycrawl
3) How it works (high‑level)
4) Architecture overview
5) Protocols and standards
6) Core domain model
7) User flows
   - Consumer (AI agent) flow
   - Provider (content owner) flow
8) Payments and settlement (X402 on Solana USDC)
9) Receipts and verification
10) Setup and installation
    - Prerequisites
    - Server environment
    - Client environment
    - Local development
11) MCP tool reference
12) Security and compliance notes
13) Troubleshooting

---

## 1) The problem we solve

The web wasn’t built for AI agents. Everyone loses:

- Agents hit 403s and paywalls with no standardized way to authenticate or pay.
- No verifiable licensing or provenance; legal risk from unauthorized scraping.
- IP owners earn zero from AI traffic; must choose between blocking all bots or giving away value.
- No usage attribution, no granular control, no per‑request metering.

## 2) The solution: Polycrawl

Polycrawl provides a consent‑first, protocol‑driven bridge between agents and content owners:

- MCP for capability discovery and safe agent integration.
- TAP (RFC 9421) for signed HTTP requests and traceability.
- Usage‑based pricing (flat or per‑KB) with spending caps and policies.
- Settlement either with internal wallets or externally via X402 on Solana USDC (devnet by default).
- Ed25519‑signed receipts linking every access to immutable evidence, including on‑chain hashes and optional TAP digest.

## 3) How it works (high‑level)

1) Agents authenticate (OAuth 2.1 PKCE) and discover resources via MCP.
2) Policies/modes are enforced (raw/summary), costs estimated, caps checked.
3) Settle payment: internal capture or X402 external settlement on Solana USDC devnet.
4) Deliver content (inline chunks or signed URL) and issue a signed receipt.
5) Providers receive earnings; optional immediate payout recorded on‑chain.

## 4) Architecture overview

- Client (React + Vite): dashboards for Consumers and Providers (wallets, analytics, receipts, resources).
- Server (Fastify + TypeScript + MongoDB):
  - Auth: email/password, Solana wallet login, OAuth 2.1 for MCP.
  - MCP: `/mcp` exposes discover_resources and fetch_content tools.
  - Payments: internal wallets, X402 middleware, Solana USDC transfers.
  - Storage: Cloudinary signed URLs and external connectors (API key/JWT/OAuth).
  - Receipts: Ed25519 JWT signatures; explorer links for devnet txs; optional TAP digest.

Code pointers:

- Client
  - `client/src/pages/landing/*` — product narrative (hero, problem, how‑it‑works)
  - `client/src/pages/dashboard/consumer/receipts.tsx` — receipts list (x402/provider tx links + TAP digest)
  - `client/src/services/api.ts` — typed API client (Receipt, Resource, Wallet, etc.)
- Server
  - `server/src/app.ts` — bootstraps routes and MCP metadata
  - `server/src/features/mcp/*` — MCP routes, schema, service, SDK
  - `server/src/features/payments/*` — X402 middleware and Solana service
  - `server/src/features/receipts/*` — receipt storage and Ed25519 signing
  - `server/src/features/wallets/*` — internal wallets, holds, ledger, keys
  - `server/src/features/resources/*` — resources CRUD, discovery
  - `server/src/features/tap/*` — TAP verification, digest util, local proxy

## 5) Protocols and standards

- MCP (Model Context Protocol): standard tool interface for agents.
- OAuth 2.1 + PKCE: agent authorization; `/.well-known/*` metadata provided.
- TAP (RFC 9421): signed HTTP requests. We persist a `tap_digest` (hash of signature base) on receipts for non‑repudiation without storing raw signatures.
- X402 payments: exact‑amount payment challenge/response. We settle through X402 on Solana USDC and record tx hashes.
- Ed25519 receipts: signed with `jose` (EdDSA), verifiable by clients.

## 6) Core domain model

- Provider: user who owns resources and receives payouts.
- Resource: site/dataset/file, with mode allowlist, pricing (flat/per‑KB), visibility (public/restricted), connector/storage.
- Agent: OAuth client context for a user; used to scope access and analytics.
- Wallets (internal): payer/payout balances; holds and captures; ledger entries.
- Request: per‑fetch lifecycle (`initiated` → `settled`/`failed`), metering and costs.
- Receipt: persisted proof with Ed25519 signature and metadata (`x402_tx?`, `provider_onchain_tx?`, `tap_digest?`).

## 7) User flows

### Consumer (AI agent) flow

1. Authenticate: email/password or wallet login; for MCP, OAuth 2.1 PKCE with resource indicators.
2. Discover: call `discover_resources` with a natural‑language query; results ranked by relevance/price/latency.
3. Quote/checks: server estimates cost, enforces mode/visibility and spending caps.
4. Settle and fetch:
   - Internal: place hold, fetch, meter bytes, capture hold, split fee to platform; provider share recorded and optionally paid on‑chain.
   - External: server may 402 with X402 `accepts`; client submits `X-PAYMENT`; settlement verified; `x402_tx` recorded.
5. Receive content: base64 chunks (small/streamable) or a signed URL (Cloudinary) for larger assets.
6. Get receipt: Ed25519‑signed, includes totals, tx hashes, and optional `tap_digest`. UI links to devnet explorer.

### Provider (content owner) flow

1. Create provider profile; link payout wallet (Solana public key).
2. Publish resources: set pricing, modes (raw/summary), visibility (public/restricted), attach connector or storage.
3. Verify ownership (optional): DNS TXT or file method for domains.
4. Earn: receive internal credits (and optional immediate on‑chain payouts). Review analytics and top sources/agents.
5. Govern: configure spending caps, platform fee bps, and access policies.

## 8) Payments and settlement (X402 on Solana USDC)

Two settlement paths exist; both are supported and recorded on receipts:

- Internal wallets
  - Hold funds at request start (if not same‑owner access).
  - After fetch, calculate final metered cost and capture the hold.
  - Apply platform fee (bps); credit provider’s internal payout wallet.
  - Optionally perform immediate on‑chain payout from the platform wallet → `provider_onchain_tx`.

- External via X402
  - Middleware computes requirements for Solana devnet USDC: `network=solana-devnet`, `asset=<USDC mint>`, `payTo=<platform address>`, facilitator `feePayer`.
  - If `X-PAYMENT` is absent, respond 402 with `accepts`.
  - Verify `X-PAYMENT` using the facilitator; on success, attach `X-PAYMENT-RESPONSE`, mark settled, and persist `x402_tx`.

We explicitly settle through X402 on SOL USDC (Solana USDC) for external payments in devnet by default.

## 9) Receipts and verification

- Structure: `resource, providerId, userId, agentId, mode, bytes_billed, unit_price?|flat_price?, paid_total, splits[]` plus `x402_tx?`, `provider_onchain_tx?`, `tap_digest?`, `sig/ed25519_sig`, `ts`.
- Signing: Ed25519 JWT using `ED25519_PRIVATE_KEY` (PKCS#8) or a file path. Clients can verify with the corresponding public key.
- TAP digest: SHA‑256 of `@authority`, `@path`, and `@signature-params` (from `signature-input`) — links the TAP‑signed call to the receipt.
- UI: transaction hashes link to Solana explorer with `?cluster=devnet`; digests are truncated visually.

## 10) Setup and installation

### Prerequisites

- Node.js 20+
- MongoDB (local or remote)
- Solana devnet access (default RPC inferred; custom RPC/WS optional)

### Server environment (`server/.env`)

Minimum:

- `PORT=3000`
- `MONGODB_URI=mongodb://localhost:27017/polycrawl`
- `JWT_SECRET` (strong random)
- `ED25519_PRIVATE_KEY` (PKCS#8) or `ED25519_PRIVATE_KEY_PATH`
- `KEY_ENCRYPTION_KEY` (encrypt wallet keys/connectors)
- `CLIENT_APP_URL` (e.g., http://localhost:5173)

TAP (choose one path):

- `TAP_JWKS_URL` — verify against hosted JWKS; or
- `TAP_PRIVATE_KEY_PATH` (+ optional `TAP_KEY_ID`) — derive public key locally for verification

X402 / Solana:

- `X402_FACILITATOR_URL=https://facilitator.payai.network`
- `X402_NETWORK=solana-devnet`
- `X402_PAYTO=<PLATFORM_USDC_RECIPIENT>` (base58)
- `X402_USDC_MINT=4zMMC9...` and `X402_USDC_DECIMALS=6`
- `X402_PLATFORM_PRIVATE_KEY=<base64 secret key>` (needed for provider payouts)
- Optional: `SOLANA_RPC_URL`, `SOLANA_WS_URL`

Cloudinary (for internal storage refs): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Other:

- `PLATFORM_FEE_BPS=50` (0.50%)
- Dev funding toggles: `FUND_AGENT_ON_SIGNUP`, `FUND_USDC_ON_SIGNUP`, `FUND_SOL_ON_SIGNUP`

### Client environment (`client/.env`)

- `VITE_API_BASE_URL=http://localhost:3000` (or leave empty; client infers :3000 in dev)

### Local development

1) Start MongoDB.
2) Server

```
cd server
npm install
cp .env.example .env  # fill required values
npm run tap:keygen    # optional local TAP keys → .tap-keys/
npm run dev
```

3) Client

```
cd client
npm install
cp .env.example .env  # set VITE_API_BASE_URL
npm run dev
```

## 11) MCP tool reference

### discover_resources

- Endpoint: `POST /mcp/tools/discover_resources`
- Input: `{ query: string, mode?: 'raw'|'summary', filters?: { format?: string[], maxCost?: number } }`
- Output: `{ results: Array<{ resourceId, title, type, format, priceEstimate, relevanceScore, latencyMs, ... }>, recommended?: string }`

### fetch_content

- Endpoint: `POST /mcp/tools/fetch_content`
- Input: `{ resourceId: string, mode: 'raw'|'summary', constraints?: { maxCost?: number, maxBytes?: number } }`
- Behavior:
  - May respond `402` with `{ accepts: [requirements] }` (X402 on Solana USDC).
  - On success: `{ content, receipt }`, where `content` is `{ chunks: string[] }` or `{ url }`.
  - The `receipt` may include `x402_tx`, `provider_onchain_tx`, and `tap_digest`.

## 12) Security and compliance notes

- TAP verification enforces nonce/timestamp windows; nonces are stored with TTL to prevent replay.
- OAuth 2.1 + PKCE and resource indicators scope access to `/mcp`.
- Resource policies (modes, visibility) and per‑user caps protect Providers and Users.
- Keys and connector configs are encrypted at rest (`KEY_ENCRYPTION_KEY`).

## 13) Troubleshooting

- Missing hashes in receipts: same‑owner access may waive cost and skip settlement.
- TAP verification errors: provide `TAP_JWKS_URL` or set `TAP_PRIVATE_KEY_PATH` so a public key can be derived.
- On‑chain payouts failing: ensure platform wallet has SOL for fees and USDC on devnet; verify `X402_PLATFORM_PRIVATE_KEY`.
- Large assets return signed URLs; ensure Cloudinary credentials are set.
