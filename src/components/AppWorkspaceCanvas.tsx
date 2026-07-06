import { useTranslation } from "react-i18next";
import { Suspense, lazy } from "react";
import { AppIcon } from "./AppIcon";
import { CircuitListPage } from "./CircuitListPage";
import { SchematicCanvas } from "./SchematicCanvas";
import type { SmartHomeSymbol } from "./SmartHomeCanvas";

import type { SheetType, PaletteTemplate } from "../lib/appHelpers";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import type { SymbolItem } from "../types/symbolItem";
import { type DefaultWireSettings } from "../lib/connections/connectionsLogic";
import type { ConnectionItem } from "../types/connectionItem";
import type { ProjectMetadata } from "../types/projectMetadata";

import type { CircuitRow } from "../types/circuitRow";

import type { DinRailConfig } from "../lib/schematic/dinRailGenerator";

import type { SchematicEditableField } from "../lib/schematic/schematicCellEdit";

const DinRailCanvas = lazy(async () => {
  const module = await import("./DinRailCanvasPixi");
  return { default: module.DinRailCanvas };
});

const DinRailConnectionsCanvas = lazy(async () => {
  const module = await import("./DinRailConnectionsCanvas");
  return { default: module.DinRailConnectionsCanvas };
});

const SmartHomeCanvas = lazy(async () => {
  const module = await import("./SmartHomeCanvas");
  return { default: module.SmartHomeCanvas };
});

export interface AppWorkspaceCanvasProps {
  activeSheet: SheetType;
  paletteTemplateMap: Map<string, PaletteTemplate>;
  dinRail: DinRailCanvasRail;
  symbols: SymbolItem[];
  dinRailGeneratorRequest: number;
  handlePaletteDrop: (templateId: string, x: number, y: number, options?: { snapToRail?: boolean }) => void;
  handleUnsupportedDinRailDrop: (templateId: string) => void;
  setWorkspaceZoomPercent: (zoom: number) => void;
  handleRailGenerated: (config: DinRailConfig, svg: string, width: number, height: number) => void;
  handleSymbolMoveStart: (id: string, x?: number, y?: number) => void;
  handleSymbolMove: (id: string, x: number, y: number) => void;
  handleSymbolMoveEnd: (id: string) => void;
  handleSymbolSelectionChange: (ids: string[], activeId?: string | null) => void;
  handleSymbolSelect: (id: string | null, options?: { toggle?: boolean }) => void;
  handleDeleteSelected: () => void;
  selectedSymbolId: string | null;
  selectedSymbolIds: string[];
  handleToggleDinRailGroups: () => void;
  showDinRailGroups: boolean;
  canShowSchematicAndCircuitList: boolean;
  handleSchematicCellEdit: (id: string, field: SchematicEditableField, value: string) => void;
  circuitRows: CircuitRow[];
  metadata?: ProjectMetadata;
  schematicViewportResetRequest: number;
  schematicScrollToPageRequest?: { pageIndex: number; timestamp: number } | null;
  connections: ConnectionItem[];
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  currentWireSettings?: DefaultWireSettings;
  onRequestLeftPanelTab?: (tabName: string) => void;
  smartHomeSymbols: SmartHomeSymbol[];
  onSmartHomeSymbolsChange: (symbols: SmartHomeSymbol[]) => void;
}

