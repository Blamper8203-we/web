import { useEffect, useState } from "react";
import type {
  MeasurementProtocolsData,
} from "../types/projectMetadata";
import { buildCircuitListTableRows } from "../lib/circuitRows";
import { exportDinRailToDataURLWithOptions } from "../lib/export/dinRailSnapshotService";
import { exportSchematicToDataURL } from "../lib/export/schematicSnapshotService";
import { chunkRows } from "../lib/measurementProtocolHelpers";
import {
  CIRCUIT_LIST_ROWS_PER_PAGE,
  UNIFIED_ROWS_PER_PAGE,
} from "../lib/export/pdfPages/pdfHelpers";
import { usePdfWorkspace } from "./PdfWorkspaceShell";
import "./MeasurementProtocolsWorkspacePage.css";

// Podkomponenty
import { TitlePageTab } from "./measurementProtocols/TitlePageTab";
import { CircuitListTab } from "./measurementProtocols/CircuitListTab";
import { UnifiedProtocolsTab } from "./measurementProtocols/UnifiedProtocolsTab";
import { RcdProtocolsTab } from "./measurementProtocols/RcdProtocolsTab";
import { DinRailProtocolTab } from "./measurementProtocols/DinRailProtocolTab";
import { SchematicTab } from "./measurementProtocols/SchematicTab";

type ProtocolTableRowsMap = Pick<
  MeasurementProtocolsData,
  "rcdRows" | "unifiedRows"
>;
type ProtocolTableKey = keyof ProtocolTableRowsMap;



