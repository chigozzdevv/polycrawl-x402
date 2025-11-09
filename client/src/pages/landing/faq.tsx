'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'What is MCP and why does it matter?',
    answer:
      'Model Context Protocol (MCP) is a standard that lets AI agents discover and request capabilities securely. Instead of managing countless API keys, agents can authenticate once via OAuth and discover available resources through a standardized protocol.',
  },
  {
    question: 'How does payment work?',
    answer:
      'We use the X402 protocol for instant micropayments. When an AI agent fetches content, payment is settled on-chain in USDC on Solana. You receive a cryptographically signed receipt with transaction proof immediately.',
  },
  {
    question: 'What are spending caps?',
    answer:
      'Polycrawl provides multi-level spending limits: global weekly caps, per-site daily caps, and per-mode caps. This ensures agents never overspend and gives you full control over your budget.',
  },
  {
    question: 'How do content providers get paid?',
    answer:
      'Providers receive instant USDC payouts to their Solana wallet when agents access their resources. Payments are split automatically: provider gets their share minus platform fees, with full transparency via cryptographic receipts.',
  },
  {
    question: 'What pricing models are supported?',
    answer:
      'Providers can choose between flat-rate pricing (fixed cost per fetch) or per-KB metered billing. You set your own rates and Polycrawl handles the metering, escrow, and settlement automatically.',
  },
  {
    question: 'How is this different from traditional APIs?',
    answer:
      'Traditional APIs require manual integration, API key management, and monthly billing. Polycrawl enables pay-per-use access with instant settlement, standardized discovery via MCP, and built-in authorization—no contracts or upfront commitments.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="mt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Frequently Asked Questions</h2>
        <p className="mt-3 text-base text-fog md:text-lg">Everything you need to know about Polycrawl</p>
      </motion.div>

      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <FAQItem
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111111]/50 transition-colors hover:border-white/20">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between p-6 text-left transition-colors"
      >
        <span className="pr-4 font-medium text-parchment">{question}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-sand transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-0 text-sm leading-relaxed text-fog">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
