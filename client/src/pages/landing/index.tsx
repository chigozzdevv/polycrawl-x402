import { Hero } from './hero'
import { FeatureGrid } from './feature-grid'
import { TheProblem } from './the-problem'
import { HowItWorks } from './how-it-works'
import { CtaBand } from './cta-band'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { SectionDivider } from './section-divider'
import { WhyPolycrawl } from './why-polycrawl'
import { FAQ } from './faq'

export function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-ink text-parchment">
      {/* Minimal background gradient */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(216,200,168,0.12),_transparent_55%)] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(224,117,85,0.08),_transparent_60%)] blur-[140px]" />
      </div>

      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-6 md:pt-28">
        <Hero />
        <FeatureGrid />
        <SectionDivider />
        <TheProblem />
        <SectionDivider />
        <WhyPolycrawl />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <FAQ />
        <SectionDivider />
        <CtaBand />
      </main>
      <SiteFooter year={year} />
    </div>
  )
}
