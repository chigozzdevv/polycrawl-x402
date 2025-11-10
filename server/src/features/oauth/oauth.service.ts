import { randomBytes, createHash, createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadEnv } from '@/config/env.js';
import { SignJWT, jwtVerify, importPKCS8, exportJWK, importJWK } from 'jose';
import {
  findClientById,
  generateAuthorizationCode,
  generateClientId,
  generateRefreshTokenValue,
  hashToken,
  insertAuthorizationCode,
  insertClient,
  insertRefreshToken,
  consumeAuthorizationCode,
  deleteAuthorizationCode,
  findRefreshToken,
  revokeRefreshToken,
  type OAuthClientDoc,
} from '@/features/oauth/oauth.model.js';
import { ensureAgentForClient } from '@/features/agents/agents.service.js';

type CreateClientParams = {
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
};

type RegisterClientResult = {
  client_id: string;
  token_endpoint_auth_method: 'none' | 'client_secret_post';
  client_id_issued_at: number;
  redirect_uris: string[];
  client_name?: string;
  scope?: string;
  client_secret?: string;
  client_secret_expires_at?: number | null;
};

type AuthorizationInput = {
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  resource: string;
  code_challenge_method: 'S256';
  scope: string[];
};

type TokenPayload = {
  sub: string;
  aud: string;
  client_id: string;
  scope: string[];
  resource: string;
  agent_id: string;
};

type AccessTokenResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  scope: string;
  token_type: 'Bearer';
  resource: string;
  agent_id: string;
};

let signingKeyPromise: Promise<any> | null = null;
let verificationKeyPromise: Promise<any> | null = null;
let publicJwkPromise: Promise<Record<string, any>> | null = null;
let kidPromise: Promise<string> | null = null;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function loadConfig() {
  const env = loadEnv();
  const issuer = env.OAUTH_ISSUER || 'https://polycrawl.local';
  const resource = env.OAUTH_RESOURCE || `${issuer}/mcp`;
  const accessTtl = Number(env.OAUTH_ACCESS_TOKEN_TTL || 300);
  const refreshTtl = Number(env.OAUTH_REFRESH_TOKEN_TTL || (60 * 60 * 24 * 30));
  return { issuer, resource, accessTtl, refreshTtl };
}

