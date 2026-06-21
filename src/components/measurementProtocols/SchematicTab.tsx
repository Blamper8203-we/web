interface SchematicTabProps {
  /**
   * Array of PNG data URLs, one per A4 landscape page of the schematic.
   * Empty array = no schematic available yet (show empty state).
   */
  schematicImages: string[];
  schematicError: string | null;
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
  isLoading,
}: SchematicTabProps) {
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
          <div
            key={`schematic-page-${index}`}
            className="a4-page a4-page--landscape"
          >
            <img
              src={src}
              alt={`Schemat obwodów — arkusz ${index + 1}`}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        ))
      ) : (
        <div className="a4-page a4-page--landscape" key="schematic-empty">
          <div className="mp-schematic-preview-empty">
            <strong>
              {schematicError
                ? "Nie udało się odświeżyć schematu."
                : isLoading
                  ? "Przygotowywanie schematu..."
                  : "Brak schematu do pokazania."}
            </strong>
            <span>
              {schematicError ??
                (isLoading
                  ? "Schemat generowany jest z dodanych obwodów, faz i zabezpieczeń."
                  : "Dodaj obwody, fazy i zabezpieczenia, aby zobaczyć schemat.")}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
