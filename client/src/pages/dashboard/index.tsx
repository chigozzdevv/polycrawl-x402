import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { api } from '@/services/api'
import { ConsumerOverview } from './consumer/overview'
import { WalletPage } from './consumer/wallet'
import { TransactionsPage } from './consumer/transactions'
import { ReceiptsPage } from './consumer/receipts'
import { ConsumerSettingsPage } from './consumer/settings'
import { OverviewPage } from './provider/overview'
import { ResourcesPage } from './provider/resources'
import { EarningsPage } from './provider/earnings'
import { AnalyticsPage } from './provider/analytics'
import { ConnectorsPage } from './provider/connectors'
import { ProviderSettingsPage } from './provider/settings'
import { SignupSuccessModal } from '@/components/signup-success-modal'
import { LogOut, User, Menu, X, Settings, CreditCard, Receipt, LayoutDashboard, Wallet, PlugZap, TrendingUp, BarChart3, Database, ChevronDown } from 'lucide-react'

const SIGNUP_FLAG = 'signup_bonus_pending'
const SIGNUP_RECENT_FLAG = 'signup_bonus_recent'
const WORKSPACE_PREF_KEY = 'polycrawl_workspace_preference'

type Section = {
  id: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  render: () => ReactNode
}

type Workspace = 'consumer' | 'provider'
type DashboardNavigateDetail = { workspace?: Workspace; section: string }

