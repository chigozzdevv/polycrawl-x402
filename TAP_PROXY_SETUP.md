# TAP Agent Proxy Setup Guide

This guide explains how to set up and run the TAP (Trusted Agent Protocol) Agent Proxy that enables Claude and other AI agents to interact with TAP-protected MCP endpoints.

## What is the TAP Agent Proxy?

The TAP Agent Proxy is a middleware service that:
1. **Accepts requests** from AI agents (like Claude) authenticated via OAuth
2. **Signs those requests** with Visa TAP headers (RFC 9421 HTTP Message Signatures)
3. **Forwards them** to your Polycrawl server's TAP-protected MCP endpoints

This allows AI agents that don't natively support TAP to work with your TAP-protected APIs.

## Architecture

```
┌─────────┐         ┌──────────────┐         ┌────────────┐
│ Claude  │ OAuth   │  TAP Agent   │  TAP    │ Polycrawl  │
│ Agent   ├────────>│    Proxy     ├────────>│   Server   │
└─────────┘         └──────────────┘         └────────────┘
                     Signs with TAP          Verifies TAP
                     headers (RFC 9421)      signatures
```

## Prerequisites

- Node.js 18+ installed
- Your Polycrawl server running
- Visa TAP agent credentials (see registration section)

## Step 1: Generate TAP Agent Key Pair

First, generate your Ed25519 key pair for TAP signing:

```bash
cd server
npm run tap:keygen
```

This creates:
- `.tap-keys/tap-agent-public.pem` - Your public key
- `.tap-keys/tap-agent-private.pem` - Your private key (keep secure!)
- Displays your **Key ID** (base64url-encoded SHA256 hash of public key)

**IMPORTANT**: Save the Key ID displayed in the output.

## Step 2: Register with Visa TAP

To use TAP in production, you must register your agent with Visa:

1. Visit [Visa Developer Center](https://developer.visa.com/capabilities/trusted-agent-protocol)
2. Navigate to "Trusted Agent Protocol" → "Getting Started"
3. Apply for TAP agent enrollment through their vetting program
4. Submit your **public key** (`tap-agent-public.pem`)
5. Provide your **Key ID** from Step 1
6. Wait for approval (Visa verifies agents meet trust standards)

**For Development/Testing**: You can skip registration and test with your own infrastructure, but production merchants will reject unregistered agents.

## Step 3: Configure Environment Variables

Update your `server/.env` file:

```bash
# TAP Proxy Configuration
TAP_PRIVATE_KEY_PATH=.tap-keys/tap-agent-private.pem
TAP_KEY_ID=<your-key-id-from-step-1>
TAP_TARGET_URL=http://localhost:3000
TAP_PROXY_PORT=8080
```

**Configuration Options**:

- `TAP_PRIVATE_KEY_PATH`: Path to your private key file
- `TAP_KEY_ID`: Key ID from step 1 (optional, auto-generated if omitted)
- `TAP_TARGET_URL`: URL of your Polycrawl server
- `TAP_PROXY_PORT`: Port for the proxy server (default: 8080)

## Step 4: Start the TAP Agent Proxy

Run the proxy server:

```bash
cd server
npm run tap:proxy
```

You should see:

```
Starting TAP Agent Proxy with config:
- Private Key: .tap-keys/tap-agent-private.pem
- Key ID: poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U
- Target URL: http://localhost:3000
- Proxy Port: 8080

TAP Agent Proxy running on http://0.0.0.0:8080
```

## Step 5: Start Your Polycrawl Server

In a separate terminal:

```bash
cd server
npm run dev
```

## Step 6: Configure Claude to Use the Proxy

When making requests from Claude (or any AI agent), use the proxy URL instead of the direct server URL:

**Without Proxy** (blocked by TAP):
```
GET http://localhost:3000/mcp/discovery?query=datasets
Authorization: Bearer <oauth-token>
```

**With Proxy** (TAP signed):
```
GET http://localhost:8080/proxy/mcp/discovery?query=datasets
Authorization: Bearer <oauth-token>
```

The proxy will:
1. Validate your OAuth token
2. Add TAP signature headers (`Signature-Input`, `Signature`)
3. Forward to `http://localhost:3000/mcp/discovery?query=datasets`
4. Return the response

## How TAP Signing Works

The proxy automatically:

1. **Extracts request details**: method, URL, headers, body
2. **Generates TAP components**:
   - `created`: Current timestamp
   - `expires`: Timestamp + 8 minutes (480 seconds)
   - `nonce`: 48-byte random value (base64)
   - `tag`: Auto-detected from path
     - `agent-payer-auth` for checkout/payment paths
     - `agent-browser-auth` for all other paths
3. **Signs the request** using RFC 9421 with your private key
4. **Adds headers**:
   ```
   Signature-Input: sig2=("@authority" "@path");created=1735689600;keyid="<key-id>";alg="Ed25519";expires=1735693200;nonce="<nonce>";tag="agent-browser-auth"
   Signature: sig2=:<base64-signature>:
   ```

## Tag Auto-Detection

The proxy intelligently chooses the TAP tag based on the request path:

- **`agent-payer-auth`**: Paths containing `checkout`, `payment`, `pay`, `purchase`, `order`, `cart`, `wallet`, `receipt`
- **`agent-browser-auth`**: All other paths (browsing, discovery, search)

## Health Check

Verify the proxy is running:

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "keyId": "poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U"
}
```

## Troubleshooting

### Error: "UNAUTHORIZED - Missing or invalid Bearer token"

**Cause**: No OAuth token provided
**Solution**: Add `Authorization: Bearer <token>` header to your requests

### Error: "TAP signature missing required tag"

**Cause**: Polycrawl server rejecting the signature
**Solution**: Check that:
1. Your Key ID matches the registered key
2. Your private key is correct
3. Clock skew < 8 minutes between proxy and server

### Error: "ENOENT: no such file or directory"

**Cause**: Private key file not found
**Solution**: Run `npm run tap:keygen` to generate keys, or fix `TAP_PRIVATE_KEY_PATH`

### Proxy not forwarding requests

**Cause**: Target URL misconfigured
**Solution**: Verify `TAP_TARGET_URL` points to your running Polycrawl server

## Security Best Practices

1. **Never commit** your private key to version control (`.tap-keys/` is in `.gitignore`)
2. **Rotate keys** periodically and re-register with Visa
3. **Use HTTPS** in production for both proxy and target server
4. **Restrict access** to the proxy server (firewall, VPC, etc.)
5. **Monitor signatures** for anomalies (failed verifications, expired timestamps)
6. **Store keys securely** using environment variables or secret management (AWS Secrets Manager, HashiCorp Vault)

## Production Deployment

For production, consider:

1. **Load balancing**: Run multiple proxy instances behind a load balancer
2. **TLS termination**: Use HTTPS with valid certificates
3. **Rate limiting**: Protect against abuse
4. **Monitoring**: Track signature success/failure rates
5. **Key management**: Use cloud secret managers instead of file-based keys

Example production setup:

```bash
# Use environment variable for private key
export TAP_PRIVATE_KEY="$(cat .tap-keys/tap-agent-private.pem)"
export TAP_TARGET_URL=https://api.polycrawl.com
export TAP_PROXY_PORT=443

