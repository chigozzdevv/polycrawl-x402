const getDefaultApiBase = () => {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBase()).replace(/\/$/, '');

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    roles?: string[];
  };
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface WalletChallengeRequest {
  chain: 'solana';
  address: string;
}

export interface WalletChallengeResponse {
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface WalletLoginRequest {
  address: string;
  chain: 'solana';
  signature: string;
  nonce: string;
}

export interface WalletLinkRequest {
  address: string;
  chain: 'solana';
  signature: string;
  nonce: string;
}

export interface Wallet {
  _id: string;
  owner_user_id: string;
  role: 'payer' | 'payout';
  currency: 'USD';
  available: number;
  blocked: number;
  status: 'active' | 'frozen';
  address?: string;
}

export interface Provider {
  _id: string;
  user_id: string;
  created_at?: string;
}

export interface Resource {
  _id: string;
  provider_id: string;
  title: string;
  type: 'site' | 'dataset' | 'file';
  format: string;
  domain?: string;
  tags?: string[];
  summary?: string;
  sample_preview?: string;
  path?: string;
  size_bytes?: number;
  price_per_kb?: number;
  price_flat?: number;
  visibility?: 'public' | 'restricted';
  verified?: boolean;
  avg_latency_ms?: number;
  connector_id?: string;
  modes?: Array<'raw' | 'summary'>;
}

export interface ProviderOverview {
  earnings: {
    total30d: number;
    avgEarning: number;
    totalRequests: number;
  };
  searchStats: {
    totalImpressions: number;
    totalSelected: number;
    selectionRate: number;
  };
  resources: Array<{
    id: string;
    title: string;
    type: string;
    verified?: boolean;
  }>;
}

export interface ConsumerActivityItem {
  id: string
  resource_id?: string
  resource_title?: string
  resource_domain?: string
  mode?: string
  cost: number
  status?: string
  ts?: string
}

export interface TopAgentStat {
  agent_id?: string
  agent_name: string
  count: number
}

export interface TopSourceStat {
  resource_id?: string
  resource_title?: string
  resource_domain?: string
  count: number
  spent: number
}

export interface EarningsData {
  daily: Array<{ date: string; amount: number; count: number }>;
  monthly: Array<{ month: string; amount: number; count: number }>;
  total: number;
  period_total: number;
}

export interface SearchStats {
  totalImpressions: number;
  totalSelected: number;
  selectionRate: number;
}

export interface Receipt {
  _id: string;
  request_id: string;
  json: {
    paid_total?: number;
    resource?: { title?: string };
    mode?: string;
    bytes_billed?: number;
    x402_tx?: string;
    provider_onchain_tx?: string;
    tap_digest?: string;
    [key: string]: any;
  };
  ed25519_sig: string;
  ts: string;
}

export interface SpendingCaps {
  _id: string;
  global_weekly_cap?: number;
  per_site_daily_cap?: number;
  per_mode_caps?: {
    raw?: number;
    summary?: number;
  };
  updated_at: string;
}

export interface CatalogResource {
  _id: string;
  provider_id: string;
  title: string;
  type: string;
  format: string;
  domain?: string;
  summary?: string;
  tags?: string[];
  sample_preview?: string;
  price_per_kb?: number;
  price_flat?: number;
  verified?: boolean;
  updated_at?: string;
  size_bytes?: number;
}

export interface Connector {
  id: string;
  type: 'api_key' | 'jwt' | 'oauth' | 'internal';
  status?: 'active' | 'disabled';
}

export interface ResourcePerformance {
  resource_id: string;
  title: string;
  type?: string;
  verified: boolean;
  requests: number;
  earned: number;
  avg_earning: number;
  impressions: number;
  selections: number;
  selection_rate: number;
}

export interface ProviderRequest {
  _id: string;
  resource_id: string;
  user_id: string;
  agent_id?: string;
  mode?: string;
  cost?: number;
  status: string;
  ts: string;
}

export interface Withdrawal {
  _id: string;
  wallet_role: 'payer' | 'payout';
  user_id: string;
  amount: number;
  to: string;
  state: 'pending' | 'sent' | 'failed';
  tx_hash?: string;
  created_at: string;
}

export interface Deposit {
  _id: string;
  wallet_role: 'payer' | 'payout';
  user_id: string;
  amount: number;
  state: 'pending' | 'confirmed' | 'failed';
  instructions?: any;
  tx_hash?: string;
  created_at: string;
}

export type ConnectorPayload =
  | { type: 'api_key'; config: { header?: string; scheme?: string; token: string } }
  | { type: 'jwt'; config: { header?: string; token: string } }
  | { type: 'oauth'; config: { access_token: string } }
  | { type: 'internal'; config: Record<string, never> };

export interface SiteVerificationInitResponse {
  method: 'dns' | 'file';
  token: string;
  instructions?: string;
  verified?: boolean;
}

export interface SiteVerificationCheckResponse {
  verified: boolean;
  error?: string;
}

export interface Domain {
  _id: string;
  provider_id: string;
  domain: string;
  method: 'dns' | 'file';
  token: string;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
  verified_at?: string;
  last_checked_at?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const hasBody = options.body !== undefined && options.body !== null;
    const isFormDataBody = hasBody && typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (hasBody && !isFormDataBody && !('Content-Type' in headers)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
    } catch (err: any) {
      throw new Error(err?.message || 'Unable to reach API server');
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        const text = await response.text().catch(() => '');
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? (JSON.parse(text) as T) : (undefined as T);
    }

