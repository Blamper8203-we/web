import React from "react";
import { reportRuntimeError } from "../lib/runtimeDiagnostics";
import { safeArchiveAndResetWorkingState } from "../lib/crashRecovery";
import "./AppErrorBoundary.css";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  public constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportRuntimeError(error, {
      source: "error-boundary",
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReturnToApp = () => {
    window.history.replaceState({}, "", "/app");
    window.location.reload();
  };

  // WHY: gdy crash wynika z uszkodzonego stanu roboczego, sam reload wczyta ten sam
  // wadliwy stan (pętla crashu). Ta akcja archiwizuje stan (bez kasowania danych) i
  // czyści go, by aplikacja wystartowała od pustego, sprawnego projektu.
  private handleResetWorkingState = () => {
    try {
      safeArchiveAndResetWorkingState(window.localStorage);
    } finally {
      window.location.reload();
    }
  };

  public render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary__panel">
          <div className="app-error-boundary__mark">!</div>
          <div className="app-error-boundary__copy">
            <span className="app-error-boundary__eyebrow">DINBoard Web</span>
            <h1>Nie udało się wyświetlić aplikacji</h1>
            <p>
              Dane robocze zapisane w tej przeglądarce powinny pozostać dostępne.
              Odśwież aplikację i sprawdź ostatni zapis zlecenia.
            </p>
            <p className="app-error-boundary__hint">
              Jeśli problem się powtarza po odświeżeniu, użyj „Wyczyść bieżący projekt”.
              Bieżący stan zostanie zarchiwizowany (nie usunięty), a aplikacja uruchomi
              się z pustym zleceniem.
            </p>
          </div>
          <div className="app-error-boundary__actions">
            <button type="button" className="accent-btn" onClick={this.handleReload}>
              Odśwież
            </button>
            <button type="button" onClick={this.handleReturnToApp}>
              Wróć do aplikacji
            </button>
            <button type="button" onClick={this.handleResetWorkingState}>
              Wyczyść bieżący projekt
            </button>
          </div>
        </section>
      </main>
    );
  }
}
