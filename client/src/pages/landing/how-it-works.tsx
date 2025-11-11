import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Bot, Wallet } from 'lucide-react'

const agentSteps = [
  {
    number: '01',
    title: 'Connect via MCP',
    description: (
      <>
        AI agents discover resources using Model Context Protocol at{' '}
        <a href="https://api.polycrawl.com/mcp" target="_blank" rel="noopener noreferrer" className="font-medium text-sand underline">https://api.polycrawl.com/mcp</a> with OAuth 2.0 authentication
      </>
    ),
  },
  {
    number: '02',
    title: 'Search & Select',
    description: 'Query the marketplace for licensed content using natural language search with ranked results',
  },
  {
    number: '03',
    title: 'Pay & Fetch',
    description: 'Execute micropayment via X402 protocol and receive verified content with cryptographic receipt',
  },
]

const providerSteps = [
  {
    number: '01',
    title: 'List Your Resources',
    description: 'Add APIs, datasets, or content with flexible pricing (flat rate or per-KB metering)',
  },
  {
    number: '02',
    title: 'Verify Ownership',
    description: 'Prove domain ownership via DNS TXT record or file-based verification',
  },
  {
    number: '03',
    title: 'Earn Instantly',
    description: 'Receive USDC payouts on Solana immediately when agents access your resources',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="mt-20">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center text-3xl font-medium tracking-tight md:text-4xl"
      >
        How it works
      </motion.h2>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FlowCard title="For AI Agents" icon={Bot} steps={agentSteps} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <FlowCard title="For Providers" icon={Wallet} steps={providerSteps} />
        </motion.div>
      </div>
    </section>
  )
}

function FlowCard({
  title,
  icon: Icon,
  steps,
}: {
  title: string
  icon: React.ElementType
  steps: Array<{ number: string; title: string; description: React.ReactNode }>
}) {
  return (
    <Card className="border-white/10 bg-[#111111]/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sand/10">
            <Icon className="h-5 w-5 text-sand" />
          </div>
          <h3 className="text-xl font-medium">{title}</h3>
        </div>
        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <span className="text-2xl font-bold text-sand/40">{step.number}</span>
              <div>
                <h4 className="font-medium text-parchment">{step.title}</h4>
                <p className="mt-1 text-sm text-fog">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
