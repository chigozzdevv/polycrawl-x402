import { motion } from 'framer-motion'
import { Shield, Zap, Link } from 'lucide-react'

const solutions = [
  {
    icon: Shield,
    title: 'Consent-first architecture',
    description: 'Scoped tokens and per-request permissions ensure agents only access what they paid for',
  },
  {
    icon: Zap,
    title: 'Instant micropayments',
    description: 'X402 protocol settles USDC on-chain with cryptographic receipts—pay and get proof instantly',
  },
  {
    icon: Link,
    title: 'Standardized agent access',
    description: 'MCP protocol eliminates API key sprawl and enables secure, permissioned discovery',
  },
]

export function WhyPolycrawl() {
  return (
    <section className="mt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
          The Solution? Meet <span className="text-sand">Polycrawl</span>
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {solutions.map((solution, index) => {
          const Icon = solution.icon
          return (
            <motion.div
              key={solution.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group rounded-2xl border border-white/10 bg-[#111111]/50 p-6 transition-all hover:border-sand/20"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-sand/10 transition-all group-hover:bg-sand/20">
                <Icon className="h-6 w-6 text-sand" />
              </div>
              <h3 className="text-lg font-semibold text-parchment">{solution.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{solution.description}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
