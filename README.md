# Polycrawl - The Gateway Between AI Agents and Protected IPs.

 [Updated Video Demo](https://youtu.be/kCZEhzAP35I) (pls the one in submission form is noisy and there is no way to edit, this one is better :)

 Polycrawl is the gateway that lets AI agents fetch data behind paywalls, logins, or anti-bot systems — legally and fairly — powered by TAP message signatures and X402 payments on Solana USDC.

## Table of contents

- [1) The problem we solve](#1-the-problem-we-solve)
- [2) The solution: Polycrawl](#2-the-solution-polycrawl)
- [3) How it works (high‑level)](#3-how-it-works-high-level)
- [4) Architecture overview](#4-architecture-overview)
- [5) Protocols and standards](#5-protocols-and-standards)
- [6) Core domain model](#6-core-domain-model)
- [7) User flows](#7-user-flows)
  - [Consumer (AI agent) flow](#consumer-ai-agent-flow)
  - [Provider (content owner) flow](#provider-content-owner-flow)
- [8) Payments and settlement (X402 on Solana USDC)](#8-payments-and-settlement-x402-on-solana-usdc)
- [9) Receipts and verification](#9-receipts-and-verification)
- [10) Project structure](#10-project-structure)
- [11) Setup and installation](#11-setup-and-installation)
  - [Quick start (run locally)](#quick-start-run-locally)
  - [Prerequisites](#prerequisites)
  - [Server environment (server/.env)](#server-environment-serverenv)
  - [Client environment (client/.env)](#client-environment-clientenv)
  - [Local development commands](#local-development-commands)
  - [Where to get credentials](#where-to-get-credentials)
- [12) MCP tool reference](#12-mcp-tool-reference)
- [13) Security and compliance notes](#13-security-and-compliance-notes)
- [14) Troubleshooting](#14-troubleshooting)

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
- Settlement via X402 on Solana USDC (devnet by default).
- Ed25519‑signed receipts linking every access to immutable evidence, including on‑chain hashes and optional TAP digest.

## 3) How it works (high‑level)

1) Agents authenticate (OAuth 2.1 PKCE) and discover resources via MCP.
2) If the target resource requires authentication, a Connector (API key/JWT/OAuth or internal) injects the correct authorization to fetch from the origin; connector secrets are encrypted at rest.
3) Policies/modes are enforced (raw/summary), costs estimated, caps checked.
4) Settle payment via X402 on Solana USDC (devnet by default); client responds to a 402 challenge with X-PAYMENT, server verifies and records the tx.
5) Deliver content (inline chunks or signed URL) and issue a signed receipt.
6) Providers receive earnings; optional immediate payout recorded on‑chain.

## 4) Architecture overview

- Client (React + Vite): dashboards for Consumers and Providers (wallets, analytics, receipts, resources).
- Server (Fastify + TypeScript + MongoDB):
  - Auth: email/password, Solana wallet login, OAuth 2.1 for MCP.
  - MCP: base https://api.polycrawl.com/mcp; exposes discover_resources and fetch_content tools.
  - Payments: X402 middleware and Solana USDC settlement.
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
- TAP (RFC 9421): enforced signed HTTP requests. For agents without TAP JWK signing yet, the server signs a loopback request to `/tap/mock` (mock) to demonstrate readiness; we still compute a `tap_digest` (hash of signature base) for non‑repudiation without storing raw signatures.
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

![MCP connection](docs-media/agent-mcp-connection.png)

1. Authenticate: email/password or wallet login; for MCP, OAuth 2.1 PKCE with resource indicators against https://api.polycrawl.com/mcp.
2. Discover: call `discover_resources` with a natural‑language query; results ranked by relevance/price/latency.

   ![Discover resources](docs-media/agent-discover-resources.png)

3. Quote/checks: server estimates cost, enforces mode/visibility and spending caps.
4. Settle via X402 and fetch:
   - Server may 402 with X402 `accepts`; client submits `X-PAYMENT`.
   - Server verifies payment, records `x402_tx`, then fetches and returns content.
   - If the origin requires auth, the fetch is executed via the configured Connector (API key/JWT/OAuth/internal).
5. Receive content: base64 chunks (small/streamable) or a signed URL (Cloudinary) for larger assets.

   ![Fetch result](docs-media/agent-fetch-result.png)

6. Get receipt: Ed25519‑signed, includes totals, tx hashes, and optional `tap_digest`. UI links to devnet explorer.

### Provider (content owner) flow

1. Create provider profile; link payout wallet (Solana public key).
2. Publish resources: set pricing, modes (raw/summary), visibility (public/restricted), attach connector or storage.
   
   ![Create resources](docs-media/create-resources.png)

3. Verify ownership (optional; required for site resources): DNS TXT or file method for domains.

   ![Verify domain ownership](docs-media/resources-domain.png)

4. Earn: receive internal credits (and optional immediate on‑chain payouts). Review analytics and top sources/agents.

   ![Provider earnings](docs-media/provider-earnings.png)
5. Govern: configure spending caps, platform fee bps, and access policies.

## 8) Payments and settlement (X402 on Solana USDC)

Primary settlement is via X402 on Solana USDC and is recorded on receipts:

- X402 flow
  - Middleware computes requirements for Solana devnet USDC: `network=solana-devnet`, `asset=<USDC mint>`, `payTo=<platform address>`, facilitator `feePayer`.
  - If `X-PAYMENT` is absent, respond 402 with `accepts`.
  - Verify `X-PAYMENT` using the facilitator; on success, attach `X-PAYMENT-RESPONSE`, mark settled, and persist `x402_tx`.
  - Fee coverage: we use the Coinbase CDP facilitator as fee payer, so on-chain fees are covered; agents only need USDC for payments. Providers moving payouts to their linked wallets may incur Solana fees for those transfers.

Note: internal wallets exist only for local development/testing and are not used for production settlement.

## 9) Receipts and verification

- Structure: `resource, providerId, userId, agentId, mode, bytes_billed, unit_price?|flat_price?, paid_total, splits[]` plus `x402_tx?`, `provider_onchain_tx?`, `tap_digest?`, `sig/ed25519_sig`, `ts`.
- Signing: Ed25519 JWT using `ED25519_PRIVATE_KEY` (PKCS#8) or a file path. Clients can verify with the corresponding public key.
- TAP digest: SHA‑256 of `@authority`, `@path`, and `@signature-params` (from `signature-input`) — links the TAP‑signed call to the receipt.
- UI: transaction hashes link to Solana explorer with `?cluster=devnet`; digests are truncated visually.

## 10) Project structure

- Root
  - client/ — React app (Vite)
    - src/pages/dashboard/* — consumer/provider dashboards (wallets, receipts, resources)
    - src/services/api.ts — typed API client
  - server/ — Fastify API + MCP runtime
    - src/server.ts, src/app.ts — bootstrap
    - src/config/ — env.ts, db.ts
    - src/middleware/ — oauth.ts, x402.ts, tap.ts
    - src/features/
      - auth/ — routes, service, model for auth and OAuth 2.1
      - mcp/ — Model Context Protocol runtime
      - payments/ — X402 payments and helpers
      - tap/ — TAP verification and local mock helpers
      - wallets/ — internal wallets, keys, services
      - receipts/ — signed receipt persistence
      - resources/, providers/, connectors/, caps/, analytics/, agents/
    - src/services/ — solana/solana.service.ts, crypto/keystore.ts
    - src/scripts/ — fund-agent.ts, airdrop.ts, sol-balance.ts
  - README.md — this guide

### TAP subsystem (server/src/features/tap and middleware)

- middleware/tap.ts — re‑exports `requireTap` middleware
- features/tap/tap.verifier.ts — verifies TAP signatures; loads JWKS or derives local public key; enforces nonce/timestamp windows
- features/tap/tap.middleware.ts — Fastify preHandler enforcing TAP on routes
- features/tap/tap.mock.routes.ts — TAP‑protected endpoints used with the mock signer to validate the stack
- features/tap/tap-forwarder.ts — `verifyTapMock`: signs a loopback request to `/tap/mock` using local key for demo
- features/tap/nonce.model.ts — persistent nonce index to prevent replay
- features/tap/tap.digest.ts — computes `tap_digest` for receipts
  
Also:

- tap-proxy/index.ts — proxy entry
- tap-proxy/proxy-server.ts — local TAP signing proxy used for demos (`npm run tap:proxy`)
- tap-proxy/tap-signer.ts — TAP HTTP message signer (Ed25519)
- tap-proxy/keygen.ts — TAP key id derivation and key utilities

### MCP subsystem (server/src/features/mcp)

- mcp.routes.ts — registers MCP transport, hooks TAP/X402, and exposes tools endpoints
- mcp.controller.ts — orchestrates discover and fetch
- mcp.service.ts — business logic for discovery/fetch; integrates resources/connectors
- mcp.schema.ts — zod schemas for inputs/outputs
- mcp.sdk.ts — in‑process MCP runtime/transport setup
- mcp.model.ts — data types for MCP session/context

### X402 payments subsystem (server/src/features/payments and middleware)

- middleware/x402.ts — `requireX402ForMcpFetch`: advertises requirements (402), verifies `X-PAYMENT`
- features/payments/x402.service.ts — talks to facilitator to verify/settle; requirement helpers and validators
- features/payments/x402-custodial.service.ts — builds custodial payment payloads (Solana USDC devnet)

## 11) Setup and installation

### Quick start (run locally)

1) Start MongoDB locally or use Atlas (see links below).
2) Server

```bash
cd server
npm install
cp .env.example .env  # fill the required values from the table below
npm run tap:keygen    # optional: generate local TAP keypair into .tap-keys/
npm run dev           # starts Fastify on http://localhost:3000
```

3) Client

```bash
cd client
npm install
cp .env.example .env  # set VITE_API_BASE_URL=http://localhost:3000
npm run dev           # starts Vite on http://localhost:5173
```

Production build:

```bash
cd server && npm run build && npm start
```

### Prerequisites

- Node.js 20+
- MongoDB (local or remote)
- Solana devnet access (default RPC inferred; custom RPC/WS optional)

### Server environment (`server/.env`)

Minimum:

- `PORT=3000`
- `MONGODB_URI=mongodb://localhost:27017/polycrawl` (or Atlas URI)
- `JWT_SECRET` (strong random)
- `ED25519_PRIVATE_KEY` (PKCS#8 string) or `ED25519_PRIVATE_KEY_PATH` (file path) — used to sign receipts and OAuth tokens
- `KEY_ENCRYPTION_KEY` (used to encrypt wallet keys and connector secrets)
- `CLIENT_APP_URL` (e.g., http://localhost:5173)

TAP:

- `TAP_JWKS_URL` — optional; verification will first try JWKS, then fall back to local key
- `TAP_PRIVATE_KEY_PATH` (+ optional `TAP_KEY_ID`) — enables deriving a public key locally for verification
- Note: TAP is fully wired. If an agent can’t sign yet, the server signs a loopback request to `/tap/mock` using the local key (verifyTapMock) to demonstrate; disable the mock when real signatures are available.

X402 / Solana (external settlement via Coinbase CDP facilitator):

- `X402_NETWORK=solana-devnet`
- `X402_PAYTO=<PLATFORM_USDC_RECIPIENT>` (Solana address)
- `X402_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (USDC devnet) and `X402_USDC_DECIMALS=6`
- `CDP_API_KEY_ID=<your CDP key id>` and `CDP_API_KEY_SECRET=<your CDP key secret>` — required to call the Coinbase facilitator
- `X402_PLATFORM_PRIVATE_KEY=<base64 secret key>` — platform wallet for payouts and funding
- Optional: `SOLANA_RPC_URL`, `SOLANA_WS_URL` (custom RPC/WS)

Cloudinary (optional storage for signed URLs):

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Other:

- `PLATFORM_FEE_BPS=50` (0.50%)
- Dev funding toggles: `FUND_AGENT_ON_SIGNUP`, `FUND_USDC_ON_SIGNUP`, `FUND_SOL_ON_SIGNUP`

### Client environment (`client/.env`)

- `VITE_API_BASE_URL=http://localhost:3000` (or leave empty; client infers :3000 in dev)

### Local development commands

- Generate local TAP keys (optional): `npm run tap:keygen`
- Start TAP proxy (optional demo): `npm run tap:proxy`
- Fund agents on signup (devnet): enable `FUND_AGENT_ON_SIGNUP=true`

### Where to get credentials

- MongoDB (local): https://www.mongodb.com/try/download/community
- MongoDB Atlas (cloud): https://www.mongodb.com/atlas/database
- Coinbase CDP API keys: https://docs.cdp.coinbase.com/ (create keys in the developer portal)
- Cloudinary: https://cloudinary.com/
- Solana devnet explorer: https://explorer.solana.com/?cluster=devnet

For Solana wallets and keys, you can use `solana-keygen` or a custodial approach; ensure the platform wallet has devnet SOL for fees and USDC for payouts.

---

## 12) MCP tool reference

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

## 13) Security and compliance notes

- TAP verification enforces nonce/timestamp windows; nonces are stored with TTL to prevent replay.
- OAuth 2.1 + PKCE and resource indicators scope access to `/mcp`.
- Resource policies (modes, visibility) and per‑user caps protect Providers and Users.
- Keys and connector configs are encrypted at rest (`KEY_ENCRYPTION_KEY`).

## 14) Troubleshooting

- Missing hashes in receipts: same‑owner access may waive cost and skip settlement.
- TAP verification errors: provide `TAP_JWKS_URL` or set `TAP_PRIVATE_KEY_PATH` so a public key can be derived.
- On‑chain payouts failing: ensure platform wallet has SOL for fees and USDC on devnet; verify `X402_PLATFORM_PRIVATE_KEY`.
- Large assets return signed URLs; ensure Cloudinary credentials are set.

 
