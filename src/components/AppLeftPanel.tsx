
import { AppIcon } from "./AppIcon";
import { ModuleAssetPreview } from "./ModuleAssetPreview";
import { ProjectPropertiesPage } from "./ProjectPropertiesPage";
import { getPaletteTemplateDimensions, type PaletteGroup } from "../lib/modules/moduleCatalog";
import { getPaletteIconName, getPaletteDescription, createPaletteDragPreview, type SheetType } from "../lib/appHelpers";
import type { ProjectMetadata } from "../types/projectMetadata";

import type { DinRailCanvasRail } from "./DinRailCanvasPixi";

export interface AppLeftPanelProps {
  activeSheet: SheetType;
  metadata: ProjectMetadata;
  handleMetadataChange: (nextMetadata: ProjectMetadata) => void;
  handleExportPdf: () => void;

  dinRail: DinRailCanvasRail;
  paletteGroups: PaletteGroup[];
  activePaletteGroupTitle: string;
  setActivePaletteGroupTitle: (title: string) => void;
  setPaletteContextMenu: (menu: { templateId: string; label: string; x: number; y: number } | null) => void;
  handleOpenDinRailGenerator: () => void;
}

export function AppLeftPanel({
  activeSheet,
  metadata,
  handleMetadataChange,
  handleExportPdf,

  dinRail,
  paletteGroups,
  activePaletteGroupTitle,
  setActivePaletteGroupTitle,
  setPaletteContextMenu,
  handleOpenDinRailGenerator,
}: AppLeftPanelProps) {
  const activePaletteGroup =
    paletteGroups.find((g) => g.title === activePaletteGroupTitle) ??
    paletteGroups[0] ??
    { title: "", subtitle: "", items: [] };

  return (
    <aside className="left-panel">
      <div className="panel-content">
        {activeSheet === "sheet2" && (
          <ProjectPropertiesPage
            metadata={metadata}
            onChange={handleMetadataChange}
            onExportPdf={handleExportPdf}
          />
        )}
        {activeSheet === "sheet3" && (
          <div className="left-panel-empty">
            <span className="workspace-tag">Lista</span>
            <strong>Lista obwodów</strong>
          </div>
        )}
        {activeSheet === "sheet1" && (
          <div className="palette-browser">
            <div className="panel-title-strip">
              <AppIcon className="panel-title-icon" name="palette" size={18} />
              <strong>MODUŁY</strong>
            </div>
            <div className="panel-divider" />
            <div className="palette-tabs" aria-label="Kategorie modułów">
              {paletteGroups.map((group) => (
                <button
                  className={`palette-tab ${group.title === activePaletteGroup.title ? "active" : ""}`}
                  key={group.title}
                  type="button"
                  onClick={() => setActivePaletteGroupTitle(group.title)}
                >
                  {group.title}
                </button>
              ))}
            </div>
            <section className="palette-group" key={activePaletteGroup.title}>
              <div className="palette-group-header">
                <span className="palette-group-header__icon">
                  <AppIcon name="module" size={15} />
                </span>
                <div>
                  <strong>{activePaletteGroup.title}</strong>
                </div>
                <span className="palette-group-header__count">{activePaletteGroup.items.length}</span>
              </div>
              <div className="palette-grid">
                {activePaletteGroup.items.map((item) => (
                  <div
                    className="palette-item"
                    key={`${activePaletteGroup.title}-${item.code}`}
                    draggable={true}
                    role="listitem"
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setPaletteContextMenu({ templateId: item.templateId, label: item.label, x: event.clientX, y: event.clientY });
                    }}
                    onDragStart={(event) => {
                      const moduleDimensions = getPaletteTemplateDimensions(item);
                      const zoomScale = activeSheet === "sheet1" ? 0.2 : 1;
                      const previewNode = event.currentTarget.querySelector(".palette-item-visual");
                      const dragPreview = createPaletteDragPreview(
                        previewNode instanceof HTMLElement ? previewNode : null,
                        moduleDimensions.width * zoomScale,
                        moduleDimensions.height * zoomScale,
                      );
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("application/x-dinboard-palette", item.templateId);
                      event.dataTransfer.setData("text/plain", item.templateId);
                      if (dragPreview) {
                        event.dataTransfer.setDragImage(dragPreview, Math.round((moduleDimensions.width * zoomScale) / 2), Math.round((moduleDimensions.height * zoomScale) / 2));
                        window.setTimeout(() => dragPreview.remove(), 0);
                      }
                    }}
                  >
                    {(() => {
                      const isRcdPreview =
                        item.deviceKind === "rcd"
                        || item.type.toUpperCase().includes("RCD")
                        || item.category?.toUpperCase() === "RCD";
                      return (
                        <span className="palette-item-visual">
                          {item.assetPath ? (
                            <ModuleAssetPreview
                              alt={item.label}
                              className={`palette-module-preview${isRcdPreview ? " palette-module-preview--rcd" : ""}`}
                              parameters={item.placeholderDefaults}
                              rasterDprCap={4}
                              renderHeight={44}
                              renderMode="svg"
                              renderWidth={48}
                              src={item.assetPath}
                            />
                          ) : (
                            <AppIcon name={getPaletteIconName(item)} size={24} />
                          )}
                        </span>
                      );
                    })()}
                    <span className="palette-item-copy">
                      <span className="palette-item-label">{item.label}</span>
                      <span className="palette-item-description">{getPaletteDescription(item)}</span>
                    </span>
                    <span className="palette-item-code">{item.code}</span>
                  </div>
                ))}
              </div>
            </section>
            {!dinRail.isVisible && (
              <button type="button" className="palette-blocker" onClick={handleOpenDinRailGenerator}>
                <AppIcon name="validation" size={24} />
                <strong>Najpierw wygeneruj szynę DIN</strong>
                <span>Moduły będą dostępne po utworzeniu rozdzielnicy.</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
