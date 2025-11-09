import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { api } from '@/services/api'
import type { Connector } from '@/services/api'
import { PlugZap, ShieldCheck, Loader2, Trash2, KeyRound, LockKeyhole } from 'lucide-react'

type ConnectorFormState =
  | { type: 'api_key'; header: string; scheme: string; token: string }
  | { type: 'jwt'; header: string; token: string }
  | { type: 'oauth'; access_token: string }
  | { type: 'internal' }

const defaultConnectorForm: ConnectorFormState = { type: 'api_key', header: 'Authorization', scheme: 'Bearer', token: '' }

export function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formState, setFormState] = useState<ConnectorFormState>(defaultConnectorForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    setIsLoading(true)
    try {
      const list = await api.getConnectors()
      setConnectors(list)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Unable to load connectors')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (formState.type === 'api_key') {
        await api.createConnector({ type: 'api_key', config: { header: formState.header, scheme: formState.scheme, token: formState.token } })
      } else if (formState.type === 'jwt') {
        await api.createConnector({ type: 'jwt', config: { header: formState.header, token: formState.token } })
      } else if (formState.type === 'oauth') {
        await api.createConnector({ type: 'oauth', config: { access_token: formState.access_token } })
      } else {
        await api.createConnector({ type: 'internal', config: {} })
      }
      setModalOpen(false)
      setFormState(defaultConnectorForm)
      await loadConnectors()
    } catch (err: any) {
      setError(err.message || 'Unable to create connector')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteConnector(id)
      await loadConnectors()
    } catch (err: any) {
      setError(err.message || 'Unable to remove connector')
    }
  }

  const toggleConnectorStatus = async (connector: Connector) => {
    try {
      await api.updateConnector(connector.id, { status: connector.status === 'disabled' ? 'active' : 'disabled' })
      await loadConnectors()
    } catch (err: any) {
      setError(err.message || 'Unable to update connector')
    }
  }

  const total = connectors.length
  const active = connectors.filter((c) => c.status !== 'disabled').length
  const coverage = new Set(connectors.map((c) => c.type)).size

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-fog">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading connectors…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-fog">Store API keys, OAuth tokens, or internal credentials.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <PlugZap className="h-4 w-4" />
            New Connector
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total connectors" value={total.toString()} helper="Across all types" />
        <StatCard label="Active" value={active.toString()} helper="Ready for crawls" />
        <StatCard label="Coverage" value={`${coverage}`} helper="Unique auth types" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand/10">
              <ShieldCheck className="h-5 w-5 text-sand" />
            </div>
            <div>
              <h3 className="text-parchment font-semibold">Secrets vault</h3>
              <p className="text-sm text-fog">Rotated daily and encrypted at rest.</p>
            </div>
          </div>
          {connectors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-fog">
              No connectors yet. Add one to authenticate private resources.
            </div>
          ) : (
            <div className="space-y-3">
              {connectors.map((connector) => (
                <motion.div
                  key={connector.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-parchment">{connector.type}</p>
                    <p className="text-xs text-fog">{connector.status === 'disabled' ? 'Disabled' : 'Active'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="gap-2 border border-white/10 px-3 py-1 text-xs text-fog hover:text-parchment" onClick={() => toggleConnectorStatus(connector)}>
                      {connector.status === 'disabled' ? <KeyRound className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                      {connector.status === 'disabled' ? 'Activate' : 'Disable'}
                    </Button>
                    <Button variant="ghost" className="text-ember hover:text-ember/80" onClick={() => handleDelete(connector.id)}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} title="Add connector" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['api_key', 'jwt', 'oauth', 'internal'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormState(
                  type === 'api_key'
                    ? { type: 'api_key', header: 'Authorization', scheme: 'Bearer', token: '' }
                    : type === 'jwt'
                      ? { type: 'jwt', header: 'Authorization', token: '' }
                      : type === 'oauth'
                        ? { type: 'oauth', access_token: '' }
                        : { type: 'internal' }
                )}
                className={`rounded-full px-4 py-1 text-sm capitalize ${formState.type === type ? 'bg-sand text-ink' : 'bg-white/5 text-fog'}`}
              >
                {type === 'api_key' ? 'API key' : type}
              </button>
            ))}
          </div>

          {formState.type === 'api_key' && (
            <div className="space-y-3">
              <Field label="Header">
                <input
                  value={formState.header}
                  onChange={(e) => setFormState({ ...formState, header: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
              <Field label="Scheme">
                <input
                  value={formState.scheme}
                  onChange={(e) => setFormState({ ...formState, scheme: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
              <Field label="Token">
                <textarea
                  value={formState.token}
                  onChange={(e) => setFormState({ ...formState, token: e.target.value })}
                  className="h-24 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
            </div>
          )}

          {formState.type === 'jwt' && (
            <div className="space-y-3">
              <Field label="Header">
                <input
                  value={formState.header}
                  onChange={(e) => setFormState({ ...formState, header: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
              <Field label="Token">
                <textarea
                  value={formState.token}
                  onChange={(e) => setFormState({ ...formState, token: e.target.value })}
                  className="h-24 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
            </div>
          )}

          {formState.type === 'oauth' && (
            <div className="space-y-3">
              <Field label="Access token">
                <textarea
                  value={formState.access_token}
                  onChange={(e) => setFormState({ ...formState, access_token: e.target.value })}
                  className="h-24 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-parchment focus:border-sand/40 focus:outline-none"
                />
              </Field>
            </div>
          )}

          {formState.type === 'internal' && (
            <p className="text-sm text-fog">Internal connectors rely on Polycrawl-managed secrets. No additional input needed.</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create connector'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-fog">
      <span>{label}</span>
      {children}
    </label>
  )
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-fog">{label}</p>
        <p className="text-2xl font-semibold text-parchment">{value}</p>
        <p className="text-xs text-fog/70">{helper}</p>
      </CardContent>
    </Card>
  )
}
