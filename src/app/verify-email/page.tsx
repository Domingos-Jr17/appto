import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyEmailContent } from "./VerifyEmailContent";

function VerifyEmailFallback() {
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

export default function VerifyEmailPage() {
  return (
    <div className="rounded-[28px] border border-border/40 bg-card p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <Suspense fallback={<VerifyEmailFallback />}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
