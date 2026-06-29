import { Page, Text, View } from "@react-pdf/renderer";
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
  title: string;
}

const DOCUMENTATION_SECTIONS: DocumentationSection[] = [
  { field: "documentationEquipmentList", title: "Spis urządzeń i osprzętu" },
  { field: "documentationCableSelection", title: "Dobór kabli i zabezpieczeń" },
  { field: "documentationTechnicalCalculations", title: "Obliczenia techniczne" },
  { field: "documentationLegendAndSymbols", title: "Legenda i symbole" },
  { field: "documentationTechnicalDescription", title: "Opis techniczny instalacji" },
  { field: "documentationShockProtection", title: "Ochrona przeciwporażeniowa" },
  { field: "documentationAcceptanceConditions", title: "Warunki odbioru i uwagi" },
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
            Dokumentacja projektu
          </Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>
            Opis techniczny, dobór, obliczenia i warunki odbioru
          </Text>
        </View>
        <View style={styles.textRight}>
          <Text style={[styles.textXs, styles.textGray400]}>
            Data: <Text style={[styles.fontBold, styles.textGray700]}>{displayDate}</Text>
          </Text>
        </View>
      </View>

      {populatedSections.length === 0 ? (
        <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p4, styles.mt4]}>
          <Text style={[styles.textSm, styles.textGray500, styles.italic]}>
            Brak wypełnionych sekcji opisu. Uzupełnij pola „Opis techniczny", „Dobór kabli",
            „Obliczenia" i pokrewne w Ustawieniach projektu, aby dołączyć je do dokumentacji PDF.
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
              {section.title}
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