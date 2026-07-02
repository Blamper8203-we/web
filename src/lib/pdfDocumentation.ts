import { t } from "i18next";
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
}> = [
  { id: "title-page" },
  { id: "unified" },
  { id: "rcd-ground" },
  { id: "circuit-list" },
  { id: "din-rail" },
  { id: "din-rail-connections" },
  { id: "schematic" },
];

export function getPdfDocumentationTabs(): Array<{
  id: PdfDocumentationPreviewTab;
}> {
  return pdfDocumentationTabs;
}

export function getProtocolLabel(tab: PdfDocumentationPreviewTab): string {
  switch (tab) {
    case "circuit-list":
      return t("pdf.tabs.circuit-list", "Lista obwodów");
    case "din-rail":
      return t("pdf.tabs.din-rail", "Rozdzielnica elektryczna");
    case "din-rail-connections":
      return t("pdf.tabs.din-rail-connections", "Rozdzielnica połączenia");
    case "schematic":
      return t("pdf.tabs.schematic", "Schemat obwodów");
    case "unified":
      return t("pdf.tabs.unified", "Tabela zbiorcza");
    case "rcd-ground":
      return t("pdf.tabs.rcd-ground", "RCD i uziemienie");
    default:
      return t("pdf.tabs.title-page", "Strona główna");
  }
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
