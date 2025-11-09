import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { Wallet } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet as WalletIcon, TrendingDown, Plus, ArrowUpRight, X, Loader2, Copy, Check } from 'lucide-react';

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-parchment">{title}</h3>
          <button onClick={onClose} className="text-fog hover:text-parchment">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSignupBanner, setShowSignupBanner] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [depositStatus, setDepositStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [depositTab, setDepositTab] = useState<'onchain' | 'request'>('onchain');
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
    if (typeof window !== 'undefined') {
      if (window.localStorage.getItem('signup_bonus_recent') === 'true') {
        setShowSignupBanner(true);
        window.localStorage.removeItem('signup_bonus_recent');
      }
    }
  }, []);

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWallets();
      setWallets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    setDepositStatus(null);
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setDepositStatus({ tone: 'error', message: 'Enter a valid amount greater than 0.' });
      return;
    }
    setDepositSubmitting(true);
    try {
      const res = await api.createDeposit('payer', amount);
      setDepositStatus({ tone: 'success', message: `Request ${res.id} submitted. We’ll mint devnet USDC shortly.` });
      setDepositAmount('');
      await loadWallets();
    } catch (err: any) {
      setDepositStatus({ tone: 'error', message: err.message || 'Unable to create deposit' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleCopy = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyToast('copied');
      setTimeout(() => setCopyToast(null), 2000);
    } catch (err) {
      setCopyToast('Unable to copy');
      setTimeout(() => setCopyToast(null), 2000);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawStatus(null);
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawStatus({ tone: 'error', message: 'Enter a valid amount greater than 0.' });
      return;
    }
    if (!withdrawAddress || withdrawAddress.length < 10) {
      setWithdrawStatus({ tone: 'error', message: 'Destination address is required.' });
      return;
    }
    setWithdrawSubmitting(true);
    try {
      const res = await api.createWithdrawal('payout', amount, withdrawAddress.trim());
      setWithdrawStatus({ tone: 'success', message: `Withdrawal ${res.id} sent. Check ${withdrawAddress.trim()} after a few seconds.` });
      setWithdrawAmount('');
      setWithdrawAddress('');
      await loadWallets();
    } catch (err: any) {
      setWithdrawStatus({ tone: 'error', message: err.message || 'Unable to create withdrawal' });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-fog">Loading wallet...</div>;
  }

  if (error) {
    return <div className="text-ember">{error}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const payerWallet = wallets.find((w) => w.role === 'payer');
  const payoutWallet = wallets.find((w) => w.role === 'payout');

  const walletPieData = [
    { name: 'Available', value: payerWallet?.available || 0 },
    { name: 'Blocked', value: payerWallet?.blocked || 0 },
  ];

const COLORS = ['#D8C8A8', '#E07555'];
const MAX_REQUEST_AMOUNT = 5000;

  return (
    <>
    <div className="space-y-6">
      {showSignupBanner && (
        <div className="rounded-2xl border border-sand/30 bg-sand/10 px-4 py-3 text-sm text-black md:text-parchment">
          <div className="font-semibold">Devnet airdrop en route</div>
          <p className="text-xs md:text-sm text-black/70 md:text-fog">
            We’re minting your 1000 devnet USDC. Balances update once Solana confirms the transfer (takes ~30s).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-fog mb-1">Payer Wallet</p>
                  <h2 className="text-3xl font-semibold text-parchment">
                    {formatCurrency(payerWallet?.available || 0)}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-sand/10 rounded-full flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-sand" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fog">Available</span>
                  <span className="text-parchment font-medium">
                    {formatCurrency(payerWallet?.available || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fog">Blocked</span>
                  <span className="text-ember font-medium">
                    {formatCurrency(payerWallet?.blocked || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                  <span className="text-fog">Status</span>
                  <span className={`font-medium ${payerWallet?.status === 'active' ? 'text-sand' : 'text-ember'}`}>
                    {payerWallet?.status || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="primary" className="flex-1 gap-2" onClick={() => setDepositOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Funds
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-fog mb-1">Payout Wallet</p>
                  <h2 className="text-3xl font-semibold text-parchment">
                    {formatCurrency(payoutWallet?.available || 0)}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-ember/10 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-ember" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fog">Available</span>
                  <span className="text-parchment font-medium">
                    {formatCurrency(payoutWallet?.available || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fog">Blocked</span>
                  <span className="text-fog font-medium">
                    {formatCurrency(payoutWallet?.blocked || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                  <span className="text-fog">Status</span>
                  <span className={`font-medium ${payoutWallet?.status === 'active' ? 'text-sand' : 'text-ember'}`}>
                    {payoutWallet?.status || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setWithdrawOpen(true)}>
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-medium text-parchment mb-6">Wallet Balance Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={walletPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {walletPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E6E2DC',
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sand" />
                <span className="text-sm text-fog">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-ember" />
                <span className="text-sm text-fog">Blocked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>

      <Modal open={depositOpen} title="Add funds" onClose={() => { setDepositOpen(false); setDepositStatus(null); }}>
        <div className="space-y-4">
          <div className="flex rounded-full border border-white/15 bg-transparent p-1 text-xs font-semibold uppercase tracking-[0.2em] text-fog">
            {(['onchain', 'request'] as const).map((tab) => {
              const isActive = depositTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setDepositTab(tab)}
                  className={`flex-1 rounded-full px-3 py-1 transition ${
                    isActive ? 'bg-sand text-ink' : 'bg-white/5 text-fog hover:text-parchment'
                  }`}
                >
                  {tab === 'onchain' ? 'On-chain' : 'Request'}
                </button>
              )
            })}
          </div>

          {depositTab === 'onchain' ? (
            <div className="space-y-4 text-sm text-fog">
              <p>Send devnet USDC directly to your payer wallet. Balances update once Solana confirms (~1 min).</p>
              <div className="rounded-2xl border border-white/15 bg-[#121212] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-fog/70">
                  <span>Payer address</span>
                  <button
                    onClick={() => handleCopy(payerWallet?.address)}
                    className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-parchment transition hover:bg-white/10"
                  >
                    {copyToast === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copyToast === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="break-all font-mono text-base text-parchment">{payerWallet?.address || 'Address unavailable'}</p>
              </div>
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-fog">
                Use <code className="text-parchment">solana airdrop</code> for SOL fees, then move devnet USDC with <code className="text-parchment">spl-token transfer</code>.
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-fog">
                Request Polycrawl to mint devnet USDC for you (max ${MAX_REQUEST_AMOUNT.toLocaleString()} per request, ${MAX_REQUEST_AMOUNT.toLocaleString()} total per day).
                Funds are credited immediately after approval.
              </p>
              <label className="space-y-1 text-sm text-fog">
                <span>Amount (USD)</span>
                <input
                  type="number"
                  min="1"
                  max={MAX_REQUEST_AMOUNT}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-parchment focus:border-sand/50 focus:outline-none"
                />
              </label>
              <div className="pt-2">
                <Button onClick={handleDeposit} disabled={depositSubmitting} className="w-full">
                  {depositSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit mint request'}
                </Button>
              </div>
            </>
          )}
          {depositStatus && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                depositStatus.tone === 'success' ? 'border-sand/40 bg-sand/10 text-sand' : 'border-ember/40 bg-ember/10 text-ember'
              }`}
            >
              {depositStatus.message}
            </div>
          )}
          {copyToast && (
            <p className="text-xs text-sand">
              {copyToast === 'copied' ? 'Address copied to clipboard' : copyToast}
            </p>
          )}
        </div>
      </Modal>

      <Modal open={withdrawOpen} title="Withdraw funds" onClose={() => { setWithdrawOpen(false); setWithdrawStatus(null); }}>
        <div className="space-y-4">
          <p className="text-sm text-fog">
            Send payout wallet funds to a Solana address (devnet). You can request up to ${MAX_REQUEST_AMOUNT.toLocaleString()} per withdrawal.
          </p>
          <label className="space-y-1 text-sm text-fog">
            <span>Amount (USD)</span>
            <input
              type="number"
              min="1"
              max={MAX_REQUEST_AMOUNT}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-parchment focus:border-sand/50 focus:outline-none"
            />
          </label>
          <label className="space-y-1 text-sm text-fog">
            <span>Destination address</span>
            <input
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-parchment focus:border-sand/50 focus:outline-none"
              placeholder="Enter Solana address"
            />
          </label>
          <Button onClick={handleWithdraw} disabled={withdrawSubmitting} className="mt-3 w-full">
            {withdrawSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit withdrawal'}
          </Button>
          {withdrawStatus && (
            <div
              className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                withdrawStatus.tone === 'success' ? 'border-sand/40 bg-sand/10 text-sand' : 'border-ember/40 bg-ember/10 text-ember'
              }`}
            >
              {withdrawStatus.message}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
