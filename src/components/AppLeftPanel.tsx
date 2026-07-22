import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { AppIcon } from "./AppIcon";
import { ModuleAssetPreview } from "./ModuleAssetPreview";
import { ProjectPropertiesPage } from "./ProjectPropertiesPage";
import { ConnectionsLeftPanel } from "./ConnectionsLeftPanel";
import "./LeftPanel.css";
import { getPaletteTemplateDimensions, type PaletteGroup, type PaletteTemplate } from "../lib/modules/moduleCatalog";
import { getPaletteIconName, getPaletteDescription, startCustomDragLayer, type SheetType } from "../lib/appHelpers";
import { CAD_SYMBOL_CATALOG } from "../lib/schematic/smartHomeCatalog";
import { isDoubleTap } from "../lib/tapDetection";
import { useIsMobileLayout } from "../hooks/useViewport";
import type { ProjectMetadata } from "../types/projectMetadata";
import { type DefaultWireSettings } from "../lib/connections/connectionsLogic";
import type { ConnectionItem } from "../types/connectionItem";
import type { SymbolItem } from "../types/symbolItem";

import type { DinRailCanvasRail } from "./DinRailCanvas";

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
  onPaletteItemTap?: (templateId: string) => void;
  showLeftPanel?: boolean;
  onClose?: () => void;
  currentWireSettings?: DefaultWireSettings;
  onChangeDefaultWireSettings?: (settings: DefaultWireSettings) => void;
  selectedConnectionId?: string | null;
  connections?: ConnectionItem[];
  onConnectionsChange?: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  /**
   * Zaznacz połączenie z listy w ConnectionsLeftPanel (mobile-friendly select).
   * Patrz mobile-connections-review §3.2.3 / §4.2 Opcja A.
   */
  onConnectionSelect?: (id: string | null) => void;
  /**
   * Symbole rozdzielnicy — do rozwiązywania fromSymbolId/toSymbolId na label
   * w liście połączeń. Bez tej listy pokazujemy surowe id.
   */
  symbols?: SymbolItem[];
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
  onPaletteItemTap,
  onClose,
  currentWireSettings,
  onChangeDefaultWireSettings,
  selectedConnectionId = null,
  connections = [],
  onConnectionsChange,
  onConnectionSelect,
  symbols,
}: AppLeftPanelProps) {
  const { t } = useTranslation();
  const isMobileLayout = useIsMobileLayout();



  // WHY: timestamp poprzedniego tapa na tym samym elemencie. Moduł dodaje się
  // dopiero na DOUBLE-TAP (2 tapnięcia w oknie TAP_DOUBLE_MS), nie na pojedynczy
  // tap — świadoma decyzja developera. Zabezpiecza przed przypadkowym dodaniem
  // modułu podczas np. scrolla/przypadkowego musnięcia. Ref per-element byłby
  // nadmierny: w praktyce double-tap to szybka sekwencja na tym samym kafelku,
  // więc wystarcza śledzić "ostatni tap" globalnie; jeśli użytkownik tapnie inny
  // moduł między tymi dwoma tapami, to nie jest double-tap na jednym elemencie
  // i bezpiecznie go zignorujemy (drugi tap zostanie nowym "pierwszym").
  const lastTapAtRef = useRef<number | null>(null);
  const lastTapTemplateIdRef = useRef<string | null>(null);

  const filteredPaletteGroups = paletteGroups.filter(g => g.title !== "Smart Home");

  const displayPaletteGroups = activeSheet === "sheet5_smarthome"
    ? [
        {
          title: "Smart Home",
          items: CAD_SYMBOL_CATALOG.map((sym) => ({
            templateId: sym.id,
            code: sym.label,
            label: sym.label,
            type: "cad",
            category: "Smart Home",
            deviceKind: "other",
            phase: "none",
            modules: 1,
            moduleRef: "none",
            assetPath: sym.sourceSvgPath,
            customWidth: sym.defaultWidth,
            customHeight: sym.defaultHeight,
            placeholderDefaults: {},
          }) as unknown as PaletteTemplate),
        },
      ]
    : filteredPaletteGroups;

  const displayActiveGroup = activeSheet === "sheet5_smarthome"
    ? displayPaletteGroups[0]
    : (filteredPaletteGroups.find((g) => g.title === activePaletteGroupTitle) ?? filteredPaletteGroups[0] ?? { title: "", subtitle: "", items: [] });

  return (
    <aside className="left-panel">
      <div className="panel-content">
        {activeSheet === "sheet1_connections" && currentWireSettings && onChangeDefaultWireSettings && (
          <ConnectionsLeftPanel
            defaultWireSettings={currentWireSettings}
            onChangeDefaultWireSettings={onChangeDefaultWireSettings}
            selectedConnectionId={selectedConnectionId}
            connections={connections}
            onConnectionsChange={onConnectionsChange}
            onConnectionSelect={onConnectionSelect}
            symbols={symbols}
          />
        )}
        {activeSheet === "sheet2" && (
          <ProjectPropertiesPage
            metadata={metadata}
            onChange={handleMetadataChange}
            onExportPdf={handleExportPdf}
          />
        )}
        {activeSheet === "sheet3" && (
          <div className="left-panel-empty">
            <span className="workspace-tag">{t("auto.lista_233", "Lista")}</span>
            <strong>{t("auto.listaobwodw_752", "Lista obwodów")}</strong>
          </div>
        )}
        {(activeSheet === "sheet1" || activeSheet === "sheet5_smarthome") && (
          <div className="palette-browser">
            <div className="panel-title-strip" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AppIcon className="panel-title-icon" name="palette" size={18} />
                <strong>{t("auto.moduy_511", "MODUŁY")}</strong>
              </div>
              {onClose && (
                <button type="button" className="win-close-btn mobile-only-tab" onClick={onClose} aria-label={t("app.appLeftPanel.close", "Zamknij")}>
                  <AppIcon name="close" size={16} />
                </button>
              )}
            </div>
            <div className="panel-divider" />
            <div className="palette-tabs" aria-label={t("auto.kategoriemoduw_133", "Kategorie modułów")}>
              {displayPaletteGroups.map((group) => (
                <button
                  className={`palette-tab ${group.title === displayActiveGroup.title ? "active" : ""}`}
                  key={group.title}
                  type="button"
                  onClick={() => {
                    if (activeSheet !== "sheet5_smarthome") {
                      setActivePaletteGroupTitle(group.title);
                    }
                  }}
                >
                  {group.title === "Smart Home" && <AppIcon name="sparkles" size={14} className="palette-tab-icon" />}
                  <span>{t(`moduleCategory.${group.title}`, group.title === "Controls" ? "Kontrolki faz" : group.title)}</span>
                  {group.title === "Smart Home" && <span className="palette-tab-badge">Nowe</span>}
                </button>
              ))}
            </div>
            <section className="palette-group" key={displayActiveGroup.title}>
              <div className="palette-group-header">
                <span className="palette-group-header__icon">
                  <AppIcon name="module" size={15} />
                </span>
                <div>
                  <strong>{t(`moduleCategory.${displayActiveGroup.title}`, displayActiveGroup.title === "Controls" ? "Kontrolki faz" : displayActiveGroup.title)}</strong>
                </div>
                <span className="palette-group-header__count">{displayActiveGroup.items.length}</span>
              </div>
              <div className="palette-grid">
                {displayActiveGroup.items.map((item) => (
                  <div
                    className="palette-item"
                    key={`${displayActiveGroup.title}-${item.code}`}
                    draggable={!isMobileLayout}
                    role="listitem"
                    data-testid="palette-item"
                    data-template-id={item.templateId}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setPaletteContextMenu({ templateId: item.templateId, label: item.label, x: event.clientX, y: event.clientY });
                    }}
                    // Dodajemy naszą własną detekcję podwójnego kliknięcia sterowaną
                    // logiką czasową (500ms). Działa i na desktopie (click) i mobile (tap),
                    // bo przeglądarka na mobile sama rozróżnia scroll (gdzie nie wyzwala click) 
                    // od tapnięcia (gdzie wyzwala click).
                    onClick={() => {
                      const now = Date.now();
                      const isSecondTapOfSameItem =
                        lastTapTemplateIdRef.current === item.templateId &&
                        isDoubleTap(lastTapAtRef.current, now);

                      if (isSecondTapOfSameItem) {
                        // Double-tap (lub double-click) potwierdzony
                        lastTapAtRef.current = null;
                        lastTapTemplateIdRef.current = null;
                        onPaletteItemTap?.(item.templateId);
                      } else {
                        // Pierwszy click/tap
                        lastTapAtRef.current = now;
                        lastTapTemplateIdRef.current = item.templateId;
                      }
                    }}

                    onDragStart={(event) => {
                      const moduleDimensions = getPaletteTemplateDimensions(item);
                      const zoomScale = activeSheet === "sheet1" ? 0.2 : 1;
                      const previewNode = event.currentTarget.querySelector(".palette-item-visual");
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("application/x-dinboard-palette", item.templateId);
                      event.dataTransfer.setData("text/plain", item.templateId);
                      startCustomDragLayer(
                        event.nativeEvent,
                        previewNode instanceof HTMLElement ? previewNode : null,
                        moduleDimensions.width * zoomScale,
                        moduleDimensions.height * zoomScale,
                      );
                    }}
                  >
                    {(() => {
                      const isRcdPreview =
                        item.deviceKind === "rcd"
                        || (item.type || "").toUpperCase().includes("RCD")
                        || (item.category || "").toUpperCase() === "RCD";
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
                    <div className="palette-item-content">
                      <span className="palette-item-copy">
                        <span className="palette-item-label">{item.label}</span>
                        {getPaletteDescription(item) && (
                          <span className="palette-item-description">{getPaletteDescription(item)}</span>
                        )}
                      </span>
                      {(item.code || "").toUpperCase() !== (item.label || "").toUpperCase() && (
                        <span className="palette-item-code">{item.code}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            {!dinRail.isVisible && activeSheet !== "sheet5_smarthome" && (
              <button type="button" className="palette-blocker" data-testid="palette-blocker" onClick={handleOpenDinRailGenerator}>
                <AppIcon name="validation" size={24} />
                <strong>{t("auto.najpierwwygener_746", "Najpierw wygeneruj szynę DIN")}</strong>
                <span>{t("auto.moduybddostpnep_339", "Moduły będą dostępne po utworzeniu rozdzielnicy.")}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
