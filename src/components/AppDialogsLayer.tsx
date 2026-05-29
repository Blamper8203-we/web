import type { ImportedModuleDefinition } from "../lib/modules/importedModuleCatalog";
import { AppIcon } from "./AppIcon";
import { HelpDialog } from "./HelpDialog";
import { ImportedModulesDialog } from "./ImportedModulesDialog";
import { RcdManagementDialog, type RcdManagerEntry } from "./RcdManagementDialog";
import { SvgImportDialog } from "./SvgImportDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

export interface PaletteContextMenuState {
  label: string;
  templateId: string;
  x: number;
  y: number;
}

export interface PendingPaletteRemoval {
  label: string;
  templateId: string;
}

interface AppDialogsLayerProps {
  importedModuleCategoryOptions: string[];
  importedModules: ImportedModuleDefinition[];
  importedModulesManagerOpen: boolean;
  isHelpOpen: boolean;
  isRcdManagerOpen: boolean;
  paletteContextMenu: PaletteContextMenuState | null;
  pendingPaletteRemoval: PendingPaletteRemoval | null;
  rcdManagerEntries: RcdManagerEntry[];
  svgImportDialogOpen: boolean;
  onCancelPaletteRemoval: () => void;
  onCloseHelp: () => void;
  onCloseImportedModulesManager: () => void;
  onClosePaletteContextMenu: () => void;
  onCloseRcdManager: () => void;
  onCloseSvgImport: () => void;
  onConfirmPaletteRemoval: () => void;
  onImportedModuleCategoryChange: (moduleId: string, category: string) => void;
  onRemoveImportedModule: (moduleId: string) => void;
  onRequestPaletteRemoval: (removal: PendingPaletteRemoval) => void;
  onSaveRcdManager: (entries: RcdManagerEntry[]) => void;
  onSvgImportCommit: (modules: ImportedModuleDefinition[], preferredCategory: string) => void;
  unsavedChangesActionType: "new" | "open" | null;
  onSaveUnsavedChanges: () => void;
  onDiscardUnsavedChanges: () => void;
  onCancelUnsavedChanges: () => void;
}

export function AppDialogsLayer({
  importedModuleCategoryOptions,
  importedModules,
  importedModulesManagerOpen,
  isHelpOpen,
  isRcdManagerOpen,
  paletteContextMenu,
  pendingPaletteRemoval,
  rcdManagerEntries,
  svgImportDialogOpen,
  onCancelPaletteRemoval,
  onCloseHelp,
  onCloseImportedModulesManager,
  onClosePaletteContextMenu,
  onCloseRcdManager,
  onCloseSvgImport,
  onConfirmPaletteRemoval,
  onImportedModuleCategoryChange,
  onRemoveImportedModule,
  onRequestPaletteRemoval,
  onSaveRcdManager,
  onSvgImportCommit,
  unsavedChangesActionType,
  onSaveUnsavedChanges,
  onDiscardUnsavedChanges,
  onCancelUnsavedChanges,
}: AppDialogsLayerProps) {
  return (
    <>
      {svgImportDialogOpen && (
        <SvgImportDialog
          categoryOptions={importedModuleCategoryOptions}
          existingModules={importedModules}
          onClose={onCloseSvgImport}
          onImport={onSvgImportCommit}
        />
      )}

      {paletteContextMenu && (
        <div
          className="palette-context-menu"
          style={{ left: paletteContextMenu.x, top: paletteContextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="palette-context-menu__item danger"
            onClick={() => {
              onRequestPaletteRemoval({
                templateId: paletteContextMenu.templateId,
                label: paletteContextMenu.label,
              });
              onClosePaletteContextMenu();
            }}
          >
            <AppIcon name="delete" size={12} />
            <span>Usuń</span>
          </button>
        </div>
      )}

      {pendingPaletteRemoval && (
        <div className="din-rail-dialog-backdrop" onMouseDown={onCancelPaletteRemoval}>
          <div
            className="palette-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Potwierdzenie usunięcia modułu"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="din-rail-dialog-title">
              <AppIcon name="delete" size={18} />
              <strong>Usuń moduł z lewego panelu?</strong>
            </div>
            <p className="palette-confirm-dialog__copy">
              Moduł <strong>{pendingPaletteRemoval.label}</strong> zniknie z palety po lewej stronie.
            </p>
            <div className="din-rail-dialog-actions">
              <button type="button" onClick={onCancelPaletteRemoval}>
                Anuluj
              </button>
              <button type="button" className="accent-btn danger" onClick={onConfirmPaletteRemoval}>
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {importedModulesManagerOpen && (
        <ImportedModulesDialog
          categoryOptions={importedModuleCategoryOptions}
          modules={importedModules}
          onCategoryChange={onImportedModuleCategoryChange}
          onClose={onCloseImportedModulesManager}
          onRemove={onRemoveImportedModule}
        />
      )}

      {isRcdManagerOpen && (
        <RcdManagementDialog
          entries={rcdManagerEntries}
          onClose={onCloseRcdManager}
          onSave={onSaveRcdManager}
        />
      )}

      {isHelpOpen && (
        <HelpDialog onClose={onCloseHelp} />
      )}

      {unsavedChangesActionType && (
        <UnsavedChangesDialog
          actionType={unsavedChangesActionType}
          onSave={onSaveUnsavedChanges}
          onDiscard={onDiscardUnsavedChanges}
          onCancel={onCancelUnsavedChanges}
        />
      )}
    </>
  );
}
