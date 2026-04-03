"use client";

import { motion } from "framer-motion";
import { Sparkles, BookMarked, FileDown, Languages, Zap, FolderOpen, Settings, Download, PenTool, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeaturePublic } from "@/lib/features";

const sidebarItems = [
  { icon: FolderOpen, label: "Meus Projectos", active: true },
  { icon: PenTool, label: "Editor" },
  { icon: Layout, label: "Estrutura" },
  { icon: BookMarked, label: "Referências" },
  { icon: Settings, label: "Configurações" },
];

interface FloatingBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function FloatingBadge({ icon: Icon, label }: FloatingBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

export function ProductMockup() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-3xl scale-95"
      />
      
      {/* Main mockup window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden"
      >
        {/* Window header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3, type: "spring" }}
                className="w-3 h-3 rounded-full bg-red-500/80"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.55, duration: 0.3, type: "spring" }}
                className="w-3 h-3 rounded-full bg-yellow-500/80"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.3, type: "spring" }}
                className="w-3 h-3 rounded-full bg-green-500/80"
              />
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground sm:flex">
            <span>Monografia - Direito Económico</span>
          </div>
          <div className="flex items-center gap-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>247 créditos</span>
            </motion.div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden md:flex flex-col w-48 border-r border-border/50 bg-muted/20 p-3 gap-1">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200",
                    item.active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Editor area */}
          <div className="flex-1 p-4 md:p-6 min-h-[320px]">
            <div className="space-y-4">
              {/* Document header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  1. Introdução
                </h3>
                <p className="text-xs text-muted-foreground">
                  Capítulo 1 • 3 páginas • 12 referências
                </p>
              </motion.div>

              {/* Content blocks */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    O regime jurídico do investimento estrangeiro em Moçambique tem sido objecto de 
                    diversas reformas legislativas nas últimas décadas. O presente trabalho analisa 
                    a evolução do <span className="bg-primary/20 text-primary font-medium px-1 rounded">Decreto-Lei n.º 43/2009</span>...
                  </p>
                </div>

                {/* AI Suggestion with pulse effect */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 relative"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </motion.div>
                    <span>Sugestão da IA</span>
                  </div>
                  <p className="text-sm text-foreground/80">
                    &quot;...estabelecendo um paralelo com os regimes de investimento em Angola e Brasil, 
                    considerando as especificidades do contexto moçambicano.&quot;
                  </p>
                  <div className="flex gap-2 mt-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors relative"
                    >
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-lg bg-primary-foreground/20"
                      />
                      <span className="relative">Aceitar</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                    >
                      Regenerar
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Progress indicator with animation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex items-center gap-3 pt-2"
              >
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  />
                </div>
                <span className="text-xs text-muted-foreground">60% completo</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col gap-2 border-t border-border/50 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5" />
              Melhorar texto
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <BookMarked className="w-3.5 h-3.5" />
              Adicionar referência
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar DOCX
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Floating badges with premium animations */}
      <motion.div
        className="absolute right-3 top-3 md:-right-8 md:-top-4"
        initial={{ opacity: 0, scale: 0, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 1.2, duration: 0.6, type: "spring", stiffness: 200 }}
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="cursor-pointer rounded-xl border border-border/50 bg-card/90 bg-blue-500/10 px-3 py-2 text-blue-600 shadow-lg backdrop-blur-xl"
        >
          <FloatingBadge icon={Languages} label="PT-MZ Académico" />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute left-3 top-[26%] md:-left-6 md:top-1/3"
        initial={{ opacity: 0, scale: 0, x: -30, rotate: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
        transition={{ delay: 1.4, duration: 0.6, type: "spring", stiffness: 200 }}
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="cursor-pointer rounded-xl border border-border/50 bg-card/90 bg-emerald-500/10 px-3 py-2 text-emerald-600 shadow-lg backdrop-blur-xl"
        >
          <FloatingBadge icon={BookMarked} label="ABNT Ready" />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-20 right-3 md:bottom-8 md:-right-6"
        initial={{ opacity: 0, scale: 0, y: 30, rotate: -15 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        transition={{ delay: 1.6, duration: 0.6, type: "spring", stiffness: 200 }}
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="cursor-pointer rounded-xl border border-border/50 bg-card/90 bg-purple-500/10 px-3 py-2 text-purple-600 shadow-lg backdrop-blur-xl"
        >
          <FloatingBadge icon={FileDown} label="DOCX Export" />
        </motion.div>
      </motion.div>

      {isFeaturePublic("realTimeStreaming") ? (
        <motion.div
          className="absolute bottom-[30%] left-3 md:bottom-1/4 md:-left-8"
          initial={{ opacity: 0, scale: 0, x: -30, rotate: 15 }}
          animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
          transition={{ delay: 1.8, duration: 0.6, type: "spring", stiffness: 200 }}
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="cursor-pointer rounded-xl border border-border/50 bg-card/90 bg-rose-500/10 px-3 py-2 text-rose-600 shadow-lg backdrop-blur-xl"
          >
            <FloatingBadge icon={Zap} label="Streaming AI" />
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}
