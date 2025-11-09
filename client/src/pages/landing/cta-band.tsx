import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CtaBand() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mt-20"
    >
      <div className="rounded-2xl border border-sand/20 bg-gradient-to-br from-sand/5 to-transparent p-10 text-center md:p-16">
        <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
          Ready to join the AI economy?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-fog">
          Whether you're building AI agents or monetizing content, Polycrawl provides the infrastructure you need.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="group h-12 gap-2 bg-[#cfbea0] px-8 text-black hover:bg-[#cfbea0] hover:text-black">
            Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:scale-110" />
          </Button>
          <Button variant="ghost" className="h-12 border border-white/10 px-8">
            Read Docs
          </Button>
        </div>
      </div>
    </motion.section>
  )
}
