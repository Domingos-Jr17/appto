"use client";

import { useState } from "react";
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      <div className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        {/* Success State */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("successTitle")}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t.rich("successMessage", {
              email,
              emailAddress: (chunks) => (
                <span className="text-foreground font-medium">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-xs mb-6">
            {t("helpText")}
          </p>
          <Button
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={() => setIsSubmitted(false)}
          >
            {t("tryAgain")}
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-8 shadow-2xl shadow-primary/5 gradient-glow-subtle animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 group"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              {t("sendResetLink")}
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Back to Login */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToLogin")}
      </Link>
    </div>
  );
}
