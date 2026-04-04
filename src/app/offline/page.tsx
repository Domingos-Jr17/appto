import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Estás offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          O shell da app continua disponível, mas gerar conteúdo, pagar ou sincronizar dados exige ligação activa.
        </p>
      </div>
    </main>
  );
}
