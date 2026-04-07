import { AIRequestError } from "@/lib/ai-types";

export function splitSseEvents(buffer: string) {
  const parts = buffer.split(/\r?\n\r?\n/);
  const remainder = parts.pop() ?? "";
  return { events: parts.map((part) => part.trim()).filter(Boolean), remainder };
}

export function extractTextFromSsePayload(payload: unknown): string {
  if (Array.isArray(payload)) {
    return payload.map((item) => extractTextFromSsePayload(item)).join("");
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate = payload as {
    choices?: Array<{
      delta?: { content?: string; reasoning_content?: string };
      message?: { content?: string };
      finish_reason?: string | null;
    }>;
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    error?: { message?: string };
  };

  if (candidate.error?.message) {
    throw new AIRequestError(candidate.error.message, "stream", 502);
  }

  return (
    candidate.choices?.[0]?.delta?.content ||
    candidate.choices?.[0]?.message?.content ||
    candidate.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") ||
    ""
  );
}

export function createTextStreamFromSse(
  body: ReadableStream<Uint8Array>,
  provider: string,
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const result = splitSseEvents(buffer);
          buffer = result.remainder;

          for (const event of result.events) {
            if (!event || event.startsWith(":")) {
              continue;
            }

            const dataLines = event
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            const payloadText = dataLines.join("\n");
            if (!payloadText || payloadText === "[DONE]") {
              continue;
            }

            let parsed: unknown;
            try {
              parsed = JSON.parse(payloadText);
            } catch {
              continue;
            }

            const content = extractTextFromSsePayload(parsed);
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(
          error instanceof AIRequestError
            ? error
            : new AIRequestError("Falha ao processar o stream do provider", provider, 502),
        );
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export async function collectStreamText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return result;
    }

    result += decoder.decode(value, { stream: true });
  }
}