export function AppWorkspaceCanvas({
  activeSheet,
  paletteTemplateMap,
  dinRail,
  symbols,
  dinRailGeneratorRequest,
  handlePaletteDrop,
  handleUnsupportedDinRailDrop,
  setWorkspaceZoomPercent,
  handleRailGenerated,
  handleSymbolMoveStart,
  handleSymbolMove,
  handleSymbolMoveEnd,
  handleSymbolSelectionChange,
  handleSymbolSelect,
  handleDeleteSelected,
  selectedSymbolId,
  selectedSymbolIds,
  handleToggleDinRailGroups,
  showDinRailGroups,
  canShowSchematicAndCircuitList,
  handleSchematicCellEdit,
  circuitRows,
  metadata,
  schematicViewportResetRequest,
  schematicScrollToPageRequest,
  connections,
  onConnectionsChange,
  selectedConnectionId,
  onConnectionSelect,
  currentWireSettings,
  onRequestLeftPanelTab,
  smartHomeSymbols,
  onSmartHomeSymbolsChange,
}: AppWorkspaceCanvasProps) {
  const { t } = useTranslation();
  return (
    <div className="canvas-area">
      <div
        style={{
          display: activeSheet === "sheet1" ? "block" : "none",
          position: "absolute",
          inset: 0,
        }}
      >
        <Suspense fallback={<div className="left-panel-empty"><strong>{t("auto.adowaniewidokus_239", "Ładowanie widoku szyny DIN...")}</strong></div>}>

          <DinRailCanvas
            getPaletteTemplate={(idOrRef: string) => {
              const template = paletteTemplateMap.get(idOrRef);
              if (template) return template;
              return Array.from(paletteTemplateMap.values()).find((t) => t.moduleRef === idOrRef);
            }}
            rail={dinRail}
            symbols={symbols}
            connections={connections}
            generatorRequest={dinRailGeneratorRequest}
            onPaletteDrop={handlePaletteDrop}
            onUnsupportedTemplateDrop={handleUnsupportedDinRailDrop}
            onZoomChange={setWorkspaceZoomPercent}
            onRailGenerated={handleRailGenerated}
            onSymbolMoveStart={handleSymbolMoveStart}
            onSymbolMove={handleSymbolMove}
            onSymbolMoveEnd={handleSymbolMoveEnd}
            onSymbolSelectionChange={handleSymbolSelectionChange}
            onSymbolSelect={handleSymbolSelect}
            onDeleteSelected={handleDeleteSelected}
            selectedSymbolId={selectedSymbolId}
            selectedSymbolIds={selectedSymbolIds}
            onToggleGroups={handleToggleDinRailGroups}
            showGroups={showDinRailGroups}
            onRequestLeftPanelTab={onRequestLeftPanelTab}
          />
        </Suspense>
      </div>

      <div
        style={{
          display: activeSheet === "sheet1_connections" ? "block" : "none",
          position: "absolute",
          inset: 0,
        }}
      >
        <Suspense fallback={<div className="left-panel-empty"><strong>{t("auto.adowaniewidokup_157", "Ładowanie widoku połączeń...")}</strong></div>}>
          {activeSheet === "sheet1_connections" && (
            <DinRailConnectionsCanvas
              rail={dinRail}
              symbols={symbols}
              connections={connections}
              onConnectionsChange={onConnectionsChange}
              selectedConnectionId={selectedConnectionId}
              onConnectionSelect={onConnectionSelect}
              onSymbolSelect={handleSymbolSelect}
              selectedSymbolId={selectedSymbolId}
              setWorkspaceZoomPercent={setWorkspaceZoomPercent}
              currentWireSettings={currentWireSettings || {
                wireColor: "black",
                wireCrossSection: 2.5,
                wireType: "LgY",
                routingMode: "manhattan"
              }}
              onRequestLeftPanelTab={onRequestLeftPanelTab}
            />
          )}
        </Suspense>
      </div>

      {activeSheet === "sheet2" && !canShowSchematicAndCircuitList && (
        <div className="workspace-empty-state-wrapper">
          <div className="workspace-empty-state">
            <div className="workspace-empty-state-icon">
              <AppIcon name="fileTree" size={32} />
            </div>
            <span className="workspace-tag">{t("auto.schemat_955", "Schemat")}</span>
            <strong>{t("auto.schematobwodwbd_988", "Schemat obwodów będzie dostępny po dodaniu modułów.")}</strong>
            <span>{t("auto.najpierwwygener_84", "Najpierw wygeneruj szynę DIN i dodaj moduły w arkuszu Rozdzielnica.")}</span>
          </div>
        </div>
      )}

      {activeSheet === "sheet2" && canShowSchematicAndCircuitList && (
        <div className="schematic-container">
          <SchematicCanvas
            symbols={symbols}
            onSymbolMoveStart={handleSymbolMoveStart}
            onSymbolMove={handleSymbolMove}
            onSymbolMoveEnd={handleSymbolMoveEnd}
            onSymbolSelect={handleSymbolSelect}
            onPaletteDrop={handlePaletteDrop}
            onCellEdit={handleSchematicCellEdit}
            onZoomChange={setWorkspaceZoomPercent}
            selectedSymbolId={selectedSymbolId}
            selectedSymbolIds={selectedSymbolIds}
            metadata={metadata}
            resetRequest={schematicViewportResetRequest}
            scrollToPageRequest={schematicScrollToPageRequest}
          />
        </div>
      )}

      {activeSheet === "sheet3" && !canShowSchematicAndCircuitList && (
        <div className="workspace-empty-state-wrapper">
          <div className="workspace-empty-state">
            <div className="workspace-empty-state-icon">
              <AppIcon name="list" size={32} />
            </div>
            <span className="workspace-tag">{t("auto.lista_857", "Lista")}</span>
            <strong>{t("auto.listaobwodwbdzi_601", "Lista obwodów będzie dostępna po dodaniu modułów.")}</strong>
            <span>{t("auto.najpierwwygener_232", "Najpierw wygeneruj szynę DIN i dodaj moduły w arkuszu Rozdzielnica.")}</span>
          </div>
        </div>
      )}

      {activeSheet === "sheet3" && canShowSchematicAndCircuitList && (
        <CircuitListPage rows={circuitRows} />
      )}

      {activeSheet === "sheet5_smarthome" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          <Suspense fallback={<div className="left-panel-empty"><strong>{t("auto.adowanieschemat_sh", "Ładowanie schematu Smart Home...")}</strong></div>}>
            <SmartHomeCanvas
              symbols={smartHomeSymbols}
              onSymbolsChange={onSmartHomeSymbolsChange}
              onZoomChange={setWorkspaceZoomPercent}
            />
          </Suspense>
        </div>
      )}

    </div>
  );
}
