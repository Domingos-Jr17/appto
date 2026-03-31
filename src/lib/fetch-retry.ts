interface FetchRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  retryUnsafe?: boolean;
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 30000,
    retryUnsafe = false,
    signal,
    ...fetchOptions
  } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const canRetry = retryUnsafe || isIdempotentMethod(method);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const abortController = () => controller.abort();
    signal?.addEventListener("abort", abortController);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        signal: controller.signal,
      });

      if (response.ok || response.status < 500) {
        return response;
      }

      if (canRetry && attempt < retries) {
        await delay(retryDelay * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      if (!canRetry || attempt >= retries) throw error;
      await delay(retryDelay * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortController);
    }
  }

  throw new Error("Fetch failed after retries");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIdempotentMethod(method: string) {
  return ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"].includes(method);
}
