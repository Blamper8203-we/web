import { useEffect } from "react";
import { AppIcon } from "./AppIcon";
import "./HelpDialog.css";

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
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
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Pomoc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="help" size={18} />
          <strong>Pomoc</strong>
        </div>

        <div className="help-dialog__content">
          <section className="help-dialog__section">
            <h3>Skróty klawiaturowe</h3>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - nowe zlecenie</li>
              <li><kbd>Ctrl</kbd> + <kbd>O</kbd> - otwórz zlecenie</li>
              <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - zapisz zlecenie</li>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> - zapisz jako</li>
              <li><kbd>Ctrl</kbd> + <kbd>P</kbd> - drukuj</li>
              <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - cofnij</li>
              <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> lub <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> - ponów</li>
              <li><kbd>Delete</kbd> - usuń zaznaczone</li>
              <li><kbd>Ctrl</kbd> + <kbd>D</kbd> - duplikuj zaznaczone</li>
              <li><kbd>F1</kbd> - otwórz pomoc</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>Zapis zlecenia</h3>
            <ul>
              <li>Przeglądarka trzyma roboczą kopię lokalnie; pełny zapis wykonaj przez <strong>Plik → Zapisz</strong> do pliku <code>.dinboard</code>.</li>
              <li>Przed zamknięciem karty lub odświeżeniem strony zapisz zlecenie, jeśli widzisz status niezapisanych zmian.</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>Wskazówki</h3>
            <ul>
              <li>W widoku szyny DIN dodawaj moduły metodą przeciągnij i upuść z lewego panelu.</li>
              <li>W widoku PDF możesz przełączać zakładki dokumentów w prawym panelu.</li>
              <li>Przy zmianach RCD użyj przycisku „Zarządzaj RCD” w panelu konfiguracji.</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>Zakres Web v1</h3>
            <ul>
              <li>Brak eksportu LaTeX, generatora szyny prądowej i kalkulatora indukcji.</li>
              <li>Walidacje i obliczenia wspierają wykonanie oraz odbiór instalacji — dokumentację sprawdź przed przekazaniem inwestorowi.</li>
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