npm run tap:proxy
```

## MCP Integration

To configure Claude Desktop to use the proxy:

1. Update Claude MCP configuration
2. Set MCP server URL to: `http://localhost:8080/proxy/mcp`
3. Configure OAuth credentials
4. All requests will now be TAP-signed automatically

## FAQ

**Q: Do I need to register with Visa for development?**
A: No, you can test locally without registration. Production merchants may reject unregistered agents.

**Q: Can I use algorithms other than Ed25519?**
A: Yes, TAP supports PS256, RS256, and ES256. Update the `algorithm` parameter in [tap-signer.ts](server/src/tap-proxy/tap-signer.ts:64).

**Q: How long are TAP signatures valid?**
A: Default is 480 seconds (8 minutes). Configurable via `expiresIn` option.

**Q: Can multiple agents share one proxy?**
A: Yes, but they'll all sign with the same Key ID. For multi-agent scenarios, run separate proxy instances with different keys.

**Q: Does the proxy support OAuth validation?**
A: Currently, the proxy passes OAuth tokens through to the target server. The target server validates them. Future versions may add proxy-level OAuth validation.

## Advanced: Custom Tag Rules

To customize tag detection, edit [proxy-server.ts](server/src/tap-proxy/proxy-server.ts:87):

```typescript
function inferTagFromPath(path: string): 'agent-browser-auth' | 'agent-payer-auth' {
  const lowerPath = path.toLowerCase();

  // Add your custom rules
  if (lowerPath.includes('/admin/')) {
    return 'agent-payer-auth'; // Treat admin as sensitive
  }

  // ... existing logic
}
```

## Support

For issues or questions:
- Review [Visa TAP Specifications](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications)
- Check [RFC 9421](https://datatracker.ietf.org/doc/rfc9421/) for HTTP Message Signatures
- Open an issue on GitHub
