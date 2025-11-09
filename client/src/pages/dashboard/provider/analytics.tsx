import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/services/api'
import type { SearchStats } from '@/services/api'
import { Search, Users, TrendingUp, Eye, Activity } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export function AnalyticsPage() {
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVolume, setRequestVolume] = useState<Array<{ date: string; count: number }>>([])
  const [volumeLoading, setVolumeLoading] = useState(true)
  const [volumeError, setVolumeError] = useState('')

  useEffect(() => {
    loadStats()
    loadVolume()
  }, [days])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await api.getSearchStats(days)
      setStats(data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const loadVolume = async () => {
    setVolumeLoading(true)
    try {
      const earnings = await api.getProviderEarnings(days)
      if (earnings?.daily) {
        setRequestVolume(earnings.daily.map((row) => ({ date: row.date, count: row.count })))
      } else {
        setRequestVolume([])
      }
      setVolumeError('')
    } catch (err: any) {
      setVolumeError(err.message || 'Failed to load request volume')
      setRequestVolume([])
    } finally {
      setVolumeLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-fog">Loading analytics...</div>
  }

  if (error) {
    return <div className="text-ember">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-parchment">Search Analytics</h2>
          <p className="text-sm text-fog mt-1">Monitor resource discovery and engagement</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-parchment focus:outline-none"
        >
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Total Searches</span>
                <Search className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">{stats?.totalImpressions || 0}</div>
              <div className="text-xs text-fog mt-1">Impressions in period</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Period Total</span>
                <Eye className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">{stats?.totalSelected || 0}</div>
              <div className="text-xs text-fog mt-1">Selected resources</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Avg Daily</span>
                <TrendingUp className="w-5 h-5 text-fog" />
              </div>
              <div className="text-2xl font-semibold text-parchment">{Math.round((stats?.selectionRate || 0) * 100)}%</div>
              <div className="text-xs text-fog mt-1">Selection rate</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Unique Users</span>
                <Users className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">{Math.round((stats?.totalImpressions || 0) / days)}</div>
              <div className="text-xs text-fog mt-1">Avg impressions / day</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-parchment">Request volume</h2>
                <p className="text-sm text-fog">Successful crawls per day</p>
              </div>
              <Activity className="h-5 w-5 text-fog" />
            </div>
            {volumeLoading ? (
              <p className="text-sm text-fog">Loading request volume…</p>
            ) : volumeError ? (
              <p className="text-sm text-ember">{volumeError}</p>
            ) : requestVolume.length === 0 ? (
              <p className="text-sm text-fog">No activity tracked for this window.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={requestVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#B9B1A5" tick={{ fill: '#B9B1A5', fontSize: 12 }} />
                  <YAxis stroke="#B9B1A5" tick={{ fill: '#B9B1A5', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#E6E2DC',
                    }}
                    labelStyle={{ color: '#E6E2DC' }}
                  />
                  <Bar dataKey="count" fill="#D8C8A8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xl font-medium text-parchment">Insights</h2>
            <div className="space-y-3 text-sm text-fog">
              <p>
                {stats?.selectionRate
                  ? `Agents select your content ${Math.round(stats.selectionRate * 100)}% of the time they see it.`
                  : 'No selection data yet. Publish more resources to gather signal.'}
              </p>
              <p>
                {stats?.totalImpressions
                  ? `You generated ${(stats.totalImpressions / days).toFixed(1)} impressions per day during the selected window.`
                  : 'No impressions recorded for this window.'}
              </p>
              <p>Use verification + connectors to improve trust. Verified resources tend to convert 2–3× better.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
