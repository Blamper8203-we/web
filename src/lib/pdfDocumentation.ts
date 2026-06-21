import type {
  MeasurementProtocolHeaderSettings,
  ProjectMetadata,
  TitlePageChecklistItem,
} from "../types/projectMetadata";

export type PdfDocumentationPreviewTab =
  | "title-page"
  | "circuit-list"
  | "din-rail"
  | "din-rail-connections"
  | "schematic"
  | "unified"
  | "rcd-ground";

export const pdfDocumentationTabs: Array<{
  id: PdfDocumentationPreviewTab;
  label: string;
}> = [
  { id: "title-page", label: "Strona główna" },
  { id: "unified", label: "Tabela zbiorcza" },
  { id: "rcd-ground", label: "RCD i uziemienie" },
  { id: "circuit-list", label: "Lista obwodów" },
  { id: "din-rail", label: "Rozdzielnica elektryczna" },
  { id: "din-rail-connections", label: "Rozdzielnica połączenia" },
  { id: "schematic", label: "Schemat obwodów" },
];

export function getPdfDocumentationTabs(): Array<{
  id: PdfDocumentationPreviewTab;
  label: string;
}> {
  return pdfDocumentationTabs;
}

export function getProtocolLabel(tab: PdfDocumentationPreviewTab): string {
  switch (tab) {
    case "circuit-list":
      return "Lista obwodów";
    case "din-rail":
      return "Rozdzielnica elektryczna";
    case "din-rail-connections":
      return "Rozdzielnica połączenia";
    case "schematic":
      return "Schemat obwodów";
    case "unified":
      return "Tabela zbiorcza";
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
