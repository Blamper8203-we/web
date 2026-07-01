import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./RcdManagementDialog.css";

export interface RcdManagerEntry {
  id: string;
  referenceDesignation: string;
  label: string;
  groupName: string;
  rcdRatedCurrent: number;
  rcdResidualCurrent: number;
  rcdType: string;
}

interface RcdManagementDialogProps {
  entries: RcdManagerEntry[];
  onClose: () => void;
  onSave: (entries: RcdManagerEntry[]) => void;
}

function normalizeNumber(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeRcdType(value: string): string {
  const next = value.trim().toUpperCase();
  return next.length > 0 ? next : "A";
}

export function RcdManagementDialog({ entries, onClose, onSave }: RcdManagementDialogProps) {
  const { t } = useTranslation();
  const [draftRows, setDraftRows] = useState<RcdManagerEntry[]>(() =>
    entries.map((entry) => ({ ...entry })),
  );

  const hasRows = draftRows.length > 0;

  const summary = useMemo(
    () => t("app.rcdManagement.summary", "{{count}} szt. RCD", { count: draftRows.length }),
    [draftRows.length, t],
  );

  const handleRowChange = (
    id: string,
    patch: Partial<Pick<RcdManagerEntry, "rcdRatedCurrent" | "rcdResidualCurrent" | "rcdType">>,
  ) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="rcd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.rcdManagement.title", "Zarządzanie RCD")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="din-rail-dialog-title">
          <AppIcon name="cog" size={18} />
          <strong>{t("app.rcdManagement.title", "Zarządzanie RCD")}</strong>
          <span className="rcd-dialog__summary">{summary}</span>
        </div>

        {!hasRows ? (
          <div className="rcd-dialog__empty">
            <strong>{t("app.rcdManagement.emptyTitle", "Brak modułów RCD w zleceniu.")}</strong>
            <span>{t("app.rcdManagement.emptyDesc", "Dodaj przynajmniej jeden moduł RCD na szynę DIN.")}</span>
          </div>
        ) : (
          <div className="rcd-dialog__table-wrap">
            <table className="rcd-dialog__table">
              <thead>
                <tr>
                  <th>RCD</th>
                  <th>{t("app.rcdManagement.colGroup", "Grupa")}</th>
                  <th>In [A]</th>
                  <th>IΔn [mA]</th>
                  <th>{t("app.rcdManagement.colType", "Typ")}</th>
                </tr>
              </thead>
              <tbody>
                {draftRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.referenceDesignation || row.label || "RCD"}</strong>
                    </td>
                    <td>{row.groupName || "-"}</td>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={row.rcdRatedCurrent}
                        onChange={(event) =>
                          handleRowChange(row.id, {
                            rcdRatedCurrent: normalizeNumber(event.target.value, row.rcdRatedCurrent),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={row.rcdResidualCurrent}
                        onChange={(event) =>
                          handleRowChange(row.id, {
                            rcdResidualCurrent: normalizeNumber(event.target.value, row.rcdResidualCurrent),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.rcdType}
                        onChange={(event) =>
                          handleRowChange(row.id, {
                            rcdType: normalizeRcdType(event.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="din-rail-dialog-actions">
          <button type="button" onClick={onClose}>{t("app.rcdManagement.btnCancel", "Anuluj")}</button>
          <button
            type="button"
            className="accent-btn"
            onClick={() => onSave(draftRows)}
            disabled={!hasRows}
          >
            {t("app.rcdManagement.btnSave", "Zapisz RCD")}
          </button>
        </div>
      </div>
    </div>
  );
}