export function Dashboard() {
  const { logout } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace>('consumer')
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showSignupCelebration, setShowSignupCelebration] = useState(false)
  const [providerReady, setProviderReady] = useState(false)
  const [providerChecking, setProviderChecking] = useState(true)
  const [providerProvisioning, setProviderProvisioning] = useState(false)
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null)
  const pendingSectionRef = useRef<string | null>(null)
  const workspaceButtonRef = useRef<HTMLButtonElement | null>(null)
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const pending = window.localStorage.getItem(SIGNUP_FLAG)
    if (pending === 'true') {
      window.localStorage.removeItem(SIGNUP_FLAG)
      window.localStorage.setItem(SIGNUP_RECENT_FLAG, 'true')
      setShowSignupCelebration(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let saved: Workspace = 'consumer'
    try {
      const rawSaved = window.localStorage.getItem(WORKSPACE_PREF_KEY)
      if (rawSaved === 'consumer' || rawSaved === 'provider') {
        saved = rawSaved
      }
    } catch (e) {
      console.warn('Failed to read workspace preference from localStorage:', e)
    }
    setWorkspace(saved)
    let cancelled = false

    async function checkProviderAccess() {
      setProviderChecking(true)
      setWorkspaceMessage(null)
      try {
        await api.getProvider()
        if (cancelled) return
        setProviderReady(true)
        if (saved === 'provider') setWorkspace('provider')
      } catch (err: any) {
        if (cancelled) return
        setProviderReady(false)
        if (saved === 'provider') setWorkspace('consumer')
        if (!err?.message?.includes('404')) {
          setWorkspaceMessage(err?.message || 'Unable to verify provider workspace.')
        }
      } finally {
        if (!cancelled) setProviderChecking(false)
      }
    }

    checkProviderAccess()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DashboardNavigateDetail>).detail
      if (!detail?.section) return
      if (detail.workspace && detail.workspace !== workspace) {
        pendingSectionRef.current = detail.section
        setWorkspace(detail.workspace)
      } else {
        setActiveSection(detail.section)
      }
    }
    window.addEventListener('dashboard:navigate', handler as EventListener)
    return () => {
      window.removeEventListener('dashboard:navigate', handler as EventListener)
    }
  }, [workspace])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(WORKSPACE_PREF_KEY, workspace)
    } catch (e) {
      console.warn('Failed to save workspace preference to localStorage:', e)
    }
  }, [workspace])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        workspaceMenuOpen &&
        workspaceMenuRef.current &&
        workspaceButtonRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node) &&
        !workspaceButtonRef.current.contains(event.target as Node)
      ) {
        setWorkspaceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [workspaceMenuOpen])

  const consumerSections: Section[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview', description: 'Snapshot of usage', icon: LayoutDashboard, render: () => <ConsumerOverview /> },
      { id: 'wallet', label: 'Wallet', description: 'Balances and flows', icon: Wallet, render: () => <WalletPage /> },
      { id: 'transactions', label: 'Transactions', description: 'Recent crawls', icon: CreditCard, render: () => <TransactionsPage /> },
      { id: 'receipts', label: 'Receipts', description: 'Proof of payment', icon: Receipt, render: () => <ReceiptsPage /> },
      { id: 'settings', label: 'Settings', description: 'Alerts & automation', icon: Settings, render: () => <ConsumerSettingsPage /> },
    ],
    []
  )

  const providerSections: Section[] = useMemo(
    () => [
      { id: 'overview-provider', label: 'Overview', description: 'Provider dashboard', icon: LayoutDashboard, render: () => <OverviewPage /> },
      { id: 'resources', label: 'Resources', description: 'Manage listings', icon: Database, render: () => <ResourcesPage /> },
      { id: 'connectors', label: 'Connectors', description: 'Auth & secrets', icon: PlugZap, render: () => <ConnectorsPage /> },
      { id: 'earnings', label: 'Earnings', description: 'Revenue tracking', icon: TrendingUp, render: () => <EarningsPage /> },
      { id: 'analytics', label: 'Analytics', description: 'Performance metrics', icon: BarChart3, render: () => <AnalyticsPage /> },
      { id: 'settings', label: 'Settings', description: 'Account & access', icon: Settings, render: () => <ProviderSettingsPage /> },
    ],
    []
  )

  const sections = workspace === 'consumer' ? consumerSections : providerSections

  useEffect(() => {
    if (!sections.find((s) => s.id === activeSection)) {
      setActiveSection(sections[0]?.id || 'overview')
    }
  }, [workspace, sections, activeSection])

  useEffect(() => {
    if (pendingSectionRef.current && sections.find((s) => s.id === pendingSectionRef.current)) {
      setActiveSection(pendingSectionRef.current)
      pendingSectionRef.current = null
    }
  }, [sections])

  const renderSidebarNav = (variant: 'desktop' | 'mobile') => (
    <nav className={variant === 'desktop' ? 'space-y-2' : 'space-y-1'}>
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = section.id === activeSection
        const baseClasses = 'w-full rounded-xl px-4 py-3 text-left transition-colors flex flex-col border '
        const activeClasses = 'border-sand/40 bg-white/5 text-parchment'
        const inactiveClasses = 'border-transparent text-fog hover:text-parchment'
        return (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id)
              setShowMobileNav(false)
            }}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              {section.label}
            </div>
            <p className="text-xs text-fog/70">{section.description}</p>
          </button>
        )
      })}
    </nav>
  )

  const activeRenderer = sections.find((section) => section.id === activeSection)?.render ?? (() => null)

  const handleWorkspaceChange = async (target: Workspace) => {
    if (target === workspace) return
    setWorkspaceMessage(null)

    if (target === 'provider' && !providerReady) {
      if (providerChecking || providerProvisioning) return
      setProviderProvisioning(true)
      setWorkspaceMessage('Creating provider workspace…')
      try {
        await api.createProvider()
        setProviderReady(true)
        setWorkspace('provider')
        setWorkspaceMessage(null)
      } catch (err: any) {
        setWorkspace('consumer')
        setWorkspaceMessage(err?.message || 'Unable to enable provider workspace.')
      } finally {
        setProviderProvisioning(false)
      }
      return
    }

    setWorkspace(target)
  }

  const workspaceOptions: Array<{ id: Workspace; label: string }> = [
    { id: 'consumer', label: 'Consumer' },
    { id: 'provider', label: 'Provider' },
  ]

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <div className="fixed inset-y-0 hidden w-72 flex-col border-r border-white/10 bg-[#0c0c0c]/85 px-6 py-8 backdrop-blur md:flex">
        <Logo className="h-6" />
        <div className="mt-6 flex-1 overflow-y-auto pr-2">{renderSidebarNav('desktop')}</div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <Button variant="ghost" onClick={logout} className="w-full justify-start border border-white/10">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0f0f0f]/80 px-4 py-4 backdrop-blur md:flex-nowrap md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setShowMobileNav(true)} className="text-parchment">
              <Menu className="h-6 w-6" />
            </button>
            <Logo className="h-5" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="relative flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-fog">Viewing as</p>
              <button
                ref={workspaceButtonRef}
                onClick={() => {
                  if (providerProvisioning || providerChecking) return
                  setWorkspaceMenuOpen((prev) => !prev)
                }}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm font-medium text-parchment transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={providerProvisioning || providerChecking}
              >
                {workspace === 'consumer' ? 'Consumer' : 'Provider'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {workspaceMenuOpen && (
                <div
                  ref={workspaceMenuRef}
                  className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-white/10 bg-[#121212]/95 p-1 shadow-2xl backdrop-blur"
                >
                  {workspaceOptions.map((option) => {
                    const isSelected = workspace === option.id
                    const isDisabled =
                      option.id === 'provider' &&
                      (!providerReady && !providerProvisioning && !providerChecking)
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setWorkspaceMenuOpen(false)
                          handleWorkspaceChange(option.id)
                        }}
                        disabled={isDisabled}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                          isSelected ? 'bg-sand text-ink' : 'text-parchment hover:bg-white/10'
                        } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {option.label}
                        {isDisabled && <span className="ml-2 text-xs text-fog">Setup required</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {workspaceMessage && <p className="text-xs text-amber-200">{workspaceMessage}</p>}
          </div>
          <div className="relative">
            <button onClick={() => setProfileMenuOpen((prev) => !prev)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <User className="h-5 w-5" />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#111111] p-2 text-sm text-parchment">
                <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">View profile</button>
                <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5">Settings</button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-ember hover:bg-white/5" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] px-4 py-6 md:px-8 md:py-10">
          <motion.div key={`${workspace}-${activeSection}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {activeRenderer()}
          </motion.div>
        </main>
      </div>

      {showMobileNav && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur md:hidden" onClick={() => setShowMobileNav(false)}>
          <div className="absolute inset-y-0 left-0 w-72 bg-[#0f0f0f] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <Logo className="h-5" />
              <button onClick={() => setShowMobileNav(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 overflow-y-auto pr-2">{renderSidebarNav('mobile')}</div>
            <Button variant="ghost" onClick={logout} className="mt-4 w-full justify-start border border-white/10">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      )}

      <SignupSuccessModal open={showSignupCelebration} onClose={() => setShowSignupCelebration(false)} />
    </div>
  )
}
