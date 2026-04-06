"use client"

import { toast as sonnerToast } from "sonner"
import * as React from "react"

type ToastVariant = "default" | "destructive"

interface ToastOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
  action?: React.ReactNode
  id?: string | number
}

interface ToastReturn {
  id: string | number
  dismiss: () => void
  update: (opts: ToastOptions) => void
}

function toast(opts: ToastOptions): ToastReturn {
  const { title, description, variant, action, id } = opts

  const toastId = id ?? crypto.randomUUID()

  const dismiss = () => sonnerToast.dismiss(toastId)

  const update = (newOpts: ToastOptions) => {
    sonnerToast.dismiss(toastId)
    toast({ ...newOpts, id: toastId })
  }

  const isDestructive = variant === "destructive"

  sonnerToast(title as string, {
    id: toastId,
    description,
    action,
    duration: 5000,
    className: isDestructive ? "border-destructive" : undefined,
  })

  return { id: String(toastId), dismiss, update }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sonnerToast.dismiss(toastId)
    },
  }
}

export { useToast, toast }
