import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Copy, Check, ArrowRight, Zap, Key, Play } from 'lucide-react'

export function GetStartedPage() {
  const mcpUrl = 'https://api.polycrawl.com/mcp'
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(mcpUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <div className="relative min-h-screen w-full bg-ink text-parchment">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(216,200,168,0.12),_transparent_55%)] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(224,117,85,0.08),_transparent_60%)] blur-[140px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Get Started with Polycrawl
          </h1>
          <p className="mt-4 text-base text-fog md:text-lg">
            Connect your AI agent to Polycrawl&apos;s MCP server in three simple steps
          </p>
        </motion.div>

        <div className="mx-auto mt-12 max-w-3xl space-y-6">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-white/12 bg-[#111111]/85 p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/20 text-sand">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium">Step 1: Copy MCP Endpoint</h3>
                <p className="mt-2 text-sm text-fog">
                  Use this endpoint URL to connect your AI agent to Polycrawl&apos;s MCP server
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-fog/70">Endpoint URL</span>
                    <button
                      onClick={onCopy}
                      className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-parchment transition hover:bg-white/10"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="break-all font-mono text-sm text-sand">{mcpUrl}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-white/12 bg-[#111111]/85 p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/20 text-sand">
                <Key className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium">Step 2: Create an Account</h3>
                <p className="mt-2 text-sm text-fog">
                  Sign up to access the dashboard and monitor your crawling activities, fund your payer wallet, and manage resources
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => window.location.href = '/auth'}
                    className="gap-2 bg-[#cfbea0] text-black hover:bg-[#cfbea0]"
                  >
                    Create Account <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-white/12 bg-[#111111]/85 p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/20 text-sand">
                <Play className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium">Step 3: Start Crawling</h3>
                <p className="mt-2 text-sm text-fog">
                  Configure your AI agent with the MCP endpoint and credentials, then start making requests
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-fog">
                    Your agent can now access permissioned data with automatic micropayments via x402
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="gap-2 border border-white/12 hover:bg-white/5"
          >
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  )
}
