import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/services/api'
import type { Receipt } from '@/services/api'
import { ExternalLink } from 'lucide-react'

export function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReceipts()
  }, [])

  const loadReceipts = async () => {
    setIsLoading(true)
    try {
      const data = await api.getReceipts(50)
      setReceipts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load receipts')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <div className="text-fog">Loading receipts…</div>
  if (error) return <div className="text-ember">{error}</div>

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-xl font-semibold text-parchment">Cryptographic proofs</h2>
        {receipts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-fog">
            No receipts yet. Start a crawl to generate signed proof-of-access.
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <motion.div
                key={receipt._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-fog"
              >
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>ID: {receipt._id}</span>
                  <span>{new Date(receipt.ts).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-parchment">Request {receipt.request_id}</p>
                <p>Paid Total: {receipt.json?.paid_total ?? 0} USDC</p>
                {receipt.json?.x402_tx && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-fog/70">X402 Tx:</span>
                    <a
                      href={`https://explorer.solana.com/tx/${receipt.json.x402_tx}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-sand hover:text-parchment transition-colors"
                    >
                      {receipt.json.x402_tx.slice(0, 8)}...{receipt.json.x402_tx.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {receipt.json?.provider_onchain_tx && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-fog/70">Provider Tx:</span>
                    <a
                      href={`https://explorer.solana.com/tx/${receipt.json.provider_onchain_tx}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-sand hover:text-parchment transition-colors"
                    >
                      {receipt.json.provider_onchain_tx.slice(0, 8)}...{receipt.json.provider_onchain_tx.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {receipt.json?.tap_digest && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-fog/70">TAP:</span>
                    <span className="text-xs text-fog">
                      {receipt.json.tap_digest.slice(0, 8)}...{receipt.json.tap_digest.slice(-6)}
                    </span>
                  </div>
                )}
                <p className="mt-2 truncate text-xs text-fog/70">Sig: {receipt.ed25519_sig}</p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
