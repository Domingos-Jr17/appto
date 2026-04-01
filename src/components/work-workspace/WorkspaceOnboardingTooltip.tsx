"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "aptto-workspace-onboarding-dismissed";

export function WorkspaceOnboardingTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="mx-4 mb-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Primeira vez aqui?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usa o painel de IA para pedir ao assistente que escreva ou melhore secções do trabalho.
                Começa por seleccionar uma secção na estrutura e clica em &quot;Escrever com IA&quot;.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full"
              onClick={dismiss}
              aria-label="Fechar dica"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
