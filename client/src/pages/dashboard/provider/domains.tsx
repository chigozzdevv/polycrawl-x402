import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { Domain, SiteVerificationInitResponse } from '@/services/api';
import { Globe, Link2, Shield, CheckCircle, Clock, Loader2, Trash2, Plus, RefreshCw } from 'lucide-react';

const iconButtonBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60';

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim().length > 0) return err;
  return fallback;
};

const sanitizeDomain = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const withoutPathOrQuery = withoutProtocol.split(/[/?#]/)[0];
  const withoutPort = withoutPathOrQuery.split(':')[0];
  return withoutPort.replace(/\.$/, '');
};

export function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyDomain, setVerifyDomain] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'dns' | 'file'>('dns');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verifyInit, setVerifyInit] = useState<SiteVerificationInitResponse | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingDomainId, setCheckingDomainId] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadDomains = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    try {
      const data = await api.getDomains();
      setDomains(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load domains'));
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyInit = async () => {
    const normalizedDomain = sanitizeDomain(verifyDomain);
    if (!normalizedDomain) {
      setError('Please enter a valid domain (e.g. example.com)');
      return;
    }
    setVerificationLoading(true);
    setVerifyInit(null);
    try {
      setVerifyDomain(normalizedDomain);
      const result = await api.initSiteVerification(normalizedDomain, verifyMethod);
      setVerifyInit(result);
      if (result.verified) {
        await loadDomains();
        setVerifyDomain('');
      }
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to initialize verification'));
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCheck = async () => {
    if (!verifyInit) return;
    const normalizedDomain = sanitizeDomain(verifyDomain);
    if (!normalizedDomain) {
      setError('Please enter a valid domain before verifying');
      return;
    }
    setVerificationLoading(true);
    try {
      const result = await api.checkSiteVerification(normalizedDomain, verifyMethod, verifyInit.token);
      if (result.verified) {
        setVerifyInit(null);
        setVerifyDomain('');
        await loadDomains();
        setError('');
      } else {
        setError(result.error || 'Verification failed. Check your DNS/file setup.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Verification check failed'));
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDelete = async (domain: string) => {
    if (!confirm(`Delete domain ${domain}?`)) return;
    try {
      await api.deleteDomain(domain);
      await loadDomains();
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete domain'));
    }
  };

  const handleRefreshDomains = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    let hadFailure = false;
    try {
      const pendingList = domains.filter((d) => d.status === 'pending');
      for (const domain of pendingList) {
        try {
          const result = await api.checkSiteVerification(domain.domain, domain.method, domain.token);
          if (!result.verified) {
            hadFailure = true;
            setError(`${domain.domain}: ${result.error || 'Verification failed. Check your DNS/file setup.'}`);
          }
        } catch (err) {
          hadFailure = true;
          setError(`${domain.domain}: ${getErrorMessage(err, 'Verification check failed')}`);
        }
      }
      await loadDomains({ silent: true });
      if (!hadFailure) {
        setError('');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to refresh domains'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetryPendingDomain = async (domain: Domain) => {
    if (checkingDomainId === domain._id) return;
    setCheckingDomainId(domain._id);
    try {
      const result = await api.checkSiteVerification(domain.domain, domain.method, domain.token);
      if (result.verified) {
        await loadDomains({ silent: true });
        setError('');
      } else {
        setError(`${domain.domain}: ${result.error || 'Verification failed. Check your DNS/file setup.'}`);
      }
    } catch (err) {
      setError(`${domain.domain}: ${getErrorMessage(err, 'Verification check failed')}`);
    } finally {
      setCheckingDomainId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-fog">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading domains…
      </div>
    );
  }

  const verifiedDomains = domains.filter((d) => d.status === 'verified');
  const pendingDomains = domains.filter((d) => d.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-parchment">Domains</h2>
          <p className="text-sm text-fog">Verify domain ownership to publish site resources</p>
        </div>
        {!addingDomain && (
          <Button onClick={() => setAddingDomain(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Domain
          </Button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember"
        >
          {error}
        </motion.div>
      )}

      {addingDomain && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand/10">
                    <Shield className="h-5 w-5 text-sand" />
                  </div>
                  <div>
                    <h3 className="font-medium text-parchment">Add New Domain</h3>
                    <p className="text-sm text-fog">Verify ownership via DNS or file upload</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAddingDomain(false);
                    setVerifyDomain('');
                    setVerifyInit(null);
                    setError('');
                  }}
                  className="text-fog hover:text-parchment"
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-fog">Domain Name</label>
                  <input
                    value={verifyDomain}
                    onChange={(e) => setVerifyDomain(e.target.value)}
                    onBlur={() => setVerifyDomain((value) => sanitizeDomain(value))}
                    placeholder="example.com"
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-fog">Verification Method</label>
                  <div className="flex gap-2">
                    {(['dns', 'file'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setVerifyMethod(method)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm capitalize transition-colors ${
                          verifyMethod === method
                            ? 'border-2 border-sand bg-sand/10 text-parchment'
                            : 'border-2 border-white/10 bg-white/5 text-fog hover:border-white/20 hover:text-parchment'
                        }`}
                      >
                        {method === 'dns' ? <Globe className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                        {method}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-fog">
                    {verifyMethod === 'dns'
                      ? 'Add a TXT record to your DNS settings'
                      : 'Upload a verification file to your website'}
                  </p>
                </div>

                {!verifyInit ? (
                  <Button onClick={handleVerifyInit} disabled={!verifyDomain || verificationLoading} className="w-full gap-2">
                    {verificationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    Generate Verification Instructions
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-sand/30 bg-sand/5 p-4">
                      <p className="mb-2 text-sm font-medium text-parchment">
                        {verifyMethod === 'dns' ? 'Add this TXT record:' : 'Create this file:'}
                      </p>
                      <code className="block rounded bg-black/40 px-3 py-2 text-xs text-sand break-all">
                        {verifyInit.instructions}
                      </code>
                    </div>
                    <Button
                      onClick={handleVerifyCheck}
                      disabled={verificationLoading}
                      variant="outline"
                      className="w-full gap-2 border-sand/40 text-sand hover:bg-sand/10"
                    >
                      {verificationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Verify Domain
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {verifiedDomains.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-fog">Verified Domains</h3>
            <div className="space-y-2">
              {verifiedDomains.map((domain) => (
                <motion.div
                  key={domain._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-parchment">{domain.domain}</p>
                      <p className="text-xs text-fog">
                        Verified {domain.verified_at && new Date(domain.verified_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(domain.domain)}
                    aria-label={`Delete ${domain.domain}`}
                    className={`${iconButtonBase} border-ember/40 text-ember hover:border-ember/60 hover:bg-ember/10`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingDomains.length > 0 && (
        <Card>
          <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-fog">Pending Verification</h3>
                <button
                  type="button"
                  onClick={handleRefreshDomains}
                  aria-label="Refresh domains"
                  disabled={isRefreshing}
                  className={`${iconButtonBase} border-white/15 text-fog hover:text-parchment hover:border-white/40 hover:bg-white/5`}
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
              </div>
            <div className="space-y-2">
              {pendingDomains.map((domain) => (
                <motion.div
                  key={domain._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-parchment">{domain.domain}</p>
                      <p className="text-xs text-fog capitalize">{domain.method} verification pending</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRetryPendingDomain(domain)}
                      aria-label={`Retry verification for ${domain.domain}`}
                      disabled={checkingDomainId === domain._id}
                      className={`${iconButtonBase} border-sand/40 text-sand hover:border-sand/60 hover:bg-sand/10`}
                    >
                      {checkingDomainId === domain._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(domain.domain)}
                      aria-label={`Delete ${domain.domain}`}
                      className={`${iconButtonBase} border-ember/40 text-ember hover:border-ember/60 hover:bg-ember/10`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 && !addingDomain && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Globe className="mx-auto mb-4 h-12 w-12 text-fog" />
              <p className="mb-2 text-parchment">No domains yet</p>
              <p className="mb-4 text-sm text-fog">Add a domain to start publishing site resources</p>
              <Button onClick={() => setAddingDomain(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
