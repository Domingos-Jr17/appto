"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import {
  Header,
  HeroSection,
  SocialProof,
  TestimonialsCarousel,
  FeaturesGrid,
  HowItWorks,
  DifferentiatorsSection,
  PricingCards,
  DemoLeadMagnet,
  FAQSection,
  FinalCTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50 origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Header */}
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Social Proof Stats */}
      <SocialProof />

      {/* Features Grid */}
      <FeaturesGrid />

      {/* How It Works */}
      <HowItWorks />

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* Differentiators */}
      <DifferentiatorsSection />

      {/* Pricing */}
      <PricingCards />

      {/* Demo / Lead Magnet */}
      <DemoLeadMagnet />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <Footer className="mt-auto" />
    </main>
  );
}
