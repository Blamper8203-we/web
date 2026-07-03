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
 *
 * Visual: each populated section becomes a numbered marker + free text block.
 * Empty state is a single muted callout — no bordered card needed.
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
    .map((section, idx) => ({ section, text: getSectionText(metadata, section.field), idx }))
    .filter((entry) => entry.text.length > 0);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageTopBar} fixed />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <View>
            <Text style={styles.eyebrow}>{t("pdf.docContentPage.eyebrow", "Dokumentacja techniczna")}</Text>
            <Text style={styles.pageTitle}>{t("pdf.docContentPage.title", "Opis techniczny instalacji")}</Text>
            <Text style={styles.pageSubtitle}>{t("pdf.docContentPage.subtitle", "Wypełnione sekcje opisu powykonawczego")}</Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdf.docContentPage.date", "Data")}</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
        </View>
      </View>

      {populatedSections.length === 0 ? (
        <View style={styles.callout}>
          <Text style={styles.calloutBody}>{t("pdf.docContentPage.emptyMessage", "Brak wypełnionych sekcji opisu.")}</Text>
        </View>
      ) : (
        populatedSections.map(({ section, text, idx }) => {
          const number = (idx + 1).toString().padStart(2, "0");
          return (
            <View key={section.field as string} wrap={false}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionNumber}>{number}</Text>
                <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
              </View>
              <View style={{ marginBottom: 16 }}>
                {text.split("\n").map((line, lineIdx) => (
                  <Text key={lineIdx} style={[styles.dataValue, { fontSize: 9.5, fontWeight: "normal", lineHeight: 1.6, color: "#334155" }]}>
                    {line.length > 0 ? line : " "}
                  </Text>
                ))}
              </View>
            </View>
          );
        })
      )}

      <View style={styles.pageFooter} fixed>
        <Text style={styles.pageFooterText}>{t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")}</Text>
        <Text
          style={styles.pageFooterText}
          render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `${pageNumber} / ${totalPages}` })}
        />
      </View>
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