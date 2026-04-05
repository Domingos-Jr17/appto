"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { faqs } from "./data";
import { Reveal } from "./animations";
import { cn } from "@/lib/utils";

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-border/50 last:border-0"
    >
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-medium text-base text-foreground group-hover:text-primary transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            isOpen ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-muted-foreground leading-relaxed pr-12">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-xl border border-primary/10 text-primary text-sm font-medium mb-4 shadow-lg shadow-primary/5">
                <HelpCircle className="w-3.5 h-3.5" />
                Perguntas Frequentes
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Tira as tuas <span className="text-primary">dúvidas</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Encontra respostas para as perguntas mais comuns sobre o aptto.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="p-6 md:p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl">
                {faqs.map((faq, index) => (
                  <FAQItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openIndex === index}
                    onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                    index={index}
                  />
                ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
              <p className="text-center text-muted-foreground mt-8">
                Ainda tens dúvidas?{" "}
                <a href="mailto:ola@aptto.co.mz" className="text-primary hover:underline font-medium">
                  Fale connosco
                </a>
              </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
