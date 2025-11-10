import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { api } from '@/services/api'
import { walletService } from '@/services/wallet'
import type { WalletAdapterId, WalletDescriptor } from '@/services/wallet'
import { Mail, Lock, User, ArrowLeft, WalletIcon } from 'lucide-react'
import { SignupSuccessModal } from '@/components/signup-success-modal'

const SIGNUP_BONUS_FLAG = 'signup_bonus_pending'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isWalletMode, setIsWalletMode] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [returnTo, setReturnTo] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [walletOptions, setWalletOptions] = useState<WalletDescriptor[]>([])
  const [showOtherWallets, setShowOtherWallets] = useState(false)

  const { login, signup, walletLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const rt = params.get('return_to')
    setReturnTo(rt)
  }, [location.search])

  useEffect(() => {
    if (!isAuthenticated) return
    if (returnTo) {
      window.location.href = returnTo
      return
    }
    if (!showSuccessModal) {
      navigate('/app')
    }
  }, [isAuthenticated, navigate, showSuccessModal, returnTo])

  useEffect(() => {
    const detected = walletService.getAvailableWallets()
    setWalletOptions(detected)
    if (detected.every((wallet) => !wallet.detected)) {
      setShowOtherWallets(true)
    }
  }, [])

  const redirectIfNeeded = () => {
    if (returnTo) {
      window.location.href = returnTo
      return true
    }
    return false
  }

  const handleSignupBonusFlag = () => {
    try {
      window.localStorage.setItem(SIGNUP_BONUS_FLAG, 'true')
    } catch {}
    if (redirectIfNeeded()) {
      return
    }
    setShowSuccessModal(true)
  }

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (mode === 'signup') {
        await signup(name, email, password)
        handleSignupBonusFlag()
      } else {
        await login(email, password)
        if (redirectIfNeeded()) return
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Authentication failed'
      setError(errorMsg)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletAuth = async (adapter: WalletAdapterId) => {
    setError('')
    setIsLoading(true)
    try {
      const address = await walletService.connectWallet(adapter)
      const challenge = await api.getWalletChallenge({ chain: 'solana', address })
      const signature = await walletService.signMessage(adapter, challenge.message)
      await walletLogin(address, signature, challenge.nonce)
      if (mode === 'signup') {
        handleSignupBonusFlag()
      } else if (redirectIfNeeded()) {
        return
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Wallet authentication failed'
      setError(errorMsg)
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink p-4 text-parchment">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-sand/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-ember/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#111111]/85 p-8 backdrop-blur">
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => {
                if (window.location.pathname === '/auth') {
                  navigate('/')
                } else {
                  window.location.hash = '#home'
                }
              }}
              className="flex items-center gap-2 text-sm text-fog transition-colors hover:text-parchment"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Logo className="h-8" />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
            <button
              onClick={() => setMode('login')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-[#cfbea0] text-black shadow-glow' : 'text-fog hover:text-parchment'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-[#cfbea0] text-black shadow-glow' : 'text-fog hover:text-parchment'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</div>
          )}

          <AnimatePresence mode="wait">
            {isWalletMode ? (
              <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <WalletSelector
                  wallets={walletOptions}
                  isLoading={isLoading}
                  showOther={showOtherWallets}
                  onToggleOther={() => setShowOtherWallets((prev) => !prev)}
                  onConnect={handleWalletAuth}
                />
                <button
                  onClick={() => setIsWalletMode(false)}
                  className="mt-6 w-full text-sm text-fog transition-colors hover:text-parchment"
                >
                  Use email instead
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailAuth}
              >
                {mode === 'signup' && (
                  <div className="mb-4">
                    <label className="mb-2 block text-sm text-fog">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 text-parchment placeholder-fog/50 outline-none focus:border-sand/50"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-2 block text-sm text-fog">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 text-parchment placeholder-fog/50 outline-none focus:border-sand/50"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm text-fog">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-3 text-parchment placeholder-fog/50 outline-none focus:border-sand/50"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="mb-4 w-full bg-[#cfbea0] text-black hover:bg-[#cfbea0]">
                  {isLoading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-[#111111] px-2 text-fog">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsWalletMode(true)}
                  className="flex w-full items-center justify-center gap-2 border border-white/12 text-parchment transition-none hover:border-white/12 hover:bg-transparent"
                >
                  <WalletIcon className="h-4 w-4" />
                  Continue with Wallet
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <SignupSuccessModal open={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
    </div>
  )
}

function WalletSelector({
  wallets,
  isLoading,
  showOther,
  onToggleOther,
  onConnect,
}: {
  wallets: WalletDescriptor[]
  isLoading: boolean
  showOther: boolean
  onToggleOther: () => void
  onConnect: (adapter: WalletAdapterId) => void
}) {
  const detected = wallets.filter((wallet) => wallet.detected && wallet.adapter)
  const undetected = wallets.filter((wallet) => !wallet.detected)
  const showInstall = showOther || detected.length === 0

  return (
    <div className="space-y-4">
      {detected.length > 0 ? (
        detected.map((wallet) => (
          <Button
            key={wallet.id}
            onClick={() => wallet.adapter && onConnect(wallet.adapter)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 bg-[#cfbea0] text-black hover:bg-[#cfbea0]"
          >
            <WalletLogo icon={wallet.icon} label={wallet.label} />
            {isLoading ? 'Connecting...' : `Connect ${wallet.label}`}
          </Button>
        ))
      ) : (
        <div className="rounded-lg border border-white/10 p-4 text-sm text-fog">No wallets detected. Install one to get started.</div>
      )}

      <div className="rounded-lg border border-white/10 p-4">
        {detected.length > 0 && (
          <button onClick={onToggleOther} className="w-full text-left text-sm font-medium text-parchment">
            {showOther ? 'Hide other wallets' : 'Need another wallet?'}
          </button>
        )}
        {showInstall && undetected.length > 0 && (
          <div className="mt-3 space-y-2 text-sm text-fog">
            {undetected.map((wallet) => (
              <a
                key={wallet.id}
                href={wallet.installUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 transition-colors hover:border-white/30 hover:text-parchment"
              >
                <span className="flex items-center gap-2">
                  <WalletLogo icon={wallet.icon} label={wallet.label} />
                  {wallet.label}
                </span>
                <span className="text-xs text-sand">Install</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WalletLogo({ icon, label }: { icon?: string; label: string }) {
  if (icon) {
    return <img src={icon} alt={`${label} logo`} className="h-6 w-6 rounded-full object-cover" />
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
      {label.slice(0, 1)}
    </span>
  )
}
