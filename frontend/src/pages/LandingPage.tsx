import { Navbar } from '../components/landing/Navbar'
import { HeroSection } from '../components/landing/HeroSection'
import { SocialProofBand } from '../components/landing/SocialProofBand'
import { WorkflowSection } from '../components/landing/WorkflowSection'
import { FeatureShowcase } from '../components/landing/FeatureShowcase'
import { InteractiveSimulator } from '../components/landing/InteractiveSimulator'
import { RoiCalculator } from '../components/landing/RoiCalculator'
import { ArchitectureSection } from '../components/landing/ArchitectureSection'
import { PricingSection } from '../components/landing/PricingSection'
import { FaqSection } from '../components/landing/FaqSection'
import { CtaBanner } from '../components/landing/CtaBanner'
import { Footer } from '../components/landing/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#0a0a0a] selection:bg-[#0a0a0a] selection:text-[#ffffff]">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofBand />
        <WorkflowSection />
        <FeatureShowcase />
        <InteractiveSimulator />
        <RoiCalculator />
        <ArchitectureSection />
        <PricingSection />
        <FaqSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
