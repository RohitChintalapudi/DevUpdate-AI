import { useEffect } from 'react'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import MetricsGrid from '../components/landing/MetricsGrid'
import ProblemSection from '../components/landing/ProblemSection'
import SolutionSection from '../components/landing/SolutionSection'
import WorkspaceBanner from '../components/landing/WorkspaceBanner'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import SplitWorkflow from '../components/landing/SplitWorkflow'
import FeatureTiles from '../components/landing/FeatureTiles'
import TechnologySection from '../components/landing/TechnologySection'
import SupportedEcosystems from '../components/landing/SupportedEcosystems'
import IntegrationSpotlight from '../components/landing/IntegrationSpotlight'
import WhyDevUpdate from '../components/landing/WhyDevUpdate'
import BuiltForDevelopers from '../components/landing/BuiltForDevelopers'
import SecurityAndTrust from '../components/landing/SecurityAndTrust'
import FullDashboardShowcase from '../components/landing/FullDashboardShowcase'
import FinalCTA from '../components/landing/FinalCTA'
import FaqSection from '../components/landing/FaqSection'
import Footer from '../components/landing/Footer'

export default function Landing() {
  // Ensure the body background is crisp solid white on the landing page,
  // preventing any dark canvas bleed-through
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor
    const prevColor = document.body.style.color
    document.body.style.backgroundColor = '#FFFFFF'
    document.body.style.color = '#0F172A'

    return () => {
      document.body.style.backgroundColor = prevBg
      document.body.style.color = prevColor
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white font-sans antialiased">
      {/* 1. Navigation */}
      <Navbar />

      <main className="bg-white">
        {/* 2. Hero Section (Concentric Orbits, Official devicons-react logos & Social Proof) */}
        <Hero />

        {/* Visual Metric Pillars (Simplify dependency management for modern teams) */}
        <MetricsGrid />

        {/* 3. Problem Section */}
        <ProblemSection />

        {/* 4. Solution Section (From Dependency Detection to Intelligent Upgrade Decisions) */}
        <SolutionSection />

        {/* Visual All-in-One Workspace Banner */}
        <WorkspaceBanner />

        {/* 5. Core Features (8 Capabilities: 01 to 08) */}
        <Features />

        {/* 6. How It Works (6 Steps: 01 to 06) */}
        <HowItWorks />

        {/* Visual Workflow Split: Manage updates faster with your team */}
        <SplitWorkflow />

        {/* Visual Integration Tiles: Plan upgrades and track dependencies effortlessly */}
        <FeatureTiles />

        {/* 8. Technology Section (A Powerful Technology Stack Behind Intelligent Development) */}
        <TechnologySection />

        {/* 9. Supported Ecosystems (Multi-Ecosystem Support with official devicons) */}
        <SupportedEcosystems />

        {/* Visual Collaboration Spotlight: Organize work and boost team productivity */}
        <IntegrationSpotlight />

        {/* 10. Why DevUpdate AI? (The Difference: Traditional vs DevUpdate AI) */}
        <WhyDevUpdate />

        {/* 11. Built for Developers (Who Is It For? - 5 Personas) */}
        <BuiltForDevelopers />

        {/* 12. Security & Trust (Built With Responsibility - 8 Security Principles) */}
        <SecurityAndTrust />

        {/* Visual Wide Mockup: Smart dependency intelligence for growing teams */}
        <FullDashboardShowcase />

        {/* 13. Final CTA (Your Dependencies Are Changing. Stay Ahead.) */}
        <FinalCTA />

        {/* 14. FAQ Section (11 Comprehensive Questions & Answers) */}
        <FaqSection />
      </main>

      {/* 15. Footer (4 Columns + Legal + Copyright) */}
      <Footer />
    </div>
  )
}
