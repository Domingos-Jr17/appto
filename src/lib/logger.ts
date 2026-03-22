type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata } : {}),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    write("info", message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    write("warn", message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>) {
    write("error", message, metadata);
  },
};
