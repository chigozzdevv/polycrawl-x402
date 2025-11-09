import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/services/api';
import type { ProviderOverview } from '@/services/api';
import { DollarSign, Search, TrendingUp, Star } from 'lucide-react';

export function OverviewPage() {
  const [overview, setOverview] = useState<ProviderOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProviderOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-fog">Loading overview...</div>;
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

  const verifiedCount = overview?.resources.filter((r) => r.verified).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-sand" />}
          label="Revenue (30d)"
          value={formatCurrency(overview?.earnings.total30d || 0)}
          helper="platform payouts + fees"
          delay={0.1}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-sand" />}
          label="Avg earning / request"
          value={formatCurrency(overview?.earnings.avgEarning || 0)}
          helper="net of platform fees"
          delay={0.2}
        />
        <StatCard
          icon={<Search className="h-5 w-5 text-sand" />}
          label="Requests served"
          value={(overview?.earnings.totalRequests || 0).toString()}
          helper="past 30 days"
          delay={0.3}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-sand" />}
          label="Selection rate"
          value={`${Math.round((overview?.searchStats.selectionRate || 0) * 100)}%`}
          helper={`${overview?.searchStats.totalSelected || 0} of ${overview?.searchStats.totalImpressions || 0}`}
          delay={0.4}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-medium text-parchment">Top resources</h2>
            {overview?.resources.length ? (
              <div className="space-y-3">
                {overview.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="justify-betweenrounded-xl flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-parchment">{resource.title}</p>
                      <p className="text-xs text-fog">{resource.type}</p>
                    </div>
                    {resource.verified && (
                      <span className="text-xs text-sand">Verified</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-fog">No resources yet</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-medium text-parchment">Highlights</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Highlight
                label="Verified coverage"
                value={
                  overview && overview.resources.length > 0
                    ? `${Math.round((verifiedCount / overview.resources.length) * 100)}%`
                    : '0%'
                }
                helper={`${verifiedCount} of ${overview?.resources.length || 0} resources`}
              />
              <Highlight
                label="Daily selection delta"
                value={
                  overview
                    ? `${Math.round((overview.searchStats.totalSelected / Math.max(overview.searchStats.totalImpressions, 1)) * 100)}%`
                    : '0%'
                }
                helper="selected vs impressions"
              />
              <Highlight
                label="Payout momentum"
                value={formatCurrency((overview?.earnings.avgEarning || 0) * (overview?.earnings.totalRequests || 0) * 0.15)}
                helper="Projected weekly earnings"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
      <Card className="h-full">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-fog">{label}</span>
            {icon}
          </div>
          <div className="text-2xl font-semibold text-parchment">{value}</div>
          <div className="text-xs text-fog mt-1">{helper}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Highlight({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-fog">{label}</p>
      <p className="text-2xl font-semibold text-parchment">{value}</p>
      <p className="text-xs text-fog">{helper}</p>
    </div>
  );
}
