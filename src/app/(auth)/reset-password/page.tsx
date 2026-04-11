"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const passwordError = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return t("passwordMinLength");
    if (confirmPassword && confirmPassword !== password) {
      return t("passwordsDontMatch");
    }
    return "";
  }, [confirmPassword, password, t]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(t("invalidLink"));
      return;
    }

    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errorGeneric"));
      }

      setIsSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("errorGeneric")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">{t("successTitle")}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("successDescription")}
          </p>
          <Button asChild className="w-full">
            <Link href="/login">{t("goToLogin")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-background/50 pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 bg-background/50 pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={isLoading || !token}>
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <>
              {t("reset")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToLogin")}
      </Link>
    </div>
  );
}
