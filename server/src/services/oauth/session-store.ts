import { AsyncLocalStorage } from 'node:async_hooks';

export type OAuthSessionContext = {
  userId: string;
  clientId: string;
  scopes: string[];
  resource: string;
  agentId?: string;
};

const sessionMap = new Map<string, OAuthSessionContext>();
const requestStore = new AsyncLocalStorage<OAuthSessionContext>();

export function setSessionContext(sessionId: string, context: OAuthSessionContext) {
  sessionMap.set(sessionId, context);
}

export function clearSessionContext(sessionId: string) {
  sessionMap.delete(sessionId);
}

export function getSessionContext(sessionId?: string): OAuthSessionContext | undefined {
  if (sessionId && sessionMap.has(sessionId)) return sessionMap.get(sessionId);
  return requestStore.getStore();
}

export function runWithRequestContext<T>(context: OAuthSessionContext, fn: () => Promise<T> | T) {
  return requestStore.run(context, fn);
}
