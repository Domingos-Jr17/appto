"use client";

import { motion } from "framer-motion";
import { Sparkles, Linkedin, Twitter, Instagram, Facebook, Mail } from "lucide-react";
import { footerLinks } from "./data";

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
};

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`relative pt-10 pb-6 overflow-hidden border-t border-border/50 ${className || ''}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-muted/20" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8 mb-8">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                apt<span className="text-primary">to</span>
              </span>
            </a>
            <p className="text-muted-foreground max-w-xs text-sm">
              O copiloto académico inteligente feito para estudantes moçambicanos. 
              Escreva melhor, estruture com rigor, submeta com confiança.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} aptto. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-2">
            <motion.a
              href="mailto:ola@aptto.co.mz"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </motion.a>

            {/* Social links */}
            {footerLinks.social.map((social, index) => {
              const Icon = socialIcons[social.icon] || Twitter;
              return (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={social.label}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
