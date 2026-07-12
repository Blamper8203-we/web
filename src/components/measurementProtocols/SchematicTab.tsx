import { PinchZoomImage } from "./PinchZoomImage";
import A4ScaledPage from "../A4ScaledPage";
import { useTranslation } from "react-i18next";

interface SchematicTabProps {
  /**
   * Array of PNG data URLs, one per A4 landscape page of the schematic.
   * Empty array = no schematic available yet (show empty state).
   */
  schematicImages: string[];
  schematicError: string | null;
  onRetry?: () => void;
  displayDate: string;
  objectType: string;
  /**
   * Page index in the global "Strona X z Y" counter where the FIRST
   * schematic page lands. Subsequent pages increment from here.
   */
  schematicStartPage: number;
  totalUiPages: number;
  /**
   * Whether the schematic snapshot is currently being generated.
   */
  isLoading: boolean;
}

export function SchematicTab({
  schematicImages,
  schematicError,
  onRetry,
  isLoading,
}: SchematicTabProps) {
  const { t } = useTranslation();
  const hasImages = schematicImages.length > 0;

  return (
    <>
      {hasImages ? (
        // WHY: exportSchematicToDataURL renders each schematic page as a FULL
        // A4 landscape sheet (297×210mm) — header, circuit diagram, terminal
        // legend table, and page footer are all baked into the PNG by
        // renderSchematic. Wrapping that PNG in another header/footer inside
        // .a4-page produced a duplicated "SCHEMAT OBWODÓW" badge and a second
        // page counter stacked on top of the one already in the image. The
        // PDF export (PdfProtocolDocument) does the same thing one layer down
        // — it embeds the image as-is, with no extra chrome. The workspace
        // preview must match the PDF, so we drop our own chrome too. The
        // .a4-page container (with its 15mm padding) still provides the
        // visual margin and acts as the printable sheet boundary.
        schematicImages.map((src, index) => (
          <A4ScaledPage orientation="landscape" key={`schematic-page-${index}`}>
            <div className="a4-page a4-page--landscape">
              <PinchZoomImage
                src={src}
                alt={t("app.pdf.schematic.alt", "Schemat obwodów — arkusz {{page}}", { page: index + 1 })}
                className="mp-zoom-preview"
              />
            </div>
          </A4ScaledPage>
        ))
      ) : (
        <A4ScaledPage orientation="landscape" key="schematic-empty">
        <div className="a4-page a4-page--landscape">
          <div className="mp-schematic-preview-empty">
            <strong>
              {schematicError
                ? t("app.pdf.schematic.errorTitle", "Nie udało się odświeżyć schematu.")
                : isLoading
                  ? t("app.pdf.schematic.loadingTitle", "Przygotowywanie schematu...")
                  : t("app.pdf.schematic.emptyTitle", "Brak schematu do pokazania.")}
            </strong>
            <span>
              {schematicError ??
                (isLoading
                  ? t("app.pdf.schematic.loadingDesc", "Schemat generowany jest z dodanych obwodów, faz i zabezpieczeń.")
                  : t("app.pdf.schematic.emptyDesc", "Dodaj obwody, fazy i zabezpieczenia, aby zobaczyć schemat."))}
            </span>
            {schematicError && onRetry ? (
              <button
                type="button"
                className="accent-btn"
                onClick={onRetry}
                style={{ marginTop: "var(--space-3, 12px)" }}
              >
                {t("app.pdf.shared.retry", "Spróbuj ponownie")}
              </button>
            ) : null}
          </div>
        </div>
        </A4ScaledPage>
      )}
    </>
  );
}
