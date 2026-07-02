import { Page, Text, View } from "@react-pdf/renderer";
import i18next from "i18next";
const t = i18next.t.bind(i18next);
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";

/**
 * WHY a separate page (not folded into TitlePage):
 *  - 7 sections of free-text documentation can easily overflow one page;
 *    a standalone page lets the renderer chunk them naturally.
 *  - Keeps TitlePage focused on identity / signatures / scope; this page
 *    holds the technical narrative.
 */
interface PdfDocumentationContentPageProps {
  metadata: ProjectMetadata;
  displayDate: string;
}

interface DocumentationSection {
  field: keyof ProjectMetadata;
  titleKey: string;
}

const DOCUMENTATION_SECTIONS: DocumentationSection[] = [
  { field: "documentationEquipmentList", titleKey: "pdf.docContentPage.sections.equipmentList" },
  { field: "documentationCableSelection", titleKey: "pdf.docContentPage.sections.cableSelection" },
  { field: "documentationTechnicalCalculations", titleKey: "pdf.docContentPage.sections.techCalculations" },
  { field: "documentationLegendAndSymbols", titleKey: "pdf.docContentPage.sections.legendAndSymbols" },
  { field: "documentationTechnicalDescription", titleKey: "pdf.docContentPage.sections.techDescription" },
  { field: "documentationShockProtection", titleKey: "pdf.docContentPage.sections.shockProtection" },
  { field: "documentationAcceptanceConditions", titleKey: "pdf.docContentPage.sections.acceptanceConditions" },
];

function getSectionText(metadata: ProjectMetadata, field: DocumentationSection["field"]): string {
  const value = metadata[field];
  return typeof value === "string" ? value.trim() : "";
}

export function PdfDocumentationContentPage({
  metadata,
  displayDate,
}: PdfDocumentationContentPageProps) {
  const populatedSections = DOCUMENTATION_SECTIONS
    .map((section) => ({ section, text: getSectionText(metadata, section.field) }))
    .filter((entry) => entry.text.length > 0);

  return (
    <Page size="A4" style={styles.page}>
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
        <View>
          <Text style={[styles.textLg, styles.fontBold, styles.textGray900, styles.uppercase]}>
            {t("pdf.docContentPage.title")}
          </Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>
            {t("pdf.docContentPage.subtitle")}
          </Text>
        </View>
        <View style={styles.textRight}>
          <Text style={[styles.textXs, styles.textGray400]}>
            {t("pdf.docContentPage.date")} <Text style={[styles.fontBold, styles.textGray700]}>{displayDate}</Text>
          </Text>
        </View>
      </View>

      {populatedSections.length === 0 ? (
        <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p4, styles.mt4]}>
          <Text style={[styles.textSm, styles.textGray500, styles.italic]}>
            {t("pdf.docContentPage.emptyMessage")}
          </Text>
        </View>
      ) : (
        populatedSections.map(({ section, text }) => (
          <View
            key={section.field}
            style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p3, styles.mt3]}
            wrap={false}
          >
            <Text style={[styles.textSm, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>
              {t(section.titleKey)}
            </Text>
            {text.split("\n").map((line, lineIdx) => (
              <Text key={lineIdx} style={[styles.textSm, styles.textGray900, { lineHeight: 1.5 }]}>
                {line.length > 0 ? line : " "}
              </Text>
            ))}
          </View>
        ))
      )}
    </Page>
  );
}

/**
 * Returns true when at least one of the `documentation*` fields has user
 * content. The PDF dispatcher uses this to decide whether to render the
 * page at all — an empty page is just noise that wastes paper.
 */
export function hasDocumentationContent(metadata: ProjectMetadata): boolean {
  return DOCUMENTATION_SECTIONS.some((section) => getSectionText(metadata, section.field).length > 0);
}