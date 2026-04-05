"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Link de verificação inválido");
      return;
    }

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

        setTimeout(() => {
          router.push("/app");
          router.refresh();
        }, 3000);
      } catch {
        setStatus("error");
        setMessage("Ocorreu um erro ao verificar o email");
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="rounded-[28px] bg-card border border-border/40 p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-bold">A verificar email...</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Estamos a verificar o teu email. Aguarda um momento.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-2xl font-bold">Email verificado!</h1>
            <p className="mt-2 text-muted-foreground text-sm">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold">Erro na verificação</h1>
            <p className="mt-2 text-muted-foreground text-sm">{message}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
