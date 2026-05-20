import { Suspense, lazy, useMemo, type TransitionStartFunction } from "react";
import { pdfDocumentationTabs, type PdfDocumentationPreviewTab } from "../lib/pdfDocumentation";
import { buildEditableMeasurementProtocols } from "../lib/measurementProtocols";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import type { CircuitRow } from "../types/circuitRow";

const PdfDocumentationPage = lazy(async () => {
  const module = await import("./PdfDocumentationPage");
  return { default: module.PdfDocumentationPage };
});

const MeasurementProtocolsWorkspacePage = lazy(async () => {
  const module = await import("./MeasurementProtocolsWorkspacePage");
  return { default: module.MeasurementProtocolsWorkspacePage };
});

export interface PdfWorkspaceShellProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  dinRail: DinRailCanvasRail;
  circuitRows: CircuitRow[];
  pdfPreviewTab: PdfDocumentationPreviewTab;
  setPdfPreviewTab: (tab: PdfDocumentationPreviewTab) => void;
  startPdfTabTransition: TransitionStartFunction;
  handleMetadataChange: (nextMetadata: ProjectMetadata) => void;
  handleResetDocumentation: () => void;
  showRightPanel: boolean;
}

export function PdfWorkspaceShell({
  metadata,
  symbols,
  dinRail,
  circuitRows,
  pdfPreviewTab,
  setPdfPreviewTab,
  startPdfTabTransition,
  handleMetadataChange,
  handleResetDocumentation,
  showRightPanel,
}: PdfWorkspaceShellProps) {
  const effectiveMetadata = useMemo<ProjectMetadata>(
    () => ({
      ...metadata,
      measurementProtocols: buildEditableMeasurementProtocols(metadata, circuitRows),
    }),
    [metadata, circuitRows],
  );

  return (
    <>
      <aside className="left-panel">
        <div className="panel-content">
          <Suspense fallback={<div className="left-panel-empty"><strong>Ładowanie panelu PDF...</strong></div>}>
            <PdfDocumentationPage
              metadata={effectiveMetadata}
              symbols={symbols}
              rail={dinRail}
              onChange={handleMetadataChange}
              onResetDocumentation={handleResetDocumentation}
              selectedPreviewTab={pdfPreviewTab}
            />
          </Suspense>
        </div>
      </aside>

      <div className="canvas-area">
        <div className="pdf-workspace-shell" style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "row",
          background: "#0B0B0D",
          overflow: "hidden",
        }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#2E3238" }}>
            <Suspense fallback={<div className="pdf-preview-workspace__empty"><strong>Ładowanie arkusza A4...</strong></div>}>
              <MeasurementProtocolsWorkspacePage
                metadata={effectiveMetadata}
                circuitRows={circuitRows}
                onChange={handleMetadataChange}
                activeTab={pdfPreviewTab}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {showRightPanel && (
        <aside className="right-panel">
          <div className="panel-content">
            <div className="right-panel-content">
              <div className="pdf-right-panel-nav">
                {pdfDocumentationTabs.map((tab) => (
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
    </>
  );
}
