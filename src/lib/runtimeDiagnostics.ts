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
