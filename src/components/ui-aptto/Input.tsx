"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, type, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground/80"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-200 ease-out",
              "hover:border-border/80 hover:bg-input/80",
              "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-input",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "shadow-sm",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
              {rightIcon}
            </div>
          )}
          {/* Subtle glow effect on focus */}
          <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-200">
            <div className="absolute inset-0 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.15)]" />
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
