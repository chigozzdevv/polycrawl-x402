import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink, ArrowRight } from 'lucide-react'

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

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl font-medium tracking-tight md:text-5xl">
          Hello, welcome to Polycrawl!
        </motion.h1>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/12 bg-[#111111]/85 p-6 text-left">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-fog/70">
            <span>MCP Endpoint</span>
            <button onClick={onCopy} className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-parchment transition hover:bg-white/10">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a href={mcpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-mono text-sm text-sand hover:text-parchment">
            {mcpUrl} <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <p className="mt-6 text-sm text-fog">
          Don&apos;t have an account yet?{' '}
          <a href="/auth" className="font-medium text-sand underline">Create one</a> to get OAuth credentials and start crawling.
        </p>

        <div className="mt-8">
          <Button onClick={() => (window.location.href = '/')} className="gap-2">
            Back to Home <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
