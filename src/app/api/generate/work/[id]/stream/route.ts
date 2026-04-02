import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";

const POLL_INTERVAL_MS = 500;
const MAX_DURATION_MS = 120_000;

interface SSEEvent {
  type: "progress" | "complete" | "error";
  data: {
    progress: number;
    step: string;
    error?: string;
  };
}

function createSSEMessage(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return new Response("Trabalho não encontrado", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastProgress = -1;
      const encoder = new TextEncoder();

      const send = (event: SSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(createSSEMessage(event)));
        } catch {
          closed = true;
        }
      };

      const check = async () => {
        try {
          const status = await getWorkGenerationStatusAsync(id);

          if (!status) {
            send({
              type: "error",
              data: { progress: 0, step: "Estado de geração não encontrado" },
            });
            cleanup();
            return;
          }

          if (status.progress !== lastProgress) {
            lastProgress = status.progress;
            send({
              type: "progress",
              data: { progress: status.progress, step: status.step },
            });
          }

          if (status.status === "READY") {
            send({
              type: "complete",
              data: { progress: 100, step: "Trabalho pronto para revisão" },
            });
            cleanup();
            return;
          }

          if (status.status === "FAILED") {
            send({
              type: "error",
              data: {
                progress: status.progress,
                step: status.step,
                error: status.error,
              },
            });
            cleanup();
            return;
          }
        } catch {
          send({
            type: "error",
            data: { progress: lastProgress || 0, step: "Erro ao verificar estado" },
          });
          cleanup();
        }
      };

      const intervalId = setInterval(check, POLL_INTERVAL_MS);

      const timeoutId = setTimeout(() => {
        send({
          type: "error",
          data: { progress: lastProgress || 0, step: "Timeout de stream" },
        });
        cleanup();
      }, MAX_DURATION_MS);

      const cleanup = () => {
        closed = true;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Initial check
      void check();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
