import { startProxyServer } from './proxy-server.js';
import path from 'node:path';

function loadConfig() {
  const privateKeyPath = process.env.TAP_PRIVATE_KEY_PATH || path.join(process.cwd(), '.tap-keys', 'tap-agent-private.pem');
  const keyId = process.env.TAP_KEY_ID;
  const targetUrl = process.env.TAP_TARGET_URL || 'http://localhost:3000';
  const port = parseInt(process.env.TAP_PROXY_PORT || '8080', 10);
  const oauthClientId = process.env.TAP_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.TAP_OAUTH_CLIENT_SECRET;

  return {
    privateKeyPath,
    keyId,
    targetUrl,
    port,
    oauthClientId,
    oauthClientSecret,
  };
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const config = loadConfig();

  console.log('Starting TAP Agent Proxy with config:');
  console.log('- Private Key:', config.privateKeyPath);
  console.log('- Key ID:', config.keyId || 'auto-generated');
  console.log('- Target URL:', config.targetUrl);
  console.log('- Proxy Port:', config.port);

  startProxyServer(config).catch((err) => {
    console.error('Failed to start proxy:', err);
    process.exit(1);
  });
}

export { startProxyServer, loadConfig };
