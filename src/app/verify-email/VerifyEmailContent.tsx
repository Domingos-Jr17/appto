"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function VerifyEmailContent() {
  const t = useTranslations("verifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const verify = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || t("errorDescription"));
          return;
        }

        setStatus("success");
        setMessage(t("successDescription"));

        redirectTimer = setTimeout(() => {
          router.push("/app");
          router.refresh();
        }, 3000);
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage(t("errorDescription"));
      }
    };

    void verify();

    return () => {
      cancelled = true;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [token, router, t]);

  // Derive error state from missing token without setState in effect
  if (!token) {
    return (
      <>
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">{t("error")}</h1>
        <p className="mt-2 text-muted-foreground text-sm">{t("invalidLink")}</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToLogin")}
          </Link>
        </Button>
      </>
    );
  }

  if (status === "loading") {
    return (
      <>
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground text-sm">{t("description")}</p>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-2xl font-bold">{t("success")}</h1>
        <p className="mt-2 text-muted-foreground text-sm">{message}</p>
      </>
    );
  }

  return (
    <>
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">{t("error")}</h1>
      <p className="mt-2 text-muted-foreground text-sm">{message}</p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/login">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToLogin")}
        </Link>
      </Button>
    </>
  );
}
