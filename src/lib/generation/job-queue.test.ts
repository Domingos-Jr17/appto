import { beforeEach, describe, expect, mock, test } from "bun:test";

const findManyMock = mock();
const updateManyMock = mock();
const loggerInfoMock = mock();
const loggerWarnMock = mock();
const loggerErrorMock = mock();
const trackProductEventMock = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    generationJob: {
      findMany: findManyMock,
      updateMany: updateManyMock,
    },
  },
}));

mock.module("@/lib/env", () => ({
  env: {
    INTERNAL_WORKER_SECRET: "worker-secret",
    APP_URL: "https://example.test",
  },
}));

mock.module("@/lib/logger", () => ({
  logger: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
    error: loggerErrorMock,
  },
}));

mock.module("@/lib/product-events", () => ({
  trackProductEvent: trackProductEventMock,
}));

const {
  processQueuedGenerationJobs,
  triggerQueuedGenerationProcessing,
} = await import("@/lib/generation/job-queue");

describe("generation job queue", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateManyMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    loggerErrorMock.mockReset();
    trackProductEventMock.mockReset();
    trackProductEventMock.mockImplementation(() => Promise.resolve(null));
  });

  test("claims only once when concurrent candidates race for the same job", async () => {
    const startedAt = new Date("2026-04-10T10:00:00.000Z");
    findManyMock.mockResolvedValueOnce([
      { projectId: "project-1", startedAt },
      { projectId: "project-1", startedAt },
    ]);
    updateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const processor = mock(() => Promise.resolve());
    const result = await processQueuedGenerationJobs(processor, 2);

    expect(result.processed).toBe(1);
    expect(processor).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
  });

  test("starts local fast-start processing immediately while remote trigger is in flight", async () => {
    const originalFetch = global.fetch;
    let releaseRemote: (() => void) | null = null;
    global.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          releaseRemote = () =>
            resolve(
              new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            );
        }),
    ) as unknown as typeof fetch;

    const processQueued = mock(() => Promise.resolve({ processed: 1 }));

    try {
      triggerQueuedGenerationProcessing(processQueued, { fastStartLocal: true });
      await Promise.resolve();
      await Promise.resolve();

      expect(processQueued).toHaveBeenCalledTimes(1);
      expect(processQueued).toHaveBeenCalledWith(1);

      expect(releaseRemote).not.toBeNull();
      (releaseRemote as unknown as () => void)();
      await Promise.resolve();
      await Promise.resolve();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("does not run local processing when fast-start is disabled and remote trigger succeeds", async () => {
    const originalFetch = global.fetch;
    global.fetch = mock(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const processQueued = mock(() => Promise.resolve({ processed: 1 }));

    try {
      triggerQueuedGenerationProcessing(processQueued);
      await Promise.resolve();
      await Promise.resolve();

      expect(processQueued).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
