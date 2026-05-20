import { pdf } from "@react-pdf/renderer";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import { PdfProtocolDocument } from "../lib/export/PdfProtocolDocument";
import { calculateTotalDistribution } from "../lib/phaseDistribution/phaseDistributionCalculator";
import { validateProject } from "../lib/validation/electricalValidationService";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import "./PdfPreviewWorkspace.css";

type PdfPreviewWorkspaceProps = {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  rail: DinRailCanvasRail;
  activeTab?: string;
};

const PREVIEW_DEBOUNCE_MS = 180;

export function PdfPreviewWorkspace({
  metadata,
  symbols,
  rail: _rail,
  activeTab = "title-page",
}: PdfPreviewWorkspaceProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);

  const phaseDistribution = useMemo(() => calculateTotalDistribution(symbols), [symbols]);
  const validationResult = useMemo(
    () =>
      validateProject(symbols, {
        supplyVoltageV: metadata.supplyVoltageV,
        mainBreakerA: metadata.mainBreakerA,
      }),
    [symbols, metadata.supplyVoltageV, metadata.mainBreakerA],
  );

  const frameSrc = useMemo(() => {
    if (!blobUrl) {
      return null;
    }

    return `${blobUrl}#toolbar=1&navpanes=0&scrollbar=0&view=FitH`;
  }, [blobUrl]);

  useEffect(() => {
    let cancelled = false;
    const currentRequestId = ++requestIdRef.current;
    let debounceTimer: number | null = null;

    async function renderPreview() {
      setIsRendering(true);
      setErrorMessage(null);

      try {
        await new Promise((resolve) => {
          debounceTimer = window.setTimeout(resolve, PREVIEW_DEBOUNCE_MS);
        });

        if (cancelled || currentRequestId !== requestIdRef.current) {
          return;
        }

        const blob = await pdf(
          <PdfProtocolDocument
            metadata={metadata}
            symbols={symbols}
            phaseDistribution={phaseDistribution}
            validationResult={validationResult}
            schematicImages={[]}
            dinRailImages={[]}
            previewOnly={activeTab}
          />,
        ).toBlob();

        if (cancelled || currentRequestId !== requestIdRef.current) {
          return;
        }

        const nextBlobUrl = URL.createObjectURL(blob);
        setBlobUrl((previousBlobUrl) => {
          if (previousBlobUrl) {
            URL.revokeObjectURL(previousBlobUrl);
          }

          blobUrlRef.current = nextBlobUrl;
          return nextBlobUrl;
        });
      } catch (error) {
        if (cancelled || currentRequestId !== requestIdRef.current) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Nie udało się wygenerować podglądu PDF.",
        );
      } finally {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setIsRendering(false);
        }
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
    };
  }, [metadata, symbols, phaseDistribution, validationResult, activeTab]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  return (
    <section className="pdf-preview-workspace">
      <div className="pdf-preview-workspace__stage pdf-preview-workspace__stage--flush">
        {frameSrc ? (
          <>
            <iframe
              className="pdf-preview-workspace__frame"
              src={frameSrc}
              title="Podgląd PDF dokumentacji"
            />
            {errorMessage && (
              <div className="pdf-preview-workspace__error-overlay">
                Nie udało się odświeżyć podglądu. Wyświetlam ostatnią poprawną wersję.
              </div>
            )}
            {isRendering && (
              <div className="pdf-preview-workspace__loading-overlay">Odświeżanie...</div>
            )}
          </>
        ) : isRendering ? (
          <div className="pdf-preview-workspace__empty">
            <strong>Generowanie PDF...</strong>
            <span>Odświeżam podgląd.</span>
          </div>
        ) : (
          <div className="pdf-preview-workspace__empty">
            <strong>Podgląd nie jest jeszcze gotowy.</strong>
            <span>{errorMessage ?? "Wprowadź dane, aby wygenerować dokument."}</span>
          </div>
        )}
      </div>
    </section>
  );
}
