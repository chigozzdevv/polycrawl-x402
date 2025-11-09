import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/services/api';
import type { Resource, Connector, SiteVerificationInitResponse } from '@/services/api';
import { Plus, FileText, CheckCircle, Edit, Trash2, Shield, Loader2, Globe, Link2 } from 'lucide-react';

type ResourceFormState = {
  title: string;
  type: 'site' | 'dataset' | 'file';
  format: string;
  domain: string;
  path: string;
  summary: string;
  samplePreview: string;
  tags: string;
  priceFlat: string;
  pricePerKb: string;
  visibility: 'public' | 'restricted';
  modes: { raw: boolean; summary: boolean };
  connectorId: string;
};

const defaultResourceForm: ResourceFormState = {
  title: '',
  type: 'site',
  format: 'html',
  domain: '',
  path: '/',
  summary: '',
  samplePreview: '',
  tags: '',
  priceFlat: '',
  pricePerKb: '',
  visibility: 'public',
  modes: { raw: true, summary: false },
  connectorId: '',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(defaultResourceForm);
  const [verifyDomain, setVerifyDomain] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'dns' | 'file'>('dns');
  const [verifyInit, setVerifyInit] = useState<SiteVerificationInitResponse | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    setIsLoading(true);
    try {
      const [resList, connectorList] = await Promise.all([api.getProviderResources(100), api.getConnectors()]);
      setResources(resList);
      setConnectors(connectorList);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload: Partial<Resource> = {
        title: resourceForm.title,
        type: resourceForm.type,
        format: resourceForm.format,
        domain: resourceForm.domain || undefined,
        path: resourceForm.path || undefined,
        summary: resourceForm.summary || undefined,
        sample_preview: resourceForm.samplePreview || undefined,
        tags: resourceForm.tags
          ? resourceForm.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
        price_flat: resourceForm.priceFlat ? Number(resourceForm.priceFlat) : undefined,
        price_per_kb: resourceForm.pricePerKb ? Number(resourceForm.pricePerKb) : undefined,
        visibility: resourceForm.visibility,
        modes: Object.entries(resourceForm.modes)
          .filter(([, enabled]) => enabled)
          .map(([mode]) => mode as 'raw' | 'summary'),
        connector_id: resourceForm.connectorId || undefined,
      };
      await api.createResource(payload);
      setResourceModalOpen(false);
      setResourceForm(defaultResourceForm);
      await loadPage();
    } catch (err: any) {
      setError(err.message || 'Unable to create resource');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleVerifyInit = async () => {
    setVerificationLoading(true);
    setVerificationStatus('');
    try {
      const out = await api.initSiteVerification(verifyDomain, verifyMethod);
      setVerifyInit(out);
      setVerificationStatus(out.verified ? 'Already verified' : 'Pending verification');
    } catch (err: any) {
      setVerificationStatus(err.message || 'Verification init failed');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCheck = async () => {
    if (!verifyInit) return;
    setVerificationLoading(true);
    try {
      const out = await api.checkSiteVerification(verifyDomain, verifyMethod, verifyInit.token);
      setVerificationStatus(out.verified ? 'Domain verified 🎉' : out.error || 'Validation failed');
      if (out.verified) {
        await loadPage();
      }
    } catch (err: any) {
      setVerificationStatus(err.message || 'Verification check failed');
    } finally {
      setVerificationLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-fog">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading resources…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-fog">Connect origins, verify domains, and publish listings.</p>
        </div>
        <Button onClick={() => setResourceModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Resource
        </Button>
      </div>

      {error && <div className="rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<FileText className="h-5 w-5 text-sand" />}
          label="Total Resources"
          value={resources.length.toString()}
          helper="Active listings"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-sand" />}
          label="Verified"
          value={resources.filter((r) => r.verified).length.toString()}
          helper={`${resources.length > 0 ? Math.round((resources.filter((r) => r.verified).length / resources.length) * 100) : 0}% rate`}
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-fog" />}
          label="Avg Price"
          value={
            resources.length > 0
              ? formatCurrency(
                  resources.reduce((sum, r) => sum + (r.price_flat || r.price_per_kb || 0), 0) / resources.length
                )
              : '$0.00'
          }
          helper="Per listing"
        />
      </div>

      <Card>
        <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/10">
                <Shield className="h-5 w-5 text-ember" />
              </div>
              <div>
                <h3 className="text-parchment font-medium">Verify your domain</h3>
                <p className="text-sm text-fog">Prove you own the surface you’re selling</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-fog">Domain</label>
                <input
                  value={verifyDomain}
                  onChange={(e) => setVerifyDomain(e.target.value)}
                  placeholder="example.com"
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['dns', 'file'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setVerifyMethod(method)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm capitalize ${
                      verifyMethod === method ? 'bg-sand text-ink' : 'bg-white/5 text-fog hover:text-parchment'
                    }`}
                  >
                    {method === 'dns' ? <Globe className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    {method} method
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleVerifyInit}
                  disabled={!verifyDomain || verificationLoading}
                  className="gap-2"
                >
                  {verificationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Generate instructions
                </Button>
                {verifyInit && (
                  <Button
                    variant="outline"
                    onClick={handleVerifyCheck}
                    disabled={verificationLoading}
                  >
                    Check status
                  </Button>
                )}
              </div>
              {verifyInit && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-fog">
                  <p className="font-medium text-parchment">Verification token</p>
                  <p className="break-all text-xs text-sand">{verifyInit.token}</p>
                  {verifyInit.instructions && <p className="mt-2 text-xs">{verifyInit.instructions}</p>}
                </div>
              )}
              {verificationStatus && (
                <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-parchment">
                  {verificationStatus}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            {resources.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-fog" />
                <p className="text-fog">No resources yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resources.map((resource) => {
                  const preview = resource.sample_preview || resource.summary;
                  const isExpanded = expandedResourceId === resource._id;
                  return (
                    <div
                      key={resource._id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-parchment font-semibold">{resource.title}</h3>
                          {resource.verified && <CheckCircle className="h-4 w-4 text-sand" />}
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              resource.visibility === 'restricted' ? 'bg-ember/10 text-ember' : 'bg-sand/10 text-sand'
                            }`}
                          >
                            {resource.visibility || 'public'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => {
                              // TODO: Implement edit modal
                              setError('Edit functionality coming soon');
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-3 text-ember hover:text-ember"
                            onClick={async () => {
                              if (!window.confirm(`Delete "${resource.title}"? This action cannot be undone.`)) return;
                              try {
                                await api.deleteResource(resource._id);
                                await loadPage();
                              } catch (err: any) {
                                setError(err.message || 'Failed to delete resource');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fog">
                        <span className="rounded bg-white/5 px-2 py-1">{resource.type}</span>
                        <span className="rounded bg-white/5 px-2 py-1 uppercase">{resource.format}</span>
                        {resource.domain && <span>{resource.domain}</span>}
                        {typeof resource.price_flat === 'number' && (
                          <span className="text-sand">{formatCurrency(resource.price_flat)}</span>
                        )}
                        {typeof resource.price_per_kb === 'number' && (
                          <span className="text-sand">{formatCurrency(resource.price_per_kb)}/KB</span>
                        )}
                      </div>
                      {preview && (
                        <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-3 text-xs text-fog">
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/40">
                            <span>Preview</span>
                            <button
                              className="text-[11px] text-sand hover:text-sand/80"
                              onClick={() =>
                                setExpandedResourceId(isExpanded ? null : resource._id)
                              }
                            >
                              {isExpanded ? 'Hide' : 'Expand'}
                            </button>
                          </div>
                          <p className={`mt-2 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'}`}>{preview}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Modal open={resourceModalOpen} title="Create resource" onClose={() => setResourceModalOpen(false)}>
        <form onSubmit={handleResourceSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input
                required
                value={resourceForm.title}
                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              />
            </Field>
            <Field label="Type">
              <select
                value={resourceForm.type}
                onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as ResourceFormState['type'] })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              >
                <option value="site">Site</option>
                <option value="dataset">Dataset</option>
                <option value="file">File</option>
              </select>
            </Field>
            <Field label="Format">
              <input
                value={resourceForm.format}
                onChange={(e) => setResourceForm({ ...resourceForm, format: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              />
            </Field>
            <Field label="Visibility">
              <select
                value={resourceForm.visibility}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, visibility: e.target.value as ResourceFormState['visibility'] })
                }
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
              </select>
            </Field>
          </div>
          {resourceForm.type === 'site' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Domain">
                <input
                  value={resourceForm.domain}
                  onChange={(e) => setResourceForm({ ...resourceForm, domain: e.target.value })}
                  placeholder="example.com"
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
              <Field label="Path">
                <input
                  value={resourceForm.path}
                  onChange={(e) => setResourceForm({ ...resourceForm, path: e.target.value })}
                  placeholder="/docs"
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
            </div>
          )}
          <Field label="Summary">
            <textarea
              value={resourceForm.summary}
              onChange={(e) => setResourceForm({ ...resourceForm, summary: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
            />
          </Field>
          <Field label="Sample preview">
            <textarea
              value={resourceForm.samplePreview}
              onChange={(e) => setResourceForm({ ...resourceForm, samplePreview: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
            />
          </Field>
          <Field label="Tags (comma separated)">
            <input
              value={resourceForm.tags}
              onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Flat price (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={resourceForm.priceFlat}
                onChange={(e) => setResourceForm({ ...resourceForm, priceFlat: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              />
            </Field>
            <Field label="Price per KB (USD)">
              <input
                type="number"
                min="0"
                step="0.0001"
                value={resourceForm.pricePerKb}
                onChange={(e) => setResourceForm({ ...resourceForm, pricePerKb: e.target.value })}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Modes">
            <div className="flex gap-3">
              {(['raw', 'summary'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm text-fog">
                  <input
                    type="checkbox"
                    checked={resourceForm.modes[mode]}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, modes: { ...resourceForm.modes, [mode]: e.target.checked } })
                    }
                  />
                  {mode}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Connector">
            <select
              value={resourceForm.connectorId}
              onChange={(e) => setResourceForm({ ...resourceForm, connectorId: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-parchment focus:border-sand/40 focus:outline-none"
            >
              <option value="">Select connector</option>
              {connectors.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.type}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setResourceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm text-fog">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-fog">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold text-parchment">{value}</div>
        <div className="text-xs text-fog mt-1">{helper}</div>
      </CardContent>
    </Card>
  );
}
