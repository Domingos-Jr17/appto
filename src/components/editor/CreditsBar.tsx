"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Coins,
  Zap,
  FileText,
  Clock,
  CheckCircle2,
  Cloud,
  CloudOff,
  Plus,
  AlertTriangle,
} from "lucide-react";

interface CreditsBarProps {
  currentCredits: number;
  maxCredits: number;
  wordCount: number;
  autoSaveStatus: "saving" | "saved" | "error" | "idle";
  lastSaved?: Date;
  onBuyCredits?: () => void;
}

export function CreditsBar({
  currentCredits,
  maxCredits,
  wordCount,
  autoSaveStatus,
  lastSaved,
  onBuyCredits,
}: CreditsBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const creditPercentage = (currentCredits / maxCredits) * 100;
  const isLowCredits = creditPercentage < 20;

  const formatLastSaved = (date?: Date) => {
    if (!date) return "Nunca";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 10) return "Agora";
    if (diffInSeconds < 60) return `${diffInSeconds}s atrás`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min atrás`;
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = () => {
    switch (autoSaveStatus) {
      case "saving":
        return (
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Cloud className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-xs">Salvando...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center gap-1.5 text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs">Salvo</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-1.5 text-red-400">
            <CloudOff className="h-3.5 w-3.5" />
            <span className="text-xs">Erro ao salvar</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{formatLastSaved(lastSaved)}</span>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-background/80 backdrop-blur-xl">
      {/* Left section - Credits */}
      <div
        className="flex items-center gap-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3">
                {/* Credit Icon */}
                <div
                  className={cn(
                    "relative p-2 rounded-lg transition-all duration-300",
                    isLowCredits
                      ? "bg-red-500/20 animate-pulse"
                      : "bg-primary/10",
                    isHovered && !isLowCredits && "glow-primary"
                  )}
                >
                  <Coins
                    className={cn(
                      "h-4 w-4",
                      isLowCredits ? "text-red-400" : "text-primary"
                    )}
                  />
                  {isLowCredits && (
                    <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-red-400" />
                  )}
                </div>

                {/* Credit Info */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">
                      {currentCredits}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {maxCredits} créditos
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-32 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isLowCredits
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-primary to-primary/70"
                      )}
                      style={{ width: `${creditPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>
                {isLowCredits
                  ? "Créditos baixos! Considere comprar mais."
                  : "Créditos para usar a IA"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Buy More Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBuyCredits}
          className={cn(
            "gap-1.5 h-8 text-xs border-dashed transition-all duration-300",
            isLowCredits
              ? "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              : "border-primary/30 hover:border-primary hover:bg-primary/5"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Comprar
        </Button>
      </div>

      {/* Center section - Usage indicators */}
      <div className="hidden md:flex items-center gap-6 text-muted-foreground">
        {/* Word Count */}
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-foreground">
              {wordCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-xs">palavras</span>
          </div>
        </div>

        {/* AI Usage Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs">IA ativa</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Funcionalidades de IA disponíveis</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right section - Auto-save status */}
      <div className="flex items-center gap-4">
        {getStatusIcon()}
      </div>
    </div>
  );
}
