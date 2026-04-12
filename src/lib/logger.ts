/**
 * Structured logger — logs to console in dev, can be extended to
 * ship to an external service (Sentry, LogRocket, etc.) in prod.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

function ship(entry: LogEntry) {
  if (import.meta.env.DEV) {
    const method = entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log";
    console[method](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context ?? "");
  }
  // In production, you could send to an external service:
  // navigator.sendBeacon("/api/logs", JSON.stringify(entry));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => ship(createEntry("info", message, context)),
  warn: (message: string, context?: Record<string, unknown>) => ship(createEntry("warn", message, context)),
  error: (message: string, context?: Record<string, unknown>) => ship(createEntry("error", message, context)),
};

/**
 * Global unhandled error catcher — attach once in main.tsx.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    logger.error("Unhandled error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", {
      reason: String(event.reason),
    });
  });
}
