import type { ImportedModuleDefinition } from "../lib/modules/importedModuleCatalog";
import { ModuleAssetPreview } from "./ModuleAssetPreview";
import { AppIcon } from "./AppIcon";
import "./ImportedModulesDialog.css";

interface ImportedModulesDialogProps {
  categoryOptions: string[];
  modules: ImportedModuleDefinition[];
  onCategoryChange: (moduleId: string, category: string) => void;
  onClose: () => void;
  onRemove: (moduleId: string) => void;
}

export function ImportedModulesDialog({
  categoryOptions,
  modules,
  onCategoryChange,
  onClose,
  onRemove,
}: ImportedModulesDialogProps) {
  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="imported-modules-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Zarządzaj importowanymi modułami"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="imported-modules-dialog__header">
          <div className="din-rail-dialog-title">
            <AppIcon name="import" size={18} />
            <strong>Importowane moduły SVG</strong>
          </div>
          <span>{modules.length} elementów</span>
        </div>

        <div className="imported-modules-dialog__list">
          {modules.length === 0 ? (
            <div className="imported-modules-dialog__empty">
              <strong>Brak importowanych modułów</strong>
              <span>Zaimportowane SVG pojawią się tutaj i w lewej palecie.</span>
            </div>
          ) : (
            modules.map((moduleDefinition) => (
              <div className="imported-modules-item" key={moduleDefinition.id}>
                <span className="imported-modules-item__visual">
                  {(() => {
                    const isRcdPreview =
                      moduleDefinition.deviceKind === "rcd"
                      || moduleDefinition.type.toUpperCase().includes("RCD")
                      || moduleDefinition.category.toUpperCase() === "RCD";
                    return (
                  <ModuleAssetPreview
                    alt={moduleDefinition.label}
                    className={`palette-module-preview${isRcdPreview ? " palette-module-preview--rcd" : ""}`}
                    parameters={moduleDefinition.parameters}
                    rasterDprCap={4}
                    renderHeight={44}
                    renderMode="svg"
                    renderWidth={48}
                    src={moduleDefinition.assetPath}
                  />
                    );
                  })()}
                </span>

                <div className="imported-modules-item__copy">
                  <strong>{moduleDefinition.label}</strong>
                  <span>{moduleDefinition.modules}M · {moduleDefinition.type}</span>
                </div>

                <select
                  className="imported-modules-item__select"
                  value={moduleDefinition.category}
                  onChange={(event) => onCategoryChange(moduleDefinition.id, event.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="imported-modules-item__remove"
                  aria-label={`Usuń ${moduleDefinition.label}`}
                  title="Usuń import"
                  onClick={() => onRemove(moduleDefinition.id)}
                >
                  <AppIcon name="delete" size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="din-rail-dialog-actions">
          <button type="button" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
