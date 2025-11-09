import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { walletService } from '@/services/wallet'
import { Wallet as WalletIcon, ShieldCheck, Bell, Shield } from 'lucide-react'

export function ProviderSettingsPage() {
  const [walletStatus, setWalletStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'general' | 'payout' | 'security' | 'access'>('general')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeStatus, setChangeStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [changeLoading, setChangeLoading] = useState(false)

  // General settings state
  const [webhookUrl, setWebhookUrl] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [generalStatus, setGeneralStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  // Access control state
  const [blockedAgents, setBlockedAgents] = useState<string>('')
  const [requireVerification, setRequireVerification] = useState(false)
  const [accessStatus, setAccessStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const handleLinkWallet = async () => {
    setWalletStatus(null)
    setWalletLoading(true)
    try {
      const candidates = walletService.getAvailableWallets().filter((wallet) => wallet.detected && wallet.adapter)
      const adapter = candidates[0]?.adapter
      if (!adapter) {
        throw new Error('No browser wallet detected. Open Phantom/Solflare and try again.')
      }
      const address = await walletService.connectWallet(adapter)
      const challenge = await api.getWalletChallenge({ chain: 'solana', address })
      const signature = await walletService.signMessage(adapter, challenge.message)
      await api.linkWallet({ address, chain: 'solana', signature, nonce: challenge.nonce })
      setWalletStatus({ tone: 'success', message: `Wallet ${address.slice(0, 4)}… linked successfully.` })
    } catch (err: any) {
      setWalletStatus({ tone: 'error', message: err.message || 'Unable to link wallet' })
    } finally {
      setWalletLoading(false)
    }
  }

  const tabs: Array<{ id: 'general' | 'payout' | 'security' | 'access'; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'payout', label: 'Payout' },
    { id: 'security', label: 'Security' },
    { id: 'access', label: 'Access Control' },
  ]

  const handleChangePassword = async () => {
    setChangeStatus(null)
    if (currentPassword.length < 8) {
      setChangeStatus({ tone: 'error', message: 'Current password must be at least 8 characters' })
      return
    }
    if (newPassword.length < 8) {
      setChangeStatus({ tone: 'error', message: 'New password must be at least 8 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setChangeStatus({ tone: 'error', message: 'Passwords do not match' })
      return
    }
    setChangeLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setChangeStatus({ tone: 'success', message: 'Password updated successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setChangeStatus({ tone: 'error', message: err.message || 'Unable to update password' })
    } finally {
      setChangeLoading(false)
    }
  }

  const handleSaveGeneral = () => {
    setGeneralStatus({ tone: 'success', message: 'General settings saved successfully' })
    // TODO: Implement actual save to backend when API is ready
  }

  const handleSaveAccess = () => {
    setAccessStatus({ tone: 'success', message: 'Access control settings saved successfully' })
    // TODO: Implement actual save to backend when API is ready
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium text-parchment">Provider Settings</h2>
        <p className="text-sm text-fog mt-1">Configure your provider workspace</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id ? 'bg-sand text-ink' : 'bg-white/5 text-fog hover:text-parchment'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-parchment">General Settings</p>
                <p className="text-xs text-fog">Configure webhooks and notifications for your provider account.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-fog">Webhook URL (Optional)</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment outline-none focus:border-sand/50"
                  placeholder="https://your-domain.com/webhook"
                />
                <p className="mt-1 text-xs text-fog">Receive real-time notifications when resources are accessed</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5"
                />
                <label htmlFor="notifications" className="text-sm text-parchment">
                  Enable email notifications for earnings and activity
                </label>
              </div>
            </div>

            <Button
              onClick={handleSaveGeneral}
              variant="outline"
              className="w-fit border-white/20 text-parchment hover:text-black"
            >
              Save General Settings
            </Button>

            {generalStatus && (
              <p className={`text-sm ${generalStatus.tone === 'success' ? 'text-sand' : 'text-ember'}`}>
                {generalStatus.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payout' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <WalletIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-parchment">Payout Wallet</p>
                <p className="text-xs text-fog">Link your Solana wallet to receive earnings from your resources.</p>
              </div>
            </div>
            <Button
              onClick={handleLinkWallet}
              disabled={walletLoading}
              variant="outline"
              className="w-fit border-white/20 text-parchment hover:text-black"
            >
              {walletLoading ? 'Linking…' : 'Link browser wallet'}
            </Button>
            {walletStatus && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  walletStatus.tone === 'success'
                    ? 'border-sand/40 bg-sand/10 text-sand'
                    : 'border-ember/30 bg-ember/10 text-ember'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{walletStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-parchment">Change password</p>
                <p className="text-xs text-fog">Update your credentials securely from here.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-fog">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment outline-none focus:border-sand/50"
                  placeholder="Enter your current password"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-fog">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment outline-none focus:border-sand/50"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-fog">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment outline-none focus:border-sand/50"
                />
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changeLoading}
              variant="outline"
              className="w-fit border-white/20 text-parchment hover:text-black"
            >
              {changeLoading ? 'Updating…' : 'Update password'}
            </Button>
            {changeStatus && (
              <p className={`text-sm ${changeStatus.tone === 'success' ? 'text-sand' : 'text-ember'}`}>
                {changeStatus.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'access' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-parchment">Access Control</p>
                <p className="text-xs text-fog">Manage which agents can access your resources.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-fog">Blocked Agent IDs</label>
                <textarea
                  value={blockedAgents}
                  onChange={(e) => setBlockedAgents(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment outline-none focus:border-sand/50"
                  placeholder="Enter agent IDs separated by commas (e.g., agent_123, agent_456)"
                  rows={3}
                />
                <p className="mt-1 text-xs text-fog">Agents in this list will be denied access to all your resources</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requireVerification"
                  checked={requireVerification}
                  onChange={(e) => setRequireVerification(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5"
                />
                <label htmlFor="requireVerification" className="text-sm text-parchment">
                  Require agent verification for access
                </label>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-parchment">Access Statistics</p>
                <div className="mt-2 space-y-1 text-xs text-fog">
                  <p>• Blocked agents: 0</p>
                  <p>• Denied requests (7d): 0</p>
                  <p>• Verification rate: 100%</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveAccess}
              variant="outline"
              className="w-fit border-white/20 text-parchment hover:text-black"
            >
              Save Access Settings
            </Button>

            {accessStatus && (
              <p className={`text-sm ${accessStatus.tone === 'success' ? 'text-sand' : 'text-ember'}`}>
                {accessStatus.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
