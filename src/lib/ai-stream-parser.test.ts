import { describe, expect, test } from "bun:test";

import { collectStreamText, createTextStreamFromSse, extractTextFromSsePayload, splitSseEvents } from "@/lib/ai-stream-parser";

describe("ai stream parser", () => {
  test("splits complete SSE events and keeps remainder", () => {
    const { events, remainder } = splitSseEvents("data: {\"a\":1}\n\n:data\n\ndata: [DO");

    expect(events).toEqual(["data: {\"a\":1}", ":data"]);
    expect(remainder).toBe("data: [DO");
  });

  test("extracts text from standard delta payloads", () => {
    const text = extractTextFromSsePayload({
      choices: [{ delta: { content: "Olá" } }],
    });

    expect(text).toBe("Olá");
  });

  test("collects text from an SSE stream", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n' +
              'data: {"choices":[{"delta":{"content":" mundo"}}]}\n\n' +
              'data: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    });

    const text = await collectStreamText(createTextStreamFromSse(stream, "test"));
    expect(text).toBe("Olá mundo");
  });
});
