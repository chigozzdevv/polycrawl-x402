import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { WalletIcon, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SignupSuccessModalProps = {
  open: boolean
  onClose: () => void
}

export function SignupSuccessModal({ open, onClose }: SignupSuccessModalProps) {
  const navigate = useNavigate()
  const mcpUrl = 'https://api.polycrawl.com/mcp'
  const [copied, setCopied] = useState(false as any)
  const copy = async () => {
    try { await navigator.clipboard.writeText(mcpUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111111] p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand/10">
                <WalletIcon className="h-8 w-8 text-sand" />
              </div>
              <h2 className="mb-2 text-2xl font-medium text-parchment">Welcome to Polycrawl!</h2>

              <div className="mb-4 rounded-2xl border border-white/15 bg-[#121212] p-4 text-left">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-fog/70">
                  <span>MCP Endpoint</span>
                  <button onClick={copy} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-parchment transition hover:bg-white/10">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <a href={mcpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-mono text-xs text-sand hover:text-parchment">
                  {mcpUrl} <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="mb-6 rounded-2xl border border-sand/40 bg-sand/10 p-4 text-left">
                <p className="text-sand font-medium">How to fund your wallet (devnet):</p>
                <ol className="mt-2 list-decimal list-inside space-y-2 text-xs text-sand/90">
                  <li>Visit <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-sand">faucet.circle.com</a></li>
                  <li>Select <strong>USDC</strong> and <strong>Solana Devnet</strong></li>
                  <li>Copy your payer wallet address from Wallet → Add Funds → On-chain</li>
                  <li>Request tokens (10 USDC per hour) and airdrop SOL for fees</li>
                </ol>
                <p className="mt-3 text-[11px] text-sand/80">Tip: balances update after Solana confirmation (~1 min).</p>
              </div>

              <Button onClick={() => { onClose(); navigate('/app'); }} className="w-full bg-[#cfbea0] text-black hover:bg-[#cfbea0]">
                Thanks :) <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
