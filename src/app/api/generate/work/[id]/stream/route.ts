import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";

const POLL_INTERVAL_MS = 500;
const MAX_DURATION_MS = 300_000; // 5 minutes
const RETRY_MS = 3000;

interface SSEEvent {
  type: "handshake" | "job-created" | "section-started" | "section-complete" | "progress" | "complete" | "error";
  data: {
    progress: number;
    step: string;
    sectionTitle?: string;
    error?: string;
  };
}

function createSSEMessage(event: SSEEvent, id?: string): string {
  const idLine = id ? `id: ${id}\n` : "";
  return `${idLine}retry: ${RETRY_MS}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
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
    async start(controller) {
      let closed = false;
      let lastProgress = -1;
      let lastStep = "";
      let eventCounter = 0;
      const encoder = new TextEncoder();

      const send = (event: SSEEvent) => {
        if (closed) return;
        try {
          const eventId = `evt-${eventCounter++}`;
          controller.enqueue(encoder.encode(createSSEMessage(event, eventId)));
        } catch {
          closed = true;
        }
      };

      // Send initial handshake
      send({
        type: "handshake",
        data: { progress: 0, step: "Conectado ao stream de geração" },
      });

      // Check initial job status
      const initialStatus = await getWorkGenerationStatusAsync(id);
      if (initialStatus) {
        send({
          type: "job-created",
          data: { progress: initialStatus.progress, step: initialStatus.step },
        });
      }

      let lastSectionTitle: string | undefined;

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

          // Detect section transitions from step text
          const stepMatch = status.step.match(/A gerar\s+(.+)/i);
          const currentSectionTitle = stepMatch ? stepMatch[1]?.trim() : undefined;

          if (status.progress !== lastProgress || status.step !== lastStep) {
            lastProgress = status.progress;
            lastStep = status.step;

            // Detect section start (new section title we haven't seen yet)
            if (currentSectionTitle && currentSectionTitle !== lastSectionTitle) {
              lastSectionTitle = currentSectionTitle;
              send({
                type: "section-started",
                data: {
                  progress: status.progress,
                  step: status.step,
                  sectionTitle: currentSectionTitle,
                },
              });
            } else {
              send({
                type: "progress",
                data: { progress: status.progress, step: status.step },
              });
            }
          }

          // Detect section completion (progress changed but section title didn't change = previous section done)
          if (currentSectionTitle && lastSectionTitle && currentSectionTitle !== lastSectionTitle) {
            send({
              type: "section-complete",
              data: {
                progress: status.progress,
                step: status.step,
                sectionTitle: lastSectionTitle,
              },
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
