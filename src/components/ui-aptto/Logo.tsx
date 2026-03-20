"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div className={cn("font-bold tracking-tight", sizeClasses[size], className)}>
      <span className="text-foreground">apt</span>
      <span className="text-primary">to</span>
    </div>
  );
}

export default Logo;