    return (await response.text()) as T;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWalletChallenge(data: WalletChallengeRequest): Promise<WalletChallengeResponse> {
    return this.request<WalletChallengeResponse>('/auth/wallet/challenge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async walletLogin(data: WalletLoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/wallet/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async linkWallet(data: WalletLinkRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/wallet/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.request('/auth/forgot_password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.request('/auth/reset_password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/auth/change_password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getWallets(): Promise<Wallet[]> {
    const res = await this.request<{ payer: Wallet; payout: Wallet }>('/wallets');
    return [res.payer, res.payout].filter(Boolean);
  }

  async getProvider(): Promise<Provider> {
    const res = await this.request<{ provider: Provider }>('/providers/me');
    return res.provider;
  }

  async createProvider(): Promise<Provider> {
    const res = await this.request<{ provider: Provider }>('/providers', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return res.provider;
  }

  async createDeposit(role: 'payer' | 'payout', amount: number): Promise<{ id: string; instructions?: any }> {
    return this.request<{ id: string; instructions?: any }>('/wallets/deposits', {
      method: 'POST',
      body: JSON.stringify({ role, amount }),
    });
  }

  async createWithdrawal(role: 'payer' | 'payout', amount: number, to: string): Promise<{ id: string; tx_hash?: string }> {
    return this.request<{ id: string; tx_hash?: string }>('/wallets/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ role, amount, to }),
    });
  }

  async getProviderOverview(): Promise<ProviderOverview> {
    return this.request<ProviderOverview>('/providers/overview');
  }

  async getProviderResources(limit = 50): Promise<Resource[]> {
    const res = await this.request<{ items: Resource[] }>(`/resources?limit=${limit}`);
    return res.items;
  }

  async getProviderEarnings(days: number = 30): Promise<EarningsData> {
    return this.request<EarningsData>(`/analytics/provider/earnings?days=${days}`);
  }

  async getSearchStats(days = 30): Promise<SearchStats> {
    return this.request<SearchStats>(`/analytics/provider/search?days=${days}`);
  }

  async getReceipts(limit = 20): Promise<Receipt[]> {
    const res = await this.request<{ items: Receipt[] }>(`/receipts?limit=${limit}`);
    return res.items;
  }

  async getSpendingCaps(): Promise<SpendingCaps> {
    return this.request<SpendingCaps>('/caps');
  }

  async updateSpendingCaps(caps: Partial<SpendingCaps>): Promise<SpendingCaps> {
    return this.request<SpendingCaps>('/caps', {
      method: 'PUT',
      body: JSON.stringify(caps),
    });
  }

  async getCatalogResources(limit = 24): Promise<CatalogResource[]> {
    const res = await this.request<{ items: CatalogResource[] }>(`/catalog/resources?limit=${limit}`);
    return res.items;
  }

  async createResource(data: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConsumerActivity(limit = 5): Promise<ConsumerActivityItem[]> {
    const res = await this.request<{ items: ConsumerActivityItem[] }>(`/analytics/consumer/activity?limit=${limit}`);
    return res.items;
  }

  async getConsumerTopAgents(limit = 5): Promise<TopAgentStat[]> {
    const res = await this.request<{ items: TopAgentStat[] }>(`/analytics/consumer/top-agents?limit=${limit}`);
    return res.items;
  }

  async getConsumerTopSources(limit = 5): Promise<TopSourceStat[]> {
    const res = await this.request<{ items: TopSourceStat[] }>(`/analytics/consumer/top-sources?limit=${limit}`);
    return res.items;
  }

  async getConnectors(): Promise<Connector[]> {
    const res = await this.request<{ items: Connector[] }>('/connectors');
    return res.items;
  }

  async createConnector(payload: ConnectorPayload): Promise<{ id: string }> {
    return this.request<{ id: string }>('/connectors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteConnector(id: string): Promise<void> {
    await this.request(`/connectors/${id}`, { method: 'DELETE' });
  }

  async updateConnector(id: string, payload: Partial<ConnectorPayload> & { status?: 'active' | 'disabled' }): Promise<void> {
    await this.request(`/connectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async initSiteVerification(domain: string, method: 'dns' | 'file'): Promise<SiteVerificationInitResponse> {
    return this.request<SiteVerificationInitResponse>('/sites/verify', {
      method: 'POST',
      body: JSON.stringify({ domain, method }),
    });
  }

  async checkSiteVerification(domain: string, method: 'dns' | 'file', token: string): Promise<SiteVerificationCheckResponse> {
    return this.request<SiteVerificationCheckResponse>('/sites/verify-check', {
      method: 'POST',
      body: JSON.stringify({ domain, method, token }),
    });
  }

  async getResourcePerformance(limit = 10): Promise<ResourcePerformance[]> {
    const res = await this.request<{ items: ResourcePerformance[] }>(`/analytics/provider/resources/performance?limit=${limit}`);
    return res.items;
  }

  async getProviderRequests(limit = 100, status?: string): Promise<ProviderRequest[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (status) params.append('status', status);
    const res = await this.request<{ requests: ProviderRequest[] }>(`/providers/requests?${params.toString()}`);
    return res.requests;
  }

  async updateResource(id: string, data: Partial<Resource>): Promise<Resource> {
    return this.request<Resource>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteResource(id: string): Promise<void> {
    await this.request(`/resources/${id}`, { method: 'DELETE' });
  }

  async getWithdrawals(limit = 50): Promise<Withdrawal[]> {
    const res = await this.request<{ withdrawals: Withdrawal[] }>(`/wallets/withdrawals?limit=${limit}`);
    return res.withdrawals;
  }

  async getDeposits(limit = 50): Promise<Deposit[]> {
    const res = await this.request<{ deposits: Deposit[] }>(`/wallets/deposits?limit=${limit}`);
    return res.deposits;
  }

  async getCloudinarySignature(publicId: string): Promise<{ timestamp: number; signature: string; cloud_name: string; api_key: string }> {
    return this.request('/datasets/upload-signature', {
      method: 'POST',
      body: JSON.stringify({ public_id: publicId }),
    });
  }

  async uploadFileToCloudinary(file: File): Promise<string> {
    const publicId = `polycrawl/${Date.now()}_${file.name}`;
    const sig = await this.getCloudinarySignature(publicId);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('public_id', publicId);
    formData.append('timestamp', sig.timestamp.toString());
    formData.append('signature', sig.signature);
    formData.append('api_key', sig.api_key);
    formData.append('resource_type', 'raw');
    formData.append('type', 'upload');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/raw/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    return data.public_id;
  }

  async getDomains(): Promise<Domain[]> {
    const res = await this.request<{ domains: Domain[] }>('/domains');
    return res.domains;
  }

  async deleteDomain(domain: string): Promise<{ ok: boolean }> {
    return this.request(`/domains/${encodeURIComponent(domain)}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
