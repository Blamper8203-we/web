import { useCallback, useMemo, useRef, useState } from "react";
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

export function SvgImportDialog({
  categoryOptions,
  existingModules,
  onClose,
  onImport,
}: SvgImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PendingSvgImportItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetFolderName, setTargetFolderName] = useState("");
  const [targetDirectoryHandle, setTargetDirectoryHandle] = useState<any>(null);
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
      setStatus("Nie znaleziono poprawnych plikow SVG.");
      return;
    }

    setItems((prev) => {
      const nextItems = recalculatePendingSvgImportDuplicates([...prev, ...imported], existingModules);
      if (!selectedItemId && nextItems[0]) {
        setSelectedItemId(nextItems[0].id);
      }
      return nextItems;
    });
    setStatus(`Dodano ${imported.length} plik${imported.length === 1 ? "" : "i"} do importu.`);
  }, [existingModules, selectedItemId]);

  const updateItem = useCallback((itemId: string, updater: (item: PendingSvgImportItem) => PendingSvgImportItem) => {
    setItems((prev) =>
      recalculatePendingSvgImportDuplicates(
        prev.map((item) => (item.id === itemId ? updater(item) : item)),
        existingModules,
      ),
    );
  }, [existingModules]);

  const handlePickFolder = useCallback(async () => {
    const picker = (window as Window & {
      showDirectoryPicker?: () => Promise<any>;
    }).showDirectoryPicker;

    if (!picker) {
      setStatus("Twoja przegladarka nie obsluguje wyboru folderu zapisu.");
      return;
    }

    try {
      const handle = await picker();
      setTargetDirectoryHandle(handle);
      setTargetFolderName(handle.name ?? "Wybrany folder");
      setIsSavingToFolder(true);
      setStatus("Wybrano folder zapisu dla importowanych SVG.");
    } catch {
      setStatus("Anulowano wybor folderu.");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedCount === 0) {
      setStatus("Zaznacz co najmniej jeden modul do importu.");
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
      setStatus(`Blad importu: ${error instanceof Error ? error.message : "Nieznany"}`);
      setIsImporting(false);
    }
  }, [categoryOptions, isSavingToFolder, items, onImport, selectedCount, selectedItem?.category, targetDirectoryHandle]);

  return (
    <div className="din-rail-dialog-backdrop" onMouseDown={onClose}>
      <div
        aria-label="Import SVG"
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
              <strong>Import modulow SVG</strong>
            </div>
            <span className="svg-import-dialog__subtitle">
              Podglad, kategoria, wymiary i zapis w jednym miejscu.
            </span>
          </div>
          <button aria-label="Zamknij" className="toolbar-icon-btn" type="button" onClick={onClose}>
            <AppIcon name="delete" size={14} />
          </button>
        </div>

        <div className="svg-import-dialog__topbar">
          <div className="svg-import-dialog__source">
            <span className="svg-import-dialog__label">Pliki zrodlowe</span>
            <div className="svg-import-dialog__controls">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <AppIcon name="folderOpen" size={14} />
                <span>Wybierz pliki</span>
              </button>
              <span className="svg-import-dialog__hint">
                {items.length > 0 ? `W kolejce: ${items.length}` : "Dodaj SVG przez przycisk"}
              </span>
            </div>
          </div>

          <div className="svg-import-dialog__source">
            <span className="svg-import-dialog__label">Miejsce zapisu</span>
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
                <span>Zapisz tez do folderu</span>
              </label>
              <button type="button" onClick={() => void handlePickFolder()}>
                <AppIcon name="folderOpen" size={14} />
                <span>{targetFolderName || "Wybierz folder"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="svg-import-dialog__body">
          <div className="svg-import-dialog__list">
            <div className="svg-import-dialog__list-actions">
              <button type="button" onClick={() => replaceItems(items.map((item) => ({ ...item, selected: true })))}>
                Zaznacz wszystko
              </button>
              <button type="button" onClick={() => replaceItems(items.map((item) => ({ ...item, selected: false })))}>
                Odznacz wszystko
              </button>
            </div>

            {items.length === 0 ? (
              <div className="svg-import-dialog__empty">
                <strong>Brak plikow do importu</strong>
                <span>Tutaj pojawi sie lista SVG wraz z podgladem i ustawieniami rozmiaru.</span>
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
                    <ModuleAssetPreview
                      alt={item.label}
                      className="palette-module-preview"
                      parameters={item.parameters}
                      rasterDprCap={3}
                      renderHeight={40}
                      renderMode="raster"
                      renderWidth={44}
                      src={item.assetPath}
                    />
                  </span>
                  <span className="svg-import-dialog__row-copy">
                    <strong>{item.label}</strong>
                    <span>{item.category} - {item.widthMm.toFixed(1)} x {item.heightMm.toFixed(1)} mm</span>
                    {item.isDuplicate && <em>Duplikat w tej kategorii</em>}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="svg-import-dialog__preview">
            {selectedItem ? (
              <>
                <div className="svg-import-dialog__preview-card">
                  <ModuleAssetPreview
                    alt={selectedItem.label}
                    className="svg-import-dialog__hero-preview"
                    parameters={selectedItem.parameters}
                    rasterDprCap={4}
                    renderHeight={220}
                    renderMode="raster"
                    renderWidth={190}
                    src={selectedItem.assetPath}
                  />
                </div>

                <div className="svg-import-dialog__form">
                  <label>
                    <span>Kod / nazwa</span>
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
                    <span>Kategoria</span>
                    <select
                      value={selectedItem.category}
                      onChange={(event) => updateItem(selectedItem.id, (item) => {
                        const nextCategory = event.target.value;
                        const traits = deriveImportTraits(nextCategory);
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
                      <span>Szerokosc mm</span>
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
                      <span>Moduly DIN</span>
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
                      <span>Wysokosc mm</span>
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
                    <div><strong>Plik:</strong> {selectedItem.fileName}</div>
                    <div><strong>Wykryto:</strong> {selectedItem.detectedCategory}</div>
                    <div>
                      <strong>Rozmiar SVG:</strong>{" "}
                      {selectedItem.sizeDetection === "svg-units"
                        ? "automatycznie z jednostek pliku"
                        : selectedItem.sizeDetection === "svg-300dpi"
                          ? "automatycznie z viewBox jako eksport 300 DPI"
                        : selectedItem.sizeDetection === "svg-ratio"
                          ? "automatycznie z jednostki i proporcji SVG"
                          : "fallback z kategorii / liczby modulow"}
                    </div>
                    <div><strong>Stan:</strong> {selectedItem.isDuplicate ? "Duplikat" : "Nowy"}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="svg-import-dialog__empty">
                <strong>Brak zaznaczenia</strong>
                <span>Wybierz plik z listy po lewej, zeby ustawic kategorie i wymiary.</span>
              </div>
            )}
          </div>
        </div>

        <div className="svg-import-dialog__footer">
          <span className="svg-import-dialog__status">{status}</span>
          <div className="din-rail-dialog-actions">
            <button type="button" onClick={onClose}>Anuluj</button>
            <button
              className="accent-btn"
              disabled={selectedCount === 0 || isImporting}
              type="button"
              onClick={() => void handleImport()}
            >
              Importuj ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
