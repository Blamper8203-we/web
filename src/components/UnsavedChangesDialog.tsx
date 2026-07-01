import { AppIcon } from "./AppIcon";
import { useTranslation } from "react-i18next";

interface UnsavedChangesDialogProps {
  actionType: "new" | "open" | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  actionType,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  if (!actionType) {
    return null;
  }

  const actionText = actionType === "new" 
    ? t("app.unsavedChanges.actionNew", "utworzeniem nowego projektu") 
    : t("app.unsavedChanges.actionOpen", "otwarciem innego projektu");

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="palette-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.unsavedChanges.title", "Niezapisane zmiany")}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: "460px" }}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="save" size={20} style={{ color: "var(--accent-primary)" }} />
          <strong>{t("app.unsavedChanges.title", "Masz niezapisane zmiany")}</strong>
        </div>
        <p className="palette-confirm-dialog__copy">
          {t("app.unsavedChanges.question", "Czy chcesz zapisać obecne zlecenie przed {{action}}?", { action: actionText })}
        </p>
        <div className="din-rail-dialog-actions" style={{ marginTop: "10px" }}>
          <button type="button" onClick={onCancel} style={{ marginRight: "auto" }}>
            {t("app.unsavedChanges.btnCancel", "Anuluj")}
          </button>
          <button type="button" className="accent-btn danger" onClick={onDiscard}>
            {t("app.unsavedChanges.btnDiscard", "Nie zapisuj")}
          </button>
          <button type="button" className="accent-btn" onClick={onSave}>
            {t("app.unsavedChanges.btnSave", "Zapisz zmiany")}
          </button>
        </div>
      </div>
    </div>
  );
}
