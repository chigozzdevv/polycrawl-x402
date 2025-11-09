import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { walletService } from '@/services/wallet'
import { Wallet as WalletIcon, ShieldCheck } from 'lucide-react'
import { SpendingCapsPage } from './spending-caps'

export function ConsumerSettingsPage() {
  const [walletStatus, setWalletStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'caps' | 'payout' | 'security'>('caps')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeStatus, setChangeStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [changeLoading, setChangeLoading] = useState(false)

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

  const tabs: Array<{ id: 'caps' | 'payout' | 'security'; label: string }> = [
    { id: 'caps', label: 'Caps' },
    { id: 'payout', label: 'Payout' },
    { id: 'security', label: 'Security' },
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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab.id ? 'bg-sand text-ink' : 'bg-white/5 text-fog hover:text-parchment'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'caps' && (
        <Card>
          <CardContent className="p-0">
            <SpendingCapsPage />
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
                <p className="text-sm font-semibold text-parchment">Linked wallet</p>
                <p className="text-xs text-fog">Use Phantom or Solflare to re-link your Solana payout wallet.</p>
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
        <div className="space-y-6">
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
                <p className={`text-sm ${changeStatus.tone === 'success' ? 'text-sand' : 'text-ember'}`}>{changeStatus.message}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
