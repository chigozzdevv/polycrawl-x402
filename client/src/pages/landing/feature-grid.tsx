import type { ElementType } from 'react'
import { motion } from 'framer-motion'
import { Network, ShieldCheck, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: ShieldCheck,
    title: 'Authorized by design',
    description:
      'Issue time-boxed, scope-limited crawl tokens bound to domains, paths, or queries. Every request is signed and traceable.',
  },
  {
    icon: Network,
    title: 'Agent-first protocol',
    description:
      'First-class support for Model Context Protocol (MCP) so LLM agents can request capabilities without leaking secrets.',
  },
  {
    icon: Zap,
    title: 'Usage-based billing',
    description:
      'Fair, per-crawl metering with spending caps. Pay only for what you fetch with instant USDC settlement.',
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="mt-16 grid gap-5 md:mt-20 md:grid-cols-3">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <FeatureCard {...feature} />
        </motion.div>
      ))}
    </section>
  )
}

type FeatureCardProps = {
  icon: ElementType
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const Icon = icon
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between">
        <div className="flex items-start gap-4">
          <Icon className="h-6 w-6 flex-shrink-0 text-sand" />
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-fog">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
