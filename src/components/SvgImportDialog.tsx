import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ImportedModuleDefinition,
  PendingSvgImportItem,
} from "../lib/modules/importedModuleCatalog";
import {
  calculateModulesFromWidthMm,
  deriveImportTraits,
  finalizePendingSvgImports,
  prepareSvgImportFiles,
  recalculatePendingSvgImportDuplicates,
  savePendingSvgImportsToDirectory,
} from "../lib/modules/importedModuleCatalog";
import { AppIcon } from "./AppIcon";
import { ModuleAssetPreview } from "./ModuleAssetPreview";

interface SvgImportDialogProps {
  categoryOptions: string[];
  existingModules: ImportedModuleDefinition[];
  onClose: () => void;
  onImport: (modules: ImportedModuleDefinition[], preferredCategory: string) => void;
}

function getSelectionCount(items: PendingSvgImportItem[]) {
  return items.filter((item) => item.selected).length;
}

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

export function SvgImportDialog({
  categoryOptions,
  existingModules,
  onClose,
  onImport,
}: SvgImportDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PendingSvgImportItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetFolderName, setTargetFolderName] = useState("");
  const [targetDirectoryHandle, setTargetDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSavingToFolder, setIsSavingToFolder] = useState(false);
  const [status, setStatus] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? items[0] ?? null,
    [items, selectedItemId],
  );
  const selectedCount = useMemo(() => getSelectionCount(items), [items]);

  const replaceItems = useCallback((nextItems: PendingSvgImportItem[]) => {
    setItems(recalculatePendingSvgImportDuplicates(nextItems, existingModules));
  }, [existingModules]);

  const handleAddFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const imported = await prepareSvgImportFiles(Array.from(fileList), existingModules);
    if (imported.length === 0) {
      setStatus(t("app.svgImport.statusNoValidSvg", "Nie znaleziono poprawnych plików SVG."));
      return;
    }

    setItems((prev) => {
      const nextItems = recalculatePendingSvgImportDuplicates([...prev, ...imported], existingModules);
      if (!selectedItemId && nextItems[0]) {
        setSelectedItemId(nextItems[0].id);
      }
      return nextItems;
    });
    const skippedCount = fileList.length - imported.length;
    setStatus(
      t("app.svgImport.statusAdded", "Dodano {{added}} plik(i) do importu. Pominięto: {{skipped}}.", { added: imported.length, skipped: skippedCount })
    );
  }, [existingModules, selectedItemId, t]);

  const updateItem = useCallback((itemId: string, updater: (item: PendingSvgImportItem) => PendingSvgImportItem) => {
    setItems((prev) =>
      recalculatePendingSvgImportDuplicates(
        prev.map((item) => (item.id === itemId ? updater(item) : item)),
        existingModules,
      ),
    );
  }, [existingModules]);

  const handlePickFolder = useCallback(async () => {
    const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;

    if (!picker) {
      setStatus(t("app.svgImport.statusNoPicker", "Twoja przeglądarka nie obsługuje wyboru folderu zapisu."));
      return;
    }

    try {
      const handle = await picker();
      setTargetDirectoryHandle(handle);
      setTargetFolderName(handle.name ?? t("app.svgImport.defaultFolderName", "Wybrany folder"));
      setIsSavingToFolder(true);
      setStatus(t("app.svgImport.statusFolderSelected", "Wybrano folder zapisu dla importowanych SVG."));
    } catch {
      setStatus(t("app.svgImport.statusFolderCancelled", "Anulowano wybór folderu."));
    }
  }, [t]);

  const handleImport = useCallback(async () => {
    if (selectedCount === 0) {
      setStatus(t("app.svgImport.statusSelectOne", "Zaznacz co najmniej jeden moduł do importu."));
      return;
    }

    setIsImporting(true);
    try {
      if (isSavingToFolder && targetDirectoryHandle) {
        await savePendingSvgImportsToDirectory(items, targetDirectoryHandle);
      }

      const importedModules = finalizePendingSvgImports(items);
      const preferredCategory =
        items.find((item) => item.selected)?.category
        ?? selectedItem?.category
        ?? categoryOptions[0]
        ?? "Inne";

      onImport(importedModules, preferredCategory);
    } catch (error) {
      setStatus(t("app.svgImport.statusImportError", "Błąd importu: {{error}}", { error: error instanceof Error ? error.message : "Nieznany" }));
      setIsImporting(false);
    }
  }, [categoryOptions, isSavingToFolder, items, onImport, selectedCount, selectedItem?.category, targetDirectoryHandle, t]);

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        aria-label={t("app.svgImport.ariaLabel", "Import SVG")}
        aria-modal="true"
        className="svg-import-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <input
          accept=".svg,image/svg+xml"
          hidden
          multiple
          ref={fileInputRef}
          type="file"
          onChange={(event) => {
            void handleAddFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        <div className="svg-import-dialog__header">
          <div className="svg-import-dialog__heading">
            <div className="din-rail-dialog-title">
              <AppIcon name="import" size={18} />
              <strong>{t("app.svgImport.title", "Import modułów SVG")}</strong>
            </div>
            <span className="svg-import-dialog__subtitle">
              {t("app.svgImport.subtitle", "Podgląd, kategoria, wymiary i zapis w jednym miejscu.")}
            </span>
          </div>
          <button aria-label={t("app.svgImport.closeAria", "Zamknij")} className="toolbar-icon-btn" type="button" onClick={onClose}>
            <AppIcon name="delete" size={14} />
          </button>
        </div>

        <div className="svg-import-dialog__topbar">
          <div className="svg-import-dialog__source">
            <span className="svg-import-dialog__label">{t("app.svgImport.sourceFiles", "Pliki źródłowe")}</span>
            <div className="svg-import-dialog__controls">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <AppIcon name="folderOpen" size={14} />
                <span>{t("app.svgImport.selectFiles", "Wybierz pliki")}</span>
              </button>
              <span className="svg-import-dialog__hint">
                {items.length > 0 ? t("app.svgImport.queued", "W kolejce: {{count}}", { count: items.length }) : t("app.svgImport.addViaBtn", "Dodaj SVG przez przycisk")}
              </span>
            </div>
          </div>

          <div className="svg-import-dialog__source">
            <span className="svg-import-dialog__label">{t("app.svgImport.saveLocation", "Miejsce zapisu")}</span>
            <div className="svg-import-dialog__controls">
              <label className="svg-import-dialog__checkbox">
                <input
                  checked={isSavingToFolder}
                  type="checkbox"
                  onChange={(event) => {
                    if (!event.target.checked) {
                      setIsSavingToFolder(false);
                      setTargetDirectoryHandle(null);
                      setTargetFolderName("");
                    } else {
                      void handlePickFolder();
                    }
                  }}
                />
                <span>{t("app.svgImport.saveToFolder", "Zapisz też do folderu")}</span>
              </label>
              <button type="button" onClick={() => void handlePickFolder()}>
                <AppIcon name="folderOpen" size={14} />
                <span>{targetFolderName || t("app.svgImport.selectFolder", "Wybierz folder")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="svg-import-dialog__body">
          <div className="svg-import-dialog__list">
            <div className="svg-import-dialog__list-actions">
              <button type="button" onClick={() => replaceItems(items.map((item) => ({ ...item, selected: true })))}>
                {t("app.svgImport.selectAll", "Zaznacz wszystko")}
              </button>
              <button type="button" onClick={() => replaceItems(items.map((item) => ({ ...item, selected: false })))}>
                {t("app.svgImport.deselectAll", "Odznacz wszystko")}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="svg-import-dialog__empty">
                <strong>{t("app.svgImport.emptyList", "Brak plików do importu")}</strong>
                <span>{t("app.svgImport.emptyListDesc", "Tutaj pojawi się lista SVG wraz z podglądem i ustawieniami rozmiaru.")}</span>
              </div>
            ) : (
              items.map((item) => (
                <button
                  className={`svg-import-dialog__row ${selectedItem?.id === item.id ? "is-active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <input
                    checked={item.selected}
                    type="checkbox"
                    onChange={(event) => {
                      event.stopPropagation();
                      updateItem(item.id, (current) => ({ ...current, selected: event.target.checked }));
                    }}
                  />
                  <span className="svg-import-dialog__row-preview">
                    {(() => {
                      const isRcdPreview =
                        item.deviceKind === "rcd"
                        || (item.type || "").toUpperCase().includes("RCD")
                        || (item.category || "").toUpperCase() === "RCD";
                      return (
                    <ModuleAssetPreview
                      alt={item.label}
                      className={`palette-module-preview${isRcdPreview ? " palette-module-preview--rcd" : ""}`}
                      parameters={item.parameters}
                      rasterDprCap={4}
                      renderHeight={44}
                      renderMode="svg"
                      renderWidth={48}
                      src={item.assetPath}
                    />
                      );
                    })()}
                  </span>
                  <span className="svg-import-dialog__row-copy">
                    <strong>{item.label}</strong>
                    <span>{item.category} - {item.widthMm.toFixed(1)} x {item.heightMm.toFixed(1)} mm</span>
                    {item.isDuplicate && <em>{t("app.svgImport.duplicateWarning", "Duplikat w tej kategorii")}</em>}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="svg-import-dialog__preview">
            {selectedItem ? (
              <>
                <div className="svg-import-dialog__preview-card">
                  {(() => {
                    const isRcdPreview =
                      selectedItem.deviceKind === "rcd"
                      || (selectedItem.type || "").toUpperCase().includes("RCD")
                      || (selectedItem.category || "").toUpperCase() === "RCD";
                    return (
                  <ModuleAssetPreview
                    alt={selectedItem.label}
                    className={`svg-import-dialog__hero-preview${isRcdPreview ? " svg-import-dialog__hero-preview--rcd" : ""}`}
                    parameters={selectedItem.parameters}
                    rasterDprCap={5}
                    renderHeight={220}
                    renderMode="svg"
                    renderWidth={190}
                    src={selectedItem.assetPath}
                  />
                    );
                  })()}
                </div>

                <div className="svg-import-dialog__form">
                  <label>
                    <span>{t("app.svgImport.labelCode", "Kod / nazwa")}</span>
                    <input
                      type="text"
                      value={selectedItem.code}
                      onChange={(event) => updateItem(selectedItem.id, (item) => ({
                        ...item,
                        code: event.target.value,
                        label: event.target.value,
                      }))}
                    />
                  </label>

                  <label>
                    <span>{t("app.svgImport.labelCategory", "Kategoria")}</span>
                    <select
                      value={selectedItem.category}
                      onChange={(event) => updateItem(selectedItem.id, (item) => {
                        const nextCategory = event.target.value;
                        const traits = deriveImportTraits(nextCategory, item.fileName);
                        return {
                          ...item,
                          category: nextCategory,
                          deviceKind: traits.deviceKind,
                          phase: traits.phase,
                          type: traits.type,
                          heightMm: traits.defaultHeightMm ?? item.heightMm,
                        };
                      })}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="svg-import-dialog__dimensions">
                    <label>
                      <span>{t("app.svgImport.labelWidth", "Szerokość mm")}</span>
                      <input
                        max={300}
                        min={5}
                        step={0.1}
                        type="number"
                        value={selectedItem.widthMm}
                        onChange={(event) => updateItem(selectedItem.id, (item) => {
                          const widthMm = Math.max(5, Number.parseFloat(event.target.value || "5"));
                          return {
                            ...item,
                            widthMm,
                            modules: calculateModulesFromWidthMm(widthMm),
                          };
                        })}
                      />
                    </label>

                    <label>
                      <span>{t("app.svgImport.labelModules", "Moduły DIN")}</span>
                      <input
                        max={12}
                        min={1}
                        step={1}
                        type="number"
                        value={selectedItem.modules}
                        onChange={(event) => updateItem(selectedItem.id, (item) => ({
                          ...item,
                          modules: Math.max(1, Number.parseInt(event.target.value || "1", 10)),
                        }))}
                      />
                    </label>

                    <label>
                      <span>{t("app.svgImport.labelHeight", "Wysokość mm")}</span>
                      <input
                        max={140}
                        min={10}
                        step={0.1}
                        type="number"
                        value={selectedItem.heightMm}
                        onChange={(event) => updateItem(selectedItem.id, (item) => ({
                          ...item,
                          heightMm: Math.max(10, Number.parseFloat(event.target.value || "10")),
                        }))}
                      />
                    </label>
                  </div>

                  <div className="svg-import-dialog__meta">
                    <div><strong>{t("app.svgImport.metaFile", "Plik:")}</strong> {selectedItem.fileName}</div>
                    <div><strong>{t("app.svgImport.metaDetected", "Wykryto:")}</strong> {selectedItem.detectedCategory}</div>
                    <div>
                      <strong>{t("app.svgImport.metaSize", "Rozmiar SVG:")}</strong>{" "}
                      {selectedItem.sizeDetection === "svg-units"
                        ? t("app.svgImport.sizeUnits", "automatycznie z jednostek pliku")
                        : selectedItem.sizeDetection === "svg-300dpi"
                          ? t("app.svgImport.size300dpi", "automatycznie z viewBox jako eksport 300 DPI")
                        : selectedItem.sizeDetection === "svg-ratio"
                          ? t("app.svgImport.sizeRatio", "automatycznie z jednostki i proporcji SVG")
                          : t("app.svgImport.sizeFallback", "fallback z kategorii / liczby modułów")}
                    </div>
                    <div><strong>{t("app.svgImport.metaState", "Stan:")}</strong> {selectedItem.isDuplicate ? t("app.svgImport.stateDuplicate", "Duplikat") : t("app.svgImport.stateNew", "Nowy")}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="svg-import-dialog__empty">
                <strong>{t("app.svgImport.emptySelection", "Brak zaznaczenia")}</strong>
                <span>{t("app.svgImport.emptySelectionDesc", "Wybierz plik z listy po lewej, żeby ustawić kategorię i wymiary.")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="svg-import-dialog__footer">
          <span className="svg-import-dialog__status">{status}</span>
          <div className="din-rail-dialog-actions">
            <button type="button" onClick={onClose}>{t("app.svgImport.btnCancel", "Anuluj")}</button>
            <button
              className="accent-btn"
              disabled={selectedCount === 0 || isImporting}
              type="button"
              onClick={() => void handleImport()}
            >
              {t("app.svgImport.btnImport", "Importuj ({{count}})", { count: selectedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
