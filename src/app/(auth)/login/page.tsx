"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function getLoginErrorMessage(error?: string) {
  switch (error) {
    case "CredentialsSignin":
      return "Email ou palavra-passe incorretos";
    case "TwoFactorRequired":
      return "Introduza o código do autenticador para concluir o login.";
    case "InvalidTwoFactorCode":
      return "O código 2FA introduzido é inválido.";
    case "Configuration":
      return "A autenticação não está configurada corretamente no servidor.";
    default:
      return "Ocorreu um erro. Tente novamente.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { data: _session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [hasGoogleProvider, setHasGoogleProvider] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const timer = setTimeout(() => {
        window.location.href = "/app";
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    let active = true;

    getProviders()
      .then((providers) => {
        if (!active) return;
        setHasGoogleProvider(Boolean(providers?.google));
      })
      .catch(() => {
        if (!active) return;
        setHasGoogleProvider(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        otpCode: otpCode.trim() || undefined,
        redirect: false,
        callbackUrl: "/app",
      });

      if (result?.error) {
        if (result.error === "TwoFactorRequired") {
          setOtpRequired(true);
        }
        setError(getLoginErrorMessage(result.error));
        setIsLoading(false);
        return;
      }

      // Success - redirect to app
      router.push("/app");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(getLoginErrorMessage(err.message));
      } else {
        setError("Ocorreu um erro. Tente novamente.");
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/app" });
  };

  if (status === "loading") {
    return (
      <div className="glass glass-border rounded-[28px] p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 flex items-center justify-center min-h-[400px]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="glass glass-border rounded-[28px] p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo de volta</h1>
        <p className="text-muted-foreground text-sm">
          Acede à tua conta para continuares
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Palavra-passe</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Esqueceste a palavra-passe?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {otpRequired && (
          <div className="space-y-2">
            <Label htmlFor="otp-code">Código 2FA</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="otp-code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                required={otpRequired}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usa o código de 6 dígitos do autenticador associado à tua conta.
            </p>
          </div>
        )}

        {/* Login Button */}
        <Button
          type="submit"
          className="w-full h-11 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 group"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              Entrar
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {hasGoogleProvider && (
        <>
          {/* Divider */}
          <div className="relative my-6">
            <Separator className="bg-border/50" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              ou continue com
            </span>
          </div>

          {/* Social Login */}
          <Button
            variant="outline"
            className="w-full h-11 font-medium bg-background/50 border-border/50 hover:bg-muted/50 transition-all duration-300"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>
        </>
      )}

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Não tens conta?{" "}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
