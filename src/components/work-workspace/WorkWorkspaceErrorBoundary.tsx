"use client";

import { Component, type ReactNode } from "react";

interface WorkWorkspaceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface WorkWorkspaceErrorBoundaryState {
  hasError: boolean;
}

export class WorkWorkspaceErrorBoundary extends Component<
  WorkWorkspaceErrorBoundaryProps,
  WorkWorkspaceErrorBoundaryState
> {
  state: WorkWorkspaceErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WorkWorkspaceErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Workspace panel error${this.props.label ? ` [${this.props.label}]` : ""}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm font-medium text-destructive">Algo correu mal</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tente recarregar a pagina.
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