export function MeasurementProtocolsWorkspacePage() {
  const {
    metadata,
    symbols,
    dinRail: rail,
    circuitRows,
    handleMetadataChange: onChange,
    pdfPreviewTab: activeTab,
    connections,
  } = usePdfWorkspace();
  
  const [dinRailPreviewUrl, setDinRailPreviewUrl] = useState<string | null>(null);
  const [dinRailPreviewError, setDinRailPreviewError] = useState<string | null>(null);

  const [schematicImages, setSchematicImages] = useState<string[]>([]);
  const [schematicError, setSchematicError] = useState<string | null>(null);
  const [schematicIsLoading, setSchematicIsLoading] = useState(false);

  const protocols = metadata.measurementProtocols;
  const unifiedPages = chunkRows(protocols.unifiedRows, UNIFIED_ROWS_PER_PAGE);
  const circuitListRows = buildCircuitListTableRows(circuitRows);
  const circuitListPages = chunkRows(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE);

  useEffect(() => {
    if (activeTab !== "din-rail" && activeTab !== "din-rail-connections") {
      return;
    }

    let isCancelled = false;
    setDinRailPreviewUrl(null);
    setDinRailPreviewError(null);

    async function refreshDinRailPreview() {
      try {
        // Portrait preview mirrors the PDF (A4 portrait, rail horizontal). The cap
        // 800×1130 px ≈ 210mm × 297mm at 96 dpi.
        const options = activeTab === "din-rail"
          ? { drawConnections: false, scale: 2 }
          : { drawConnections: true, scale: 2 };
        const svgs = await exportDinRailToDataURLWithOptions(symbols, rail, options, connections);
        if (isCancelled) {
          return;
        }

        const previewSvg = svgs[0] ?? null;
        setDinRailPreviewUrl(previewSvg);
        if (!previewSvg) {
          setDinRailPreviewError("Brak widoku szyny DIN do pokazania w dokumentacji.");
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setDinRailPreviewError(
          error instanceof Error
            ? error.message
            : "Nie udało się przygotować widoku rozdzielnicy.",
        );
      }
    }

    void refreshDinRailPreview();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, symbols, rail, connections]);

  useEffect(() => {
    if (activeTab !== "schematic") {
      return;
    }

    let isCancelled = false;
    setSchematicImages([]);
    setSchematicError(null);
    setSchematicIsLoading(true);

    async function refreshSchematicPreview() {
      try {
        const images = await exportSchematicToDataURL(symbols, metadata);
        if (isCancelled) {
          return;
        }

        setSchematicImages(images);
        if (images.length === 0) {
          setSchematicError(
            "Brak schematu do pokazania — dodaj obwody, fazy i zabezpieczenia.",
          );
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSchematicError(
          error instanceof Error
            ? error.message
            : "Nie udało się przygotować schematu.",
        );
      } finally {
        if (!isCancelled) {
          setSchematicIsLoading(false);
        }
      }
    }

    void refreshSchematicPreview();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, symbols, metadata]);

  const updateProtocols = (patch: Partial<MeasurementProtocolsData>) => {
    onChange({
      ...metadata,
      measurementProtocols: {
        ...protocols,
        ...patch,
      },
      dateModified: new Date().toISOString(),
    });
  };

  const updateTableRows = <K extends ProtocolTableKey>(
    key: K,
    rows: ProtocolTableRowsMap[K],
  ) => {
    updateProtocols({ [key]: rows } as unknown as Pick<MeasurementProtocolsData, K>);
  };

  const updateTableRow = <K extends ProtocolTableKey>(
    key: K,
    index: number,
    field: string,
    value: string,
  ) => {
    const rows = protocols[key] as any[];
    const nextRows = rows.map((row, i) => (
      i === index ? { ...row, [field]: value } : row
    )) as unknown as ProtocolTableRowsMap[K];
    updateTableRows(key, nextRows);
  };

  const displayDate = metadata.drawingDate || new Date().toLocaleDateString("pl-PL");
  const protocolYear = new Date(displayDate).getFullYear() || new Date().getFullYear();
  const protocolNumber = metadata.projectNumber?.trim()
    ? `${metadata.projectNumber.trim()} / ${protocolYear}`
    : `....... / ${protocolYear}`;
  const objectType = metadata.titlePageObjectType || "Budynek jednorodzinny / Lokal mieszkalny";
  const stampText = metadata.contractorSignature || "PIECZĘĆ WYKONAWCY";

  // WHY: the page counter here mirrors PdfProtocolDocument's actual page output so
  // the footer "STRONA X Z Y" stays internally consistent. We MUST include
  // every section the PDF renders, otherwise the "Z Y" total under-counts and the
  // footer prints "STRONA 8 Z 7" for an 8-page document.
  let currentUiPage = 1;
  const titlePageIndex = currentUiPage++;
  currentUiPage++; // PdfProjectSummaryPage (always rendered when previewOnly is undefined)
  const circuitListStartPage = currentUiPage;
  currentUiPage += circuitListPages.length;
  const unifiedStartPage = currentUiPage;
  if (unifiedPages.length > 0) currentUiPage += unifiedPages.length;
  const rcdPageIndex = currentUiPage;
  if ((protocols.rcdRows?.length ?? 0) > 0) currentUiPage++;
  // WHY: schematic snapshots can span multiple A4 landscape sheets (one per circuit
  // group). We reserve at least 1 slot so totalUiPages stays consistent before the
  // async snapshot completes, then expand it once the real image count lands.
  const schematicStartPage = currentUiPage;
  currentUiPage += Math.max(1, schematicImages.length);
  const dinRailPageIndex = currentUiPage++;
  const totalUiPages = currentUiPage - 1;

  return (
    <div className="mp-page">
      <div className="mp-stage">
        {activeTab === "title-page" && (
          <TitlePageTab 
            metadata={metadata}
            onChange={onChange}
            displayDate={displayDate}
            protocolNumber={protocolNumber}
            stampText={stampText}
            titlePageIndex={titlePageIndex}
            totalUiPages={totalUiPages}
          />
        )}

        {activeTab === "circuit-list" && (
          <CircuitListTab 
            circuitListPages={circuitListPages}
            circuitListRowsCount={circuitListRows.length}
            displayDate={displayDate}
            objectType={objectType}
            circuitListStartPage={circuitListStartPage}
            totalUiPages={totalUiPages}
          />
        )}

        {(activeTab === "din-rail" || activeTab === "din-rail-connections") && (
          <DinRailProtocolTab
            dinRailPreviewUrl={dinRailPreviewUrl}
            dinRailPreviewError={dinRailPreviewError}
            displayDate={displayDate}
            objectType={objectType}
            dinRailPageIndex={activeTab === "din-rail-connections" ? dinRailPageIndex + 1 : dinRailPageIndex}
            totalUiPages={totalUiPages}
            mode={activeTab === "din-rail-connections" ? "connections" : "clean"}
          />
        )}

        {activeTab === "schematic" && (
          <SchematicTab
            schematicImages={schematicImages}
            schematicError={schematicError}
            displayDate={displayDate}
            objectType={objectType}
            schematicStartPage={schematicStartPage}
            totalUiPages={totalUiPages}
            isLoading={schematicIsLoading}
          />
        )}

        {activeTab === "unified" && (
          <UnifiedProtocolsTab 
            protocols={protocols}
            updateProtocols={updateProtocols}
            updateTableRow={updateTableRow}
            unifiedPages={unifiedPages}
            displayDate={displayDate}
            objectType={objectType}
            unifiedStartPage={unifiedStartPage}
            totalUiPages={totalUiPages}
          />
        )}

        {activeTab === "rcd-ground" && (
          <RcdProtocolsTab 
            protocols={protocols}
            updateProtocols={updateProtocols}
            updateTableRow={updateTableRow}
            displayDate={displayDate}
            objectType={objectType}
            rcdPageIndex={rcdPageIndex}
            totalUiPages={totalUiPages}
          />
        )}

        {/* Support for legacy pages (continuity, loop, insulation) to render similarly if not unified */}
        {["continuity", "loop", "insulation"].includes(activeTab) && (
          <div className="a4-page a4-page--landscape flex items-center justify-center text-gray-400">
            Protokoły klasyczne: układ nie otrzymał pełnej modernizacji Tailwindowej, zalecany styl zunifikowany. W PDF wyglądają poprawnie.
          </div>
        )}
      </div>
    </div>
  );
}
