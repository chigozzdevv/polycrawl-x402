import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
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
        Polycrawl is an MCP-native, pay-per-crawl infrastructure that lets AI agents fetch permissioned, verified data and licensed content with instant payouts to IP owners — powered by x402 and TAP.
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          className="group h-11 gap-2 bg-[#cfbea0] px-6 text-black hover:bg-[#cfbea0] hover:text-black"
          onClick={() => window.location.hash = '#auth'}
        >
          Start a Crawl <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:scale-110" />
        </Button>
        <Button variant="ghost" className="h-11 gap-2 px-6">
          Watch Demo <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
