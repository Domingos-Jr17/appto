"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "Link de verificação inválido",
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Link de verificação inválido");
      return;
    }

    setStatus("loading");
    setMessage("");

    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const verify = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "Erro ao verificar email");
          return;
        }

        setStatus("success");
        setMessage("Email verificado com sucesso! A redirecionar...");

        redirectTimer = setTimeout(() => {
          router.push("/app");
          router.refresh();
        }, 3000);
      } catch {
        setStatus("error");
        setMessage("Ocorreu um erro ao verificar o email");
      }
    };

    void verify();

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [token, router]);

  if (status === "loading") {
    return (
      <>
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h1 className="mt-4 text-2xl font-bold">A verificar email...</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Estamos a verificar o teu email. Aguarda um momento.
        </p>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Email verificado!</h1>
        <p className="mt-2 text-muted-foreground text-sm">{message}</p>
      </>
    );
  }

  return (
    <>
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Erro na verificação</h1>
      <p className="mt-2 text-muted-foreground text-sm">{message}</p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/login">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Link>
      </Button>
    </>
  );
}
