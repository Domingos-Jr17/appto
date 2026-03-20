"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card" | "avatar";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "rectangular",
      width,
      height,
      animate = true,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      text: "rounded-md h-4",
      circular: "rounded-full",
      rectangular: "rounded-xl",
      card: "rounded-2xl h-32",
      avatar: "rounded-full h-10 w-10",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted/50",
          animate && "animate-shimmer",
          variantStyles[variant],
          className
        )}
        style={{
          width: width,
          height: height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Card skeleton for loading states
type SkeletonCardProps = React.HTMLAttributes<HTMLDivElement>;

export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border bg-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4 h-4" />
            <Skeleton variant="text" className="w-1/2 h-3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" className="w-full h-3" />
          <Skeleton variant="text" className="w-full h-3" />
          <Skeleton variant="text" className="w-4/5 h-3" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton variant="rectangular" className="h-8 w-20 rounded-lg" />
          <Skeleton variant="rectangular" className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

// Text skeleton for paragraphs
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 3, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={cn(
              "h-3",
              i === lines - 1 && "w-4/5"
            )}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = "SkeletonText";

// Avatar skeleton
interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const avatarSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        variant="circular"
        className={cn(avatarSizes[size], className)}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = "SkeletonAvatar";

// List skeleton for loading list items
interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number;
}

export const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ className, items = 5, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <SkeletonAvatar size="sm" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/3 h-3" />
              <Skeleton variant="text" className="w-1/2 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SkeletonList.displayName = "SkeletonList";

export default Skeleton;
