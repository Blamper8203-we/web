import type {
  MeasurementProtocolHeaderSettings,
  ProjectMetadata,
  TitlePageChecklistItem,
} from "../types/projectMetadata";

export type PdfDocumentationPreviewTab =
  | "title-page"
  | "circuit-list"
  | "din-rail"
  | "unified"
  | "continuity"
  | "loop"
  | "insulation"
  | "rcd-ground";

export const pdfDocumentationTabs: Array<{
  id: PdfDocumentationPreviewTab;
  label: string;
}> = [
  { id: "title-page", label: "Strona główna" },
  { id: "continuity", label: "Ciągłość PE" },
  { id: "loop", label: "Pętla zwarcia" },
  { id: "insulation", label: "Rezystancja izolacji" },
  { id: "rcd-ground", label: "RCD i uziemienie" },
  { id: "circuit-list", label: "Lista obwodów" },
  { id: "din-rail", label: "Rozdzielnica elektryczna" },
];

export function getPdfDocumentationTabs(style: "separate" | "unified"): Array<{
  id: PdfDocumentationPreviewTab;
  label: string;
}> {
  if (style === "unified") {
    return [
      { id: "title-page", label: "Strona główna" },
      { id: "unified", label: "Tabela zbiorcza" },
      { id: "rcd-ground", label: "RCD i uziemienie" },
      { id: "circuit-list", label: "Lista obwodów" },
      { id: "din-rail", label: "Rozdzielnica elektryczna" },
    ];
  }
  return pdfDocumentationTabs;
}

export function getProtocolLabel(tab: PdfDocumentationPreviewTab): string {
  switch (tab) {
    case "circuit-list":
      return "Lista obwodów";
    case "din-rail":
      return "Rozdzielnica elektryczna";
    case "unified":
      return "Tabela zbiorcza";
    case "continuity":
      return "Ciągłość PE";
    case "loop":
      return "Pętla zwarcia";
    case "insulation":
      return "Rezystancja izolacji";
    case "rcd-ground":
      return "RCD i uziemienie";
    default:
      return "Strona główna";
  }
}

export function buildWorkScopeText(items: TitlePageChecklistItem[]): string {
  return items
    .map((item) => (item.isChecked ? item.text : `[ ] ${item.text}`))
    .join("\n");
}

export function buildAttachmentText(items: string[]): string {
  return items.join("\n");
}

export function parseChecklistItems(text: string): TitlePageChecklistItem[] {
  if (!text.trim()) {
    return [];
  }

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const isChecked = !line.startsWith("[ ]");
      const normalized = line
        .replace(/\[x\]/gi, "")
        .replace(/\[ \]/gi, "")
        .replace(/^[-*]\s*/, "")
        .trim();

      return {
        text: normalized,
        isChecked,
      };
    })
    .filter((item) => item.text.length > 0);
}

export function parseLineList(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((item, index, array) => {
      const lower = item.toLocaleLowerCase("pl-PL");
      return array.findIndex((candidate) => candidate.toLocaleLowerCase("pl-PL") === lower) === index;
    });
}

export function getSelectedProtocolHeader(
  metadata: ProjectMetadata,
  tab: PdfDocumentationPreviewTab,
): MeasurementProtocolHeaderSettings | null {
  switch (tab) {
    case "unified":
      return metadata.measurementProtocols.unifiedHeader;
    case "continuity":
      return metadata.measurementProtocols.continuityHeader;
    case "loop":
      return metadata.measurementProtocols.loopHeader;
    case "insulation":
      return metadata.measurementProtocols.insulationHeader;
    case "rcd-ground":
      return metadata.measurementProtocols.rcdGroundHeader;
    default:
      return null;
  }
}

export function updateSelectedProtocolHeader(
  metadata: ProjectMetadata,
  tab: PdfDocumentationPreviewTab,
  nextHeader: MeasurementProtocolHeaderSettings,
): ProjectMetadata {
  switch (tab) {
    case "unified":
      return {
        ...metadata,
        measurementProtocols: {
          ...metadata.measurementProtocols,
          unifiedHeader: nextHeader,
        },
      };
    case "continuity":
      return {
        ...metadata,
        measurementProtocols: {
          ...metadata.measurementProtocols,
          continuityHeader: nextHeader,
        },
      };
    case "loop":
      return {
        ...metadata,
        measurementProtocols: {
          ...metadata.measurementProtocols,
          loopHeader: nextHeader,
        },
      };
    case "insulation":
      return {
        ...metadata,
        measurementProtocols: {
          ...metadata.measurementProtocols,
          insulationHeader: nextHeader,
        },
      };
    case "rcd-ground":
      return {
        ...metadata,
        measurementProtocols: {
          ...metadata.measurementProtocols,
          rcdGroundHeader: nextHeader,
        },
      };
    default:
      return metadata;
  }
}
