import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/services/api';
import type { Receipt } from '@/services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Receipt as ReceiptIcon, TrendingDown, DollarSign, Calendar, ExternalLink } from 'lucide-react';

export function TransactionsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReceipts();
      setReceipts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-fog">Loading transactions...</div>;
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

  const totalSpent = receipts.reduce((sum, receipt) => {
    return sum + (receipt.json?.paid_total || 0);
  }, 0);

  const spendingData = receipts
    .reduce((acc: any[], receipt) => {
      const date = new Date(receipt.ts).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.amount += receipt.json?.paid_total || 0;
        existing.count += 1;
      } else {
        acc.push({
          date,
          amount: receipt.json?.paid_total || 0,
          count: 1,
        });
      }
      return acc;
    }, [])
    .slice(-14);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Total Spent</span>
                <DollarSign className="w-5 h-5 text-ember" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {formatCurrency(totalSpent)}
              </div>
              <div className="text-xs text-fog mt-1">All time</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Transactions</span>
                <ReceiptIcon className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {receipts.length}
              </div>
              <div className="text-xs text-fog mt-1">Total count</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Average</span>
                <TrendingDown className="w-5 h-5 text-fog" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {formatCurrency(receipts.length > 0 ? totalSpent / receipts.length : 0)}
              </div>
              <div className="text-xs text-fog mt-1">Per transaction</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-parchment">Spending History</h2>
              <Calendar className="w-5 h-5 text-fog" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#B9B1A5"
                  tick={{ fill: '#B9B1A5', fontSize: 12 }}
                />
                <YAxis
                  stroke="#B9B1A5"
                  tick={{ fill: '#B9B1A5', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E6E2DC',
                  }}
                  formatter={(value: any) => [formatCurrency(value), 'Spent']}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#D8C8A8"
                  strokeWidth={2}
                  dot={{ fill: '#D8C8A8', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-parchment">Transaction History</h2>
              <ReceiptIcon className="w-5 h-5 text-fog" />
            </div>
            {receipts.length === 0 ? (
              <div className="text-center py-12">
                <ReceiptIcon className="w-12 h-12 text-fog mx-auto mb-4" />
                <p className="text-fog">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div
                    key={receipt._id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-parchment font-medium">
                          {receipt.json?.resource?.title || 'Unknown Resource'}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded bg-sand/10 text-sand">
                          {receipt.json?.mode || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-fog">
                          {new Date(receipt.ts).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-fog">
                          {receipt.json?.bytes_billed || 0} bytes
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-parchment font-medium">
                        {formatCurrency(receipt.json?.paid_total || 0)}
                      </div>
                      {receipt.json?.x402_tx ? (
                        <a
                          href={`https://explorer.solana.com/tx/${receipt.json.x402_tx}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-end gap-1 text-xs text-sand hover:text-parchment transition-colors mt-1"
                        >
                          View Tx <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <div className="text-xs text-fog mt-1">
                          ID: {receipt._id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
