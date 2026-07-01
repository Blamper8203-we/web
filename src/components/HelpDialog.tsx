import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./HelpDialog.css";

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  const { t } = useTranslation();
  
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
        aria-label={t("app.helpDialog.title", "Pomoc")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="help" size={18} />
          <strong>{t("app.helpDialog.title", "Pomoc")}</strong>
        </div>

        <div className="help-dialog__content">
          <section className="help-dialog__section">
            <h3>{t("app.helpDialog.shortcuts", "Skróty klawiaturowe")}</h3>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - {t("app.helpDialog.shortcutNew", "nowe zlecenie")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>O</kbd> - {t("app.helpDialog.shortcutOpen", "otwórz zlecenie")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - {t("app.helpDialog.shortcutSave", "zapisz zlecenie")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> - {t("app.helpDialog.shortcutSaveAs", "zapisz jako")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>P</kbd> - {t("app.helpDialog.shortcutPrint", "drukuj")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - {t("app.helpDialog.shortcutUndo", "cofnij")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> {t("app.helpDialog.or", "lub")} <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> - {t("app.helpDialog.shortcutRedo", "ponów")}</li>
              <li><kbd>Delete</kbd> - {t("app.helpDialog.shortcutDel", "usuń zaznaczone")}</li>
              <li><kbd>Ctrl</kbd> + <kbd>D</kbd> - {t("app.helpDialog.shortcutDuplicate", "duplikuj zaznaczone")}</li>
              <li><kbd>F1</kbd> - {t("app.helpDialog.shortcutHelp", "otwórz pomoc")}</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>{t("app.helpDialog.saving", "Zapis zlecenia")}</h3>
            <ul>
              <li>{t("app.helpDialog.savingDesc1", "Przeglądarka trzyma roboczą kopię lokalnie; pełny zapis wykonaj przez")} <strong>{t("app.helpDialog.savingDesc1b", "Plik → Zapisz")}</strong> {t("app.helpDialog.savingDesc1c", "do pliku")} <code>.dinboard</code>.</li>
              <li>{t("app.helpDialog.savingDesc2", "Przed zamknięciem karty lub odświeżeniem strony zapisz zlecenie, jeśli widzisz status niezapisanych zmian.")}</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>{t("app.helpDialog.tips", "Wskazówki")}</h3>
            <ul>
              <li>{t("app.helpDialog.tip1", "W widoku szyny DIN dodawaj moduły metodą przeciągnij i upuść z lewego panelu.")}</li>
              <li>{t("app.helpDialog.tip2", "W widoku PDF możesz przełączać zakładki dokumentów w prawym panelu.")}</li>
              <li>{t("app.helpDialog.tip3", "Przy zmianach RCD użyj przycisku „Zarządzaj RCD” w panelu konfiguracji.")}</li>
            </ul>
          </section>

          <section className="help-dialog__section">
            <h3>{t("app.helpDialog.scope", "Zakres Web v1")}</h3>
            <ul>
              <li>{t("app.helpDialog.scope1", "Brak eksportu LaTeX, generatora szyny prądowej i kalkulatora indukcji.")}</li>
              <li>{t("app.helpDialog.scope2", "Walidacje i obliczenia wspierają wykonanie oraz odbiór instalacji — dokumentację sprawdź przed przekazaniem inwestorowi.")}</li>
            </ul>
          </section>
        </div>

        <div className="din-rail-dialog-actions">
          <button type="button" className="accent-btn" onClick={onClose}>
            {t("app.helpDialog.btnClose", "Zamknij")}
          </button>
        </div>
      </div>
    </div>
  );
}
