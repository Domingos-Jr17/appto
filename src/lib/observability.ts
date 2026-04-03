import { logger } from "@/lib/logger";

type OperationalEvent =
  | "rate_limit_allowed"
  | "rate_limit_blocked"
  | "lock_acquired"
  | "lock_blocked"
  | "lock_released"
  | "payment_callback_processed"
  | "payment_callback_duplicate"
  | "ai_provider_fallback";

export function logOperationalEvent(
  event: OperationalEvent,
  metadata: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
) {
  const message = `[ops] ${event}`;

  if (level === "warn") {
    logger.warn(message, metadata);
    return;
  }

  if (level === "error") {
    logger.error(message, metadata);
    return;
  }

  logger.info(message, metadata);
}
