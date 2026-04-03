"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui-aptto/ThemeToggle";
import { navigationLinks } from "./data";
import { cn } from "@/lib/utils";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";

    const focusFirstElement = window.setTimeout(() => {
      const dialog = mobileMenuRef.current;
      if (!dialog) return;

      const firstFocusable = dialog.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      firstFocusable?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusFirstElement);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = mobileMenuRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
          "w-[calc(100%-2rem)] max-w-5xl"
        )}
      >
        <div
          className={cn(
            "glass-header relative border border-border/60 rounded-2xl md:rounded-3xl transition-all duration-500",
            isScrolled
              ? "bg-background/88 shadow-lg shadow-black/10"
              : "bg-background/76 shadow-md shadow-black/5"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            {/* Logo */}
            <a
              href="#"
              className="flex items-center gap-2 group"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                apt<span className="text-primary">to</span>
              </span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="relative overflow-hidden rounded-2xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground group"
                >
                  <span className="relative z-10">{link.label}</span>
                  <div className="absolute inset-0 rounded-2xl border border-transparent bg-accent/40 opacity-0 transition-all duration-300 group-hover:border-primary/15 group-hover:opacity-100" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full group-hover:w-3/4 transition-all duration-300" />
                </button>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" className="rounded-2xl font-medium" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button
                className="rounded-2xl font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm shadow-primary/20"
                asChild
              >
                <Link href="/register">Começar Grátis</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle variant="button" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="h-11 w-11 rounded-2xl"
                aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="landing-mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
              <motion.div
                id="landing-mobile-menu"
                ref={mobileMenuRef}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="landing-mobile-menu-title"
                className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-border bg-background shadow-2xl"
              >
                <div className="flex flex-col h-full pt-20 pb-6 px-6">
                  <nav className="flex flex-col gap-2">
                    <p
                      id="landing-mobile-menu-title"
                      className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      Navegação
                    </p>
                    {navigationLinks.map((link, index) => (
                    <motion.button
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                      onClick={() => scrollToSection(link.href)}
                      className="w-full text-left px-4 py-3 text-lg font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-colors"
                    >
                      {link.label}
                    </motion.button>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-3">
                  <Button variant="outline" className="w-full rounded-xl font-medium py-6" asChild>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      Entrar
                    </Link>
                  </Button>
                  <Button
                    className="w-full rounded-xl font-medium py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    asChild
                  >
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      Começar Grátis
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
