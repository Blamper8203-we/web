import { useEffect } from "react";
import { AppIcon } from "./AppIcon";
import "./HelpDialog.css";
import "./AboutDialog.css";

interface AboutDialogProps {
  onClose: () => void;
}

// WHY: wersja pochodzi z __APP_VERSION__ wstrzykiwanego w build-time z package.json
// (vite.config.ts define). Brak duplikowania numeru wersji w kodzie.
const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

// Skrót ostatnich zmian — odzwierciedla najnowszy wpis z CHANGELOG.md. Trzymany
// krótko i w języku domeny, bo czyta to elektryk, nie programista.
const RECENT_CHANGES: ReadonlyArray<string> = [
  "Bezpieczniejsze uruchamianie po błędzie — można wyczyścić projekt bez utraty danych.",
  "Uszkodzone dane robocze nie blokują już uruchomienia aplikacji.",
  "Poprawki stabilności zapisu i odczytu pliku zlecenia.",
];

export function AboutDialog({ onClose }: AboutDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="help-dialog about-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="O aplikacji"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="help" size={18} />
          <strong>O aplikacji</strong>
        </div>

        <div className="help-dialog__content">
          <section className="help-dialog__section">
            <div className="about-dialog__version">
              <span className="about-dialog__name">DINBoard Web</span>
              <span className="about-dialog__badge">v{APP_VERSION}</span>
            </div>
            <p>
              Narzędzie dla elektryków do projektowania rozdzielnic, bilansu faz,
              walidacji obwodów i generowania dokumentacji PDF.
            </p>
          </section>

          <section className="help-dialog__section">
            <h3>Co nowego</h3>
            <ul>
              {RECENT_CHANGES.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="din-rail-dialog-actions">
          <button type="button" className="accent-btn" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
