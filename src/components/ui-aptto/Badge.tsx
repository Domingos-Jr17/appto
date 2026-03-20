"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const variantClasses = {
  default: [
    "bg-muted text-muted-foreground",
    "border-border/50",
  ].join(" "),
  primary: [
    "bg-primary/15 text-primary",
    "border-primary/30",
  ].join(" "),
  success: [
    "bg-[oklch(0.65_0.18_145/0.15)] text-[oklch(0.7_0.16_145)]",
    "border-[oklch(0.65_0.18_145/0.30)]",
  ].join(" "),
  warning: [
    "bg-[oklch(0.75_0.15_85/0.15)] text-[oklch(0.8_0.12_85)]",
    "border-[oklch(0.75_0.15_85/0.30)]",
  ].join(" "),
  error: [
    "bg-[oklch(0.6_0.2_25/0.15)] text-[oklch(0.65_0.18_25)]",
    "border-[oklch(0.6_0.2_25/0.30)]",
  ].join(" "),
  info: [
    "bg-[oklch(0.65_0.15_230/0.15)] text-[oklch(0.7_0.13_230)]",
    "border-[oklch(0.65_0.15_230/0.30)]",
  ].join(" "),
};

const dotColors = {
  default: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-[oklch(0.7_0.16_145)]",
  warning: "bg-[oklch(0.8_0.12_85)]",
  error: "bg-[oklch(0.65_0.18_25)]",
  info: "bg-[oklch(0.7_0.13_230)]",
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 rounded-md gap-1",
  md: "text-xs px-2.5 py-1 rounded-lg gap-1.5",
  lg: "text-sm px-3 py-1.5 rounded-xl gap-2",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium",
          "border",
          "transition-all duration-200",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "rounded-full animate-pulse",
              dotColors[variant],
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-2 w-2"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Academic status badges with predefined labels
interface StatusBadgeProps extends Omit<BadgeProps, 'children'> {
  status: "active" | "completed" | "pending" | "failed" | "enrolled" | "graduated" | "on-hold";
}

const statusConfig: Record<StatusBadgeProps["status"], { variant: BadgeProps["variant"]; label: string }> = {
  active: { variant: "primary", label: "Active" },
  completed: { variant: "success", label: "Completed" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "error", label: "Failed" },
  enrolled: { variant: "info", label: "Enrolled" },
  graduated: { variant: "success", label: "Graduated" },
  "on-hold": { variant: "default", label: "On Hold" },
};

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, dot = true, ...props }, ref) => {
    const { variant, label } = statusConfig[status];
    return (
      <Badge ref={ref} variant={variant} dot={dot} {...props}>
        {label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

export default Badge;
