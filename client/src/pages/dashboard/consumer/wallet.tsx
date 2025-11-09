import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { Wallet } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet as WalletIcon, TrendingDown, Plus, ArrowUpRight } from 'lucide-react';

export function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSignupBanner, setShowSignupBanner] = useState(false);

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

  return (
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
                <Button variant="primary" className="flex-1 gap-2">
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
                <Button variant="outline" className="flex-1 gap-2">
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
  );
}
