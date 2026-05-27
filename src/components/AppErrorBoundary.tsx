import React from "react";
import { reportRuntimeError } from "../lib/runtimeDiagnostics";
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
          </div>
          <div className="app-error-boundary__actions">
            <button type="button" className="accent-btn" onClick={this.handleReload}>
              Odśwież
            </button>
            <button type="button" onClick={this.handleReturnToApp}>
              Wróć do aplikacji
            </button>
          </div>
        </section>
      </main>
    );
  }
}
