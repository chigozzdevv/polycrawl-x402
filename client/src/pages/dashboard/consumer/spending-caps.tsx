import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { SpendingCaps, Receipt } from '@/services/api';
import { Shield, Edit, Save, X } from 'lucide-react';

export function SpendingCapsPage() {
  const [caps, setCaps] = useState<SpendingCaps | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [editedCaps, setEditedCaps] = useState({
    global_weekly_cap: 0,
    per_site_daily_cap: 0,
    raw_cap: 0,
    summary_cap: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [capsData, receiptsData] = await Promise.all([
        api.getSpendingCaps(),
        api.getReceipts(),
      ]);
      setCaps(capsData);
      setReceipts(receiptsData);
      setEditedCaps({
        global_weekly_cap: capsData.global_weekly_cap || 100,
        per_site_daily_cap: capsData.per_site_daily_cap || 10,
        raw_cap: capsData.per_mode_caps?.raw || 50,
        summary_cap: capsData.per_mode_caps?.summary || 20,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load spending caps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.updateSpendingCaps({
        global_weekly_cap: editedCaps.global_weekly_cap,
        per_site_daily_cap: editedCaps.per_site_daily_cap,
        per_mode_caps: {
          raw: editedCaps.raw_cap,
          summary: editedCaps.summary_cap,
        },
      });
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update spending caps');
    }
  };

  if (isLoading) {
    return <div className="text-fog">Loading spending caps...</div>;
  }

  if (error && !caps) {
    return <div className="text-ember">{error}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const weekSpent = receipts
    .filter((r) => {
      const receiptDate = new Date(r.ts);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return receiptDate >= weekAgo;
    })
    .reduce((sum, receipt) => sum + (receipt.json?.paid_total || 0), 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-ember/10 border border-ember/20 rounded-lg text-ember text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-parchment">Spending caps</h2>
          <p className="text-sm text-fog mt-1">Manage caps to control costs</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit Caps
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sand/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sand" />
                </div>
                <div>
                  <h3 className="text-parchment font-medium">Weekly Global Cap</h3>
                  <p className="text-xs text-fog">Maximum spend per week</p>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedCaps.global_weekly_cap}
                  onChange={(e) =>
                    setEditedCaps({ ...editedCaps, global_weekly_cap: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-parchment focus:outline-none focus:border-sand/50"
                  min="0"
                  step="10"
                />
              ) : (
                <div className="text-2xl font-semibold text-parchment mb-2">
                  {formatCurrency(caps?.global_weekly_cap || 100)}
                </div>
              )}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-fog">Spent this week</span>
                  <span className="text-parchment font-medium">{formatCurrency(weekSpent)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-sand h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((weekSpent / (caps?.global_weekly_cap || 100)) * 100, 100)}%`,
                    }}
                  />
                </div>
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-ember/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-ember" />
                </div>
                <div>
                  <h3 className="text-parchment font-medium">Per Site Daily Cap</h3>
                  <p className="text-xs text-fog">Maximum per resource/day</p>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedCaps.per_site_daily_cap}
                  onChange={(e) =>
                    setEditedCaps({ ...editedCaps, per_site_daily_cap: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-parchment focus:outline-none focus:border-sand/50"
                  min="0"
                  step="5"
                />
              ) : (
                <div className="text-2xl font-semibold text-parchment">
                  {formatCurrency(caps?.per_site_daily_cap || 10)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sand/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sand" />
                </div>
                <div>
                  <h3 className="text-parchment font-medium">Raw Mode Cap</h3>
                  <p className="text-xs text-fog">Weekly limit for raw data</p>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedCaps.raw_cap}
                  onChange={(e) =>
                    setEditedCaps({ ...editedCaps, raw_cap: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-parchment focus:outline-none focus:border-sand/50"
                  min="0"
                  step="5"
                />
              ) : (
                <div className="text-2xl font-semibold text-parchment">
                  {formatCurrency(caps?.per_mode_caps?.raw || 50)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-ember/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-ember" />
                </div>
                <div>
                  <h3 className="text-parchment font-medium">Summary Mode Cap</h3>
                  <p className="text-xs text-fog">Weekly limit for summaries</p>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={editedCaps.summary_cap}
                  onChange={(e) =>
                    setEditedCaps({ ...editedCaps, summary_cap: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-parchment focus:outline-none focus:border-sand/50"
                  min="0"
                  step="5"
                />
              ) : (
                <div className="text-2xl font-semibold text-parchment">
                  {formatCurrency(caps?.per_mode_caps?.summary || 20)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}
