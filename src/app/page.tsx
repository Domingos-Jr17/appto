"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import {
  Header,
  HeroSection,
  FeaturesGrid,
  DemoLeadMagnet,
  PricingCards,
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

      <Header />
      <HeroSection />
      <DemoLeadMagnet />
      <FeaturesGrid />
      <PricingCards />
      <FAQSection />
      <FinalCTA />
      <Footer className="mt-auto" />
    </main>
  );
}
