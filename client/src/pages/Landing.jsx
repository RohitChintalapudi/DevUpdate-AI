import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import WhyDevUpdate from '../components/landing/WhyDevUpdate'
import TechEcosystem from '../components/landing/TechEcosystem'
import FinalCTA from '../components/landing/FinalCTA'
import Footer from '../components/landing/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <WhyDevUpdate />
        <TechEcosystem />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