export function getResourcePathSuffix() {
  const { resource } = loadConfig();
  try {
    const resourceUrl = new URL(resource);
    const trimmed = resourceUrl.pathname.replace(/\/+$/, '');
    if (!trimmed || trimmed === '/') {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
}

export function getProtectedResourceMetadataUrls(baseUrl: string) {
  const suffix = getResourcePathSuffix();
  const base = `${baseUrl}/.well-known/oauth-protected-resource`;
  return suffix ? [base, `${base}${suffix}`] : [base];
}

function getAuthorizationServerUrls(baseUrl: string) {
  return [baseUrl];
}

async function getSigningKey() {
  if (!signingKeyPromise) {
    const { ED25519_PRIVATE_KEY_PATH } = process.env as any;
    const pem = ED25519_PRIVATE_KEY_PATH ? await readFile(ED25519_PRIVATE_KEY_PATH, 'utf8') : undefined;
    if (!pem) throw new Error('ED25519_PRIVATE_KEY_PATH is required for OAuth signing');
    const keyObject = createPrivateKey({ key: pem, format: 'pem' });
    signingKeyPromise = Promise.resolve(keyObject as any);
  }
  return signingKeyPromise;
}

async function getVerificationKey() {
  if (!verificationKeyPromise) {
    const jwk = await getPublicJwk();
    verificationKeyPromise = importJWK(jwk as any, 'EdDSA') as Promise<any>;
  }
  return verificationKeyPromise;
}

async function getPublicJwk() {
  if (!publicJwkPromise) {
    const privateKey = await getSigningKey();
    const jwk = await exportJWK(privateKey);
    delete (jwk as any).d;
    jwk.use = 'sig';
    jwk.alg = 'EdDSA';
    jwk.kty = 'OKP';
    jwk.crv = 'Ed25519';
    jwk.kid = await getKid();
    publicJwkPromise = Promise.resolve(jwk);
  }
  return publicJwkPromise;
}

async function getKid() {
  if (!kidPromise) {
    const jwk = await exportJWK(await getSigningKey());
    const keyMaterial = Buffer.from(jwk.x as string, 'base64url');
    const hash = createHash('sha256').update(keyMaterial).digest('base64url');
    kidPromise = Promise.resolve(hash);
  }
  return kidPromise;
}

export async function getJwksResponse() {
  const jwk = await getPublicJwk();
  return { keys: [jwk] };
}

export async function registerClient(params: CreateClientParams): Promise<RegisterClientResult> {
  const client_id = generateClientId();
  const authMethod: 'none' | 'client_secret_post' =
    params.token_endpoint_auth_method === 'client_secret_post' ? 'client_secret_post' : 'none';
  let clientSecret: string | undefined;
  let clientSecretHash: string | undefined;
  if (authMethod === 'client_secret_post') {
    clientSecret = 'cs_' + randomBytes(32).toString('hex');
    clientSecretHash = hashToken(clientSecret);
  }
  const doc = {
    _id: client_id,
    client_name: params.client_name,
    redirect_uris: params.redirect_uris,
    token_endpoint_auth_method: authMethod,
    client_secret_hash: clientSecretHash,
    scope: params.scope,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await insertClient(doc);
  return {
    client_id,
    client_name: doc.client_name,
    redirect_uris: doc.redirect_uris,
    token_endpoint_auth_method: authMethod,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    scope: doc.scope,
    client_secret: clientSecret,
    client_secret_expires_at: clientSecret ? null : undefined,
  };
}

export async function createAuthorizationCode(input: AuthorizationInput) {
  const code = generateAuthorizationCode();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000);
  await insertAuthorizationCode({
    _id: code,
    client_id: input.client_id,
    user_id: input.user_id,
    redirect_uri: input.redirect_uri,
    code_challenge: input.code_challenge,
    code_challenge_method: input.code_challenge_method,
    resource: input.resource,
    scope: input.scope,
    expires_at,
    created_at: new Date(),
  });
  return code;
}

export async function issueTokensFromCode(code: string, redirectUri: string | undefined, codeVerifier: string, resource?: string) {
  console.log('[TOKEN EXCHANGE] Starting token exchange for code:', code.substring(0, 10) + '...');
  console.log('[TOKEN EXCHANGE] redirect_uri:', redirectUri);
  console.log('[TOKEN EXCHANGE] code_verifier length:', codeVerifier?.length);
  const codeDoc = await consumeAuthorizationCode(code);
  console.log('[TOKEN EXCHANGE] codeDoc found:', !!codeDoc);
  if (!codeDoc) {
    console.error('[TOKEN EXCHANGE] Code not found or already consumed!');
    throw new Error('invalid_grant_code');
  }
  console.log('[TOKEN EXCHANGE] codeDoc.redirect_uri:', codeDoc.redirect_uri);
  console.log('[TOKEN EXCHANGE] codeDoc.code_challenge:', codeDoc.code_challenge);
  if (redirectUri && codeDoc.redirect_uri !== redirectUri) {
    console.error('[TOKEN EXCHANGE] Redirect URI mismatch! Expected:', codeDoc.redirect_uri, 'Got:', redirectUri);
    await deleteAuthorizationCode(code);
    throw new Error('invalid_grant_redirect_uri');
  }
  if (codeDoc.expires_at.getTime() < Date.now()) {
    await deleteAuthorizationCode(code);
    throw new Error('invalid_grant_expired');
  }
  // Always bind the token audience to the authorized resource to satisfy RS validation.
  const tokenResource = codeDoc.resource;
  if (resource) {
    try {
      const provided = new URL(resource);
      const authorized = new URL(codeDoc.resource);
      const same = resource === codeDoc.resource || provided.origin === authorized.origin;
      if (!same) {
        await deleteAuthorizationCode(code);
        throw new Error('invalid_target');
      }
    } catch {
      await deleteAuthorizationCode(code);
      throw new Error('invalid_target');
    }
  }
  const expectedChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  console.log('[PKCE DEBUG] code_verifier length:', codeVerifier.length);
  console.log('[PKCE DEBUG] code_verifier (first 20 chars):', codeVerifier.substring(0, 20));
  console.log('[PKCE DEBUG] stored code_challenge:', codeDoc.code_challenge);
  console.log('[PKCE DEBUG] calculated expectedChallenge:', expectedChallenge);
  console.log('[PKCE DEBUG] Match:', expectedChallenge === codeDoc.code_challenge);
  if (expectedChallenge !== codeDoc.code_challenge) {
    console.error('[PKCE ERROR] PKCE verification failed!');
    await deleteAuthorizationCode(code);
    throw new Error('invalid_grant_pkce');
  }
  console.log('[PKCE DEBUG] PKCE verification succeeded!');
  const clientIdStr = String(codeDoc.client_id);
  const userIdStr = String(codeDoc.user_id);
  const agentId = await ensureAgentForClient(userIdStr, clientIdStr);
  const resourceStr = String(tokenResource);
  const tokens = await createTokenResponse({
    sub: userIdStr,
    client_id: clientIdStr,
    scope: codeDoc.scope,
    resource: resourceStr,
    aud: resourceStr,
    agent_id: agentId,
  } as TokenPayload);
  return tokens;
}

async function createTokenResponse(payload: TokenPayload, previousRefreshId?: string): Promise<AccessTokenResult> {
  const { issuer, accessTtl, refreshTtl } = loadConfig();
  const key = await getSigningKey();
  const exp = nowSeconds() + accessTtl;
  const jti = randomBytes(16).toString('base64url');
  const accessToken = await new SignJWT({
    sub: payload.sub,
    aud: payload.aud,
    client_id: payload.client_id,
    scope: payload.scope,
    resource: payload.resource,
    agent_id: payload.agent_id,
    jti,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: await getKid() })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

  const refreshValue = generateRefreshTokenValue();
  const refreshTokenDoc = {
    _id: 'rt_' + randomBytes(24).toString('hex'),
    client_id: payload.client_id,
    user_id: payload.sub,
    hashed_token: hashToken(refreshValue),
    scope: payload.scope,
    resource: payload.resource,
    created_at: new Date(),
    expires_at: new Date(Date.now() + refreshTtl * 1000),
    agent_id: payload.agent_id,
  };
  await insertRefreshToken(refreshTokenDoc);
  if (previousRefreshId) {
    await revokeRefreshToken(previousRefreshId);
  }

  return {
    access_token: accessToken,
    expires_in: accessTtl,
    refresh_token: refreshValue,
    refresh_token_expires_in: refreshTtl,
    scope: payload.scope.join(' '),
    token_type: 'Bearer',
    resource: payload.resource,
    agent_id: payload.agent_id,
  };
}

export async function issueTokensFromRefreshToken(refreshToken: string, clientId: string, resource: string) {
  const hashed = hashToken(refreshToken);
  const doc = await findRefreshToken(hashed);
  if (!doc) throw new Error('invalid_grant');
  const storedClientId = String(doc.client_id);
  if (storedClientId !== clientId) throw new Error('invalid_client');
  if (doc.expires_at.getTime() < Date.now()) throw new Error('invalid_grant');
  if (doc.resource !== resource) throw new Error('invalid_target');

  const userIdStr = String(doc.user_id);
  const agentId = await ensureAgentForClient(userIdStr, storedClientId);
  const resourceStr = String(doc.resource);
  const tokens = await createTokenResponse({
    sub: userIdStr,
    client_id: storedClientId,
    scope: doc.scope,
    resource: resourceStr,
    aud: resourceStr,
    agent_id: agentId,
  } as TokenPayload, String(doc._id));
  return tokens;
}

export async function verifyAccessToken(token: string) {
  const { issuer, resource } = loadConfig();
  const key = await getVerificationKey();
  const { payload } = await jwtVerify(token, key, { issuer });
  if (typeof payload.aud !== 'string' || payload.aud !== resource) {
    throw new Error('invalid_token');
  }
  if (!payload.client_id || typeof payload.client_id !== 'string') {
    throw new Error('invalid_token');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('invalid_token');
  }
  const rawScope = payload.scope;
  const scopes = Array.isArray(rawScope)
    ? (rawScope as string[])
    : typeof rawScope === 'string'
      ? rawScope.split(' ').filter(Boolean)
      : [];
  if (scopes.length === 0) {
    throw new Error('invalid_token');
  }
  const agentId = typeof payload.agent_id === 'string' ? payload.agent_id : undefined;
  return {
    userId: payload.sub,
    clientId: payload.client_id,
    scopes,
    resource: payload.aud,
    agentId,
  };
}

export async function ensureClientExists(clientId: string) {
  const client = await findClientById(clientId);
  if (!client) throw new Error('invalid_client');
  return client;
}

export function buildProtectedResourceMetadata(baseUrl: string) {
  const { resource } = loadConfig();
  return {
    resource,
    authorization_servers: getAuthorizationServerUrls(baseUrl),
  };
}

export function buildAuthorizationServerMetadata(baseUrl: string) {
  const { issuer } = loadConfig();
  return {
    issuer,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    jwks_uri: `${baseUrl}/.well-known/oauth-jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['mcp'],
    claims_supported: ['sub', 'aud', 'iss', 'exp', 'scope', 'client_id', 'jti', 'agent_id'],
  };
}

export function assertClientSecret(client: OAuthClientDoc, providedSecret?: string) {
  if (client.token_endpoint_auth_method === 'client_secret_post') {
    if (!providedSecret) {
      throw new Error('invalid_client');
    }
    if (!client.client_secret_hash) {
      throw new Error('invalid_client');
    }
    const providedHash = hashToken(providedSecret);
    if (providedHash !== client.client_secret_hash) {
      throw new Error('invalid_client');
    }
  }
}
