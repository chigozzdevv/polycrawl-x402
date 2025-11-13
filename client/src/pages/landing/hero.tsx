import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-medium leading-[1.1] tracking-tight md:text-6xl"
      >
        The gateway between
        <br />
        <span className="text-sand">AI agents and protected IPs</span>
      </motion.h1>

      <p className="mt-5 hidden text-base text-fog md:block md:text-xl">
        Polycrawl is an MCP gateway that lets AI agents fetch data behind paywalls, logins, or anti-bot systems — legally and fairly — powered by TAP message signatures and X402 payments on Solana USDC.
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          className="group h-11 gap-2 bg-[#cfbea0] px-6 text-black hover:bg-[#cfbea0] hover:text-black"
          onClick={() => { window.location.href = '/get-started' }}
        >
          Start a Crawl <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:scale-110" />
        </Button>
        <Button variant="ghost" className="h-11 gap-2 px-6" onClick={() => setDemoOpen(true)}>
          Watch Demo <Play className="h-4 w-4" />
        </Button>
      </div>

      <Modal open={demoOpen} title="Watch demo" onClose={() => setDemoOpen(false)}>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 h-full w-full rounded-xl"
            src="https://www.youtube.com/embed/kCZEhzAP35I"
            title="Polycrawl MCP Demo | Solana x402 Hackerthon Submission"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </Modal>
    </div>
  )
}
