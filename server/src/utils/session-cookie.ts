const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pc_session';
const COOKIE_MAX_AGE = Number(process.env.SESSION_COOKIE_MAX_AGE || 60 * 60 * 24 * 7);
const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN;
const COOKIE_SECURE = (process.env.SESSION_COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) !== 'false';

function buildCommonCookieParts() {
  const parts = [`Path=/`, `Max-Age=${COOKIE_MAX_AGE}`, 'HttpOnly'];
  if (COOKIE_DOMAIN) {
    parts.unshift(`Domain=${COOKIE_DOMAIN}`);
  }
  if (COOKIE_SECURE) {
    parts.push('Secure', 'SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts;
}

export function buildSessionCookie(value: string) {
  const parts = [`${COOKIE_NAME}=${value}`, ...buildCommonCookieParts()];
  return parts.join('; ');
}

export function buildSessionClearCookie() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly'];
  if (COOKIE_DOMAIN) {
    parts.unshift(`Domain=${COOKIE_DOMAIN}`);
  }
  if (COOKIE_SECURE) {
    parts.push('Secure', 'SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

export function extractSessionToken(cookieHeader?: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const rawCookie of cookies) {
    const [name, ...rest] = rawCookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}
