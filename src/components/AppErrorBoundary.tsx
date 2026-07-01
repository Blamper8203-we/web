import React from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { reportRuntimeError } from "../lib/runtimeDiagnostics";
import { safeArchiveAndResetWorkingState } from "../lib/crashRecovery";
import "./AppErrorBoundary.css";

interface AppErrorBoundaryState {
  error: Error | null;
}

type Props = React.PropsWithChildren & WithTranslation;

class AppErrorBoundaryInner extends React.Component<
  Props,
  AppErrorBoundaryState
> {
  public constructor(props: Props) {
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

    const { t } = this.props;

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary__panel">
          <div className="app-error-boundary__mark">!</div>
          <div className="app-error-boundary__copy">
            <span className="app-error-boundary__eyebrow">DINBoard Web</span>
            <h1>{t("app.errorBoundary.title", "Nie udało się wyświetlić aplikacji")}</h1>
            <p>
              {t("app.errorBoundary.desc1", "Dane robocze zapisane w tej przeglądarce powinny pozostać dostępne. Odśwież aplikację i sprawdź ostatni zapis zlecenia.")}
            </p>
            <p className="app-error-boundary__hint">
              {t("app.errorBoundary.desc2", "Jeśli problem się powtarza po odświeżeniu, użyj „Wyczyść bieżący projekt”. Bieżący stan zostanie zarchiwizowany (nie usunięty), a aplikacja uruchomi się z pustym zleceniem.")}
            </p>
          </div>
          <div className="app-error-boundary__actions">
            <button type="button" className="accent-btn" onClick={this.handleReload}>
              {t("app.errorBoundary.reloadAction", "Odśwież")}
            </button>
            <button type="button" onClick={this.handleReturnToApp}>
              {t("app.errorBoundary.returnAction", "Wróć do aplikacji")}
            </button>
            <button type="button" onClick={this.handleResetWorkingState}>
              {t("app.errorBoundary.resetAction", "Wyczyść bieżący projekt")}
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export const AppErrorBoundary = withTranslation()(AppErrorBoundaryInner);
