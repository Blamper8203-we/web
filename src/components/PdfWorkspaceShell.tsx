import { Suspense, lazy, useMemo, useState, useTransition, createContext, useContext, type TransitionStartFunction } from "react";
import { getPdfDocumentationTabs, type PdfDocumentationPreviewTab } from "../lib/pdfDocumentation";
import { buildEditableMeasurementProtocols } from "../lib/measurementProtocols";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import type { CircuitRow } from "../types/circuitRow";
import type { ConnectionItem } from "../types/connectionItem";

const PdfDocumentationPage = lazy(async () => {
  const module = await import("./PdfDocumentationPage");
  return { default: module.PdfDocumentationPage };
});

const MeasurementProtocolsWorkspacePage = lazy(async () => {
  const module = await import("./MeasurementProtocolsWorkspacePage");
  return { default: module.MeasurementProtocolsWorkspacePage };
});

export interface PdfWorkspaceContextType {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  dinRail: DinRailCanvasRail;
  circuitRows: CircuitRow[];
  connections: ConnectionItem[];
  pdfPreviewTab: PdfDocumentationPreviewTab;
  setPdfPreviewTab: (tab: PdfDocumentationPreviewTab) => void;
  startPdfTabTransition: TransitionStartFunction;
  handleMetadataChange: (nextMetadata: ProjectMetadata) => void;
  handleResetDocumentation: () => void;
}

export const PdfWorkspaceContext = createContext<PdfWorkspaceContextType | null>(null);

export function usePdfWorkspace() {
  const context = useContext(PdfWorkspaceContext);
  if (!context) {
    throw new Error("usePdfWorkspace must be used within a PdfWorkspaceProvider");
  }
  return context;
}

export interface PdfWorkspaceShellProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  dinRail: DinRailCanvasRail;
  circuitRows: CircuitRow[];
  connections: ConnectionItem[];
  handleMetadataChange: (nextMetadata: ProjectMetadata) => void;
  handleResetDocumentation: () => void;
  showLeftPanel: boolean;
  showRightPanel: boolean;
}

export function PdfWorkspaceShell({
  metadata,
  symbols,
  dinRail,
  circuitRows,
  connections,
  handleMetadataChange,
  handleResetDocumentation,
  showLeftPanel,
  showRightPanel,
}: PdfWorkspaceShellProps) {
  const [pdfPreviewTab, setPdfPreviewTab] = useState<PdfDocumentationPreviewTab>("title-page");
  const [, startPdfTabTransition] = useTransition();

  const effectiveMetadata = useMemo<ProjectMetadata>(
    () => ({
      ...metadata,
      measurementProtocols: buildEditableMeasurementProtocols(metadata, circuitRows),
    }),
    [metadata, circuitRows],
  );

  const contextValue = useMemo<PdfWorkspaceContextType>(
    () => ({
      metadata: effectiveMetadata,
      symbols,
      dinRail,
      circuitRows,
      connections,
      pdfPreviewTab,
      setPdfPreviewTab,
      startPdfTabTransition,
      handleMetadataChange,
      handleResetDocumentation,
    }),
    [
      effectiveMetadata,
      symbols,
      dinRail,
      circuitRows,
      connections,
      pdfPreviewTab,
      setPdfPreviewTab,
      startPdfTabTransition,
      handleMetadataChange,
      handleResetDocumentation,
    ],
  );

  return (
    <PdfWorkspaceContext.Provider value={contextValue}>
      {showLeftPanel && (
        <aside className="left-panel">
          <div className="panel-content">
            <Suspense fallback={<div className="left-panel-empty"><strong>Ładowanie panelu PDF...</strong></div>}>
              <PdfDocumentationPage />
            </Suspense>
          </div>
        </aside>
      )}

      <div className="canvas-area">
        <div className="pdf-workspace-shell" style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Górny pasek z zakładkami PDF — mobile only (CSS w Responsive.css
              ukrywa go na desktop, bo tam tę rolę pełni prawy panel).
              Rozwiązuje bug: na telefonie panele były ukryte, user nie mógł
              przełączyć zakładki (title-page / schematic / RCD / itd.). */}
          <div className="pdf-workspace-tabs" role="tablist">
            {getPdfDocumentationTabs().map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={pdfPreviewTab === tab.id}
                className={`pdf-workspace-tab ${pdfPreviewTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  startPdfTabTransition(() => {
                    setPdfPreviewTab(tab.id);
                  });
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "transparent" }}>
            <Suspense fallback={<div className="pdf-preview-workspace__empty"><strong>Ładowanie arkusza A4...</strong></div>}>
              <MeasurementProtocolsWorkspacePage />
            </Suspense>
          </div>
        </div>
      </div>

      {showRightPanel && (
        <aside className="right-panel">
          <div className="panel-content">
            <div className="right-panel-content">
              <div className="pdf-right-panel-nav">
                {getPdfDocumentationTabs().map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`pdf-right-panel-tab ${pdfPreviewTab === tab.id ? "active" : ""}`}
                    onClick={() => {
                      startPdfTabTransition(() => {
                        setPdfPreviewTab(tab.id);
                      });
                    }}
                  >
                    <span className="pdf-right-panel-tab__title">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}
    </PdfWorkspaceContext.Provider>
  );
}
