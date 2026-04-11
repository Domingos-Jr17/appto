"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showVerificationNote, setShowVerificationNote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordsDontMatch"));
      return;
    }
    if (!acceptTerms) {
      setError(t("mustAcceptTerms"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("errorCreating"));
        setIsLoading(false);
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Registration succeeded but login failed - redirect to login
        router.push("/login");
      } else {
        // Trigger verification email in background
        fetch("/api/auth/send-verification", { method: "POST" })
          .then((res) => res.json())
          .then(() => {
            toast({
              title: t("verificationEmailSent"),
              description: t("verificationEmailDescription", { email }),
            });
          })
          .catch(() => {});

        setShowVerificationNote(true);
        router.push("/app");
        router.refresh();
      }
    } catch {
      setError(t("errorGeneric"));
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const getStrengthColor = () => {
    const strength = passwordStrength();
    if (strength === 0) return "bg-muted";
    if (strength === 1) return "bg-red-500";
    if (strength === 2) return "bg-orange-500";
    if (strength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    const strength = passwordStrength();
    if (strength === 0) return "";
    if (strength === 1) return t("weak");
    if (strength === 2) return t("regular");
    if (strength === 3) return t("good");
    return t("strong");
  };

  return (
    <div className="rounded-[28px] bg-card border border-border/40 p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Verification Note */}
      {showVerificationNote && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm flex items-start gap-2">
          <Mail className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t.rich("verificationNote", {
              email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">{t("fullName")}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
            />
          </div>
        </div>

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

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {/* Password Strength */}
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i <= passwordStrength() ? getStrengthColor() : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("passwordStrength")}: <span className="font-medium">{getStrengthText()}</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">{t("passwordsDontMatch")}</p>
          )}
          {confirmPassword && password === confirmPassword && (
            <div className="flex items-center gap-1 text-xs text-success">
              <Check className="w-3 h-3" />
              <span>{t("passwordsMatch")}</span>
            </div>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
            {t.rich("acceptTerms", {
              termsLink: (chunks) => (
                <Link href="#" className="text-primary hover:text-primary/80 transition-colors">
                  {chunks}
                </Link>
              ),
              privacyLink: (chunks) => (
                <Link href="#" className="text-primary hover:text-primary/80 transition-colors">
                  {chunks}
                </Link>
              ),
              termsOfUse: t("termsOfUse"),
              privacyPolicy: t("privacyPolicy"),
            })}
          </Label>
        </div>

        {/* Register Button */}
        <Button
          type="submit"
          className="w-full h-11 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 group mt-6"
          disabled={isLoading || !acceptTerms}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              {t("createAccount")}
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
