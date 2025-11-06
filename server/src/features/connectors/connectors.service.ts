import type { ConnectorDoc } from '@/features/connectors/connectors.model.js';
import type { ResourceDoc } from '@/features/resources/resources.model.js';
import { decryptSecret } from '@/services/crypto/keystore.js';

type ApiKeyConfig = { header?: string; scheme?: string; token: string };

export async function fetchViaConnector(resource: ResourceDoc, connector: ConnectorDoc) {
  if (connector.type === 'internal' && resource.storage_ref) {
    return { kind: 'internal' as const };
  }
  if (!resource.domain || !resource.path) throw new Error('RESOURCE_URL_MISSING');
  const url = `https://${resource.domain}${resource.path}`;

  const cfgBuf = decryptSecret(connector.enc_config);
  let cfg: any;
  try {
    cfg = JSON.parse(cfgBuf.toString('utf8'));
  } catch {
    throw new Error('BAD_CONNECTOR_CONFIG');
  }

  const headers: Record<string, string> = {};
  if (connector.type === 'api_key') {
    const { header = 'Authorization', scheme = 'Bearer', token } = cfg as ApiKeyConfig;
    headers[header] = `${scheme} ${token}`;
  } else if (connector.type === 'jwt') {
    const { header = 'Authorization', token } = cfg as any;
    if (!token) throw new Error('JWT_TOKEN_REQUIRED');
    headers[header] = `Bearer ${token}`;
  } else if (connector.type === 'oauth') {
    const { access_token } = cfg as any;
    if (!access_token) throw new Error('OAUTH_TOKEN_REQUIRED');
    headers['Authorization'] = `Bearer ${access_token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CONNECTOR_FETCH_FAILED:${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return { kind: 'external' as const, bytes: buf.byteLength, body: buf };
}
