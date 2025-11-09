import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, DollarSign, BarChart3 } from 'lucide-react';
import { OverviewPage } from './overview';
import { ResourcesPage } from './resources';
import { EarningsPage } from './earnings';
import { AnalyticsPage } from './analytics';

type ProviderTab = 'overview' | 'resources' | 'earnings' | 'analytics';

export function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'resources' as const, label: 'Resources', icon: FileText },
    { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium text-parchment">Provider Dashboard</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-sand text-ink'
                  : 'bg-white/5 text-fog hover:text-parchment'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && <OverviewPage />}
        {activeTab === 'resources' && <ResourcesPage />}
        {activeTab === 'earnings' && <EarningsPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </motion.div>
    </div>
  );
}
