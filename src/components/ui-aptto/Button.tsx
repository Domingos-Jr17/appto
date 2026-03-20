"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary: [
    "bg-primary text-primary-foreground",
    "hover:bg-primary/90",
    "shadow-lg shadow-primary/20",
    "hover:shadow-xl hover:shadow-primary/30",
    "active:scale-[0.98]",
  ].join(" "),
  secondary: [
    "bg-secondary text-secondary-foreground",
    "hover:bg-secondary/80",
    "border border-border/50",
    "hover:border-primary/20",
    "hover:shadow-lg hover:shadow-primary/5",
  ].join(" "),
  ghost: [
    "bg-transparent text-foreground",
    "hover:bg-accent hover:text-accent-foreground",
    "hover:shadow-none",
  ].join(" "),
  outline: [
    "bg-transparent text-foreground",
    "border border-border",
    "hover:bg-accent hover:border-primary/30",
    "hover:text-primary",
    "hover:shadow-lg hover:shadow-primary/10",
  ].join(" "),
};

const sizeClasses = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
