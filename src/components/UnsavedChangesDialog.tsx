import { AppIcon } from "./AppIcon";

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
  if (!actionType) {
    return null;
  }

  const actionText = actionType === "new" ? "utworzeniem nowego projektu" : "otwarciem innego projektu";

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="palette-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Niezapisane zmiany"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: "460px" }}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="save" size={20} style={{ color: "var(--accent-primary)" }} />
          <strong>Masz niezapisane zmiany</strong>
        </div>
        <p className="palette-confirm-dialog__copy">
          Czy chcesz zapisać obecne zlecenie przed {actionText}?
        </p>
        <div className="din-rail-dialog-actions" style={{ marginTop: "10px" }}>
          <button type="button" onClick={onCancel} style={{ marginRight: "auto" }}>
            Anuluj
          </button>
          <button type="button" className="accent-btn danger" onClick={onDiscard}>
            Nie zapisuj
          </button>
          <button type="button" className="accent-btn" onClick={onSave}>
            Zapisz zmiany
          </button>
        </div>
      </div>
    </div>
  );
}
