/**
 * Whether the app is running in development mode.
 * Used to gate debug-only console output in production builds.
 */
const IS_DEV: boolean =
  typeof import.meta !== "undefined" &&
  typeof import.meta.env !== "undefined" &&
  import.meta.env.DEV === true;

/**
 * Conditionally logs a debug message to the console.
 * No-op in production builds.
 */
export function devLog(...args: unknown[]): void {
  if (IS_DEV) {
    console.log(...args);
  }
}

/**
 * Conditionally logs a warning to the console.
 * No-op in production builds.
 */
export function devWarn(...args: unknown[]): void {
  if (IS_DEV) {
    console.warn(...args);
  }
}

/**
 * Conditionally logs an error to the console.
 * Unlike `reportRuntimeError`, this is gated to development only.
 */
export function devError(...args: unknown[]): void {
  if (IS_DEV) {
    console.error(...args);
  }
}

export interface RuntimeErrorContext {
  componentStack?: string;
  source: "error-boundary" | "unhandled-error" | "unhandled-rejection";
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown runtime error");
}

/**
 * Reports a runtime error for diagnostics/monitoring.
 * This runs in both dev and production; the output is
 * currently `console.error` but may later route to an
 * opt-in monitoring backend.
 */
export function reportRuntimeError(error: unknown, context: RuntimeErrorContext): void {
  const normalizedError = normalizeError(error);

  // Keep diagnostics local until a privacy-reviewed monitoring backend is configured.
  console.error("DINBoard runtime diagnostic", {
    context,
    message: normalizedError.message,
    stack: normalizedError.stack,
  });
}

export function registerGlobalRuntimeDiagnostics(): () => void {
  const handleError = (event: ErrorEvent) => {
    reportRuntimeError(event.error ?? event.message, {
      source: "unhandled-error",
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportRuntimeError(event.reason, {
      source: "unhandled-rejection",
    });
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
