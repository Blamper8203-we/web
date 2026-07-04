import { Page, View, Text, Link } from "@react-pdf/renderer";
import { pdfStyles, palette } from "./pdfStyles";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { hasDocumentationContent } from "./PdfDocumentationContentPage";
import i18next from "i18next";

const t = i18next.t.bind(i18next);

interface PdfTableOfContentsPageProps {
  metadata: ProjectMetadata;
  displayDate: string;
  hasCircuitList: boolean;
  hasUnified: boolean;
  hasRcd: boolean;
  schematicCount: number;
  dinRailCount: number;
}

export function PdfTableOfContentsPage({
  metadata,
  displayDate,
  hasCircuitList,
  hasUnified,
  hasRcd,
  schematicCount,
  dinRailCount,
}: PdfTableOfContentsPageProps) {
  let sectionNumber = 1;

  const TocItem = ({ title, anchor }: { title: string; anchor?: string }) => {
    const numStr = `${sectionNumber++}.`;
    return (
      <View style={[pdfStyles.flexRow, pdfStyles.itemsCenter, pdfStyles.mb3]}>
        <Text style={{ width: 30, fontSize: 11, fontWeight: "bold", color: palette.brand }}>
          {numStr}
        </Text>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: palette.ink, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {anchor ? <Link src={`#${anchor}`} style={{ color: palette.ink, textDecoration: "none" }}>{title}</Link> : title}
        </Text>
      </View>
    );
  };

  return (
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.pageTopBar} fixed />

      {/* HEADER */}
      <View style={pdfStyles.pageHeader} fixed>
        <View style={pdfStyles.pageHeaderLeft}>
          <View>
            <Text style={pdfStyles.eyebrow}>{metadata.projectNumber || t("pdf.toc.newOrder", "Nowe zlecenie")}</Text>
            <Text style={pdfStyles.pageTitle}>{t("pdf.toc.title", "Spis Treści")}</Text>
            <Text style={pdfStyles.pageSubtitle}>{t("pdf.toc.subtitle", "Struktura dokumentacji powykonawczej")}</Text>
          </View>
        </View>
        <View style={pdfStyles.pageHeaderRight}>
          <Text style={pdfStyles.metaLabel}>{t("pdf.header.date", "Data")}</Text>
          <Text style={pdfStyles.metaValue}>{displayDate}</Text>
        </View>
      </View>

      <View style={{ marginTop: 24, paddingHorizontal: 12 }}>
        <TocItem title={t("pdf.toc.summary", "Karta informacyjna i podsumowanie")} anchor="summary" />
        
        {hasDocumentationContent(metadata) && (
          <TocItem title={t("pdf.toc.documentation", "Opis techniczny instalacji")} anchor="documentation" />
        )}
        
        {hasCircuitList && (
          <TocItem title={t("pdf.toc.circuitList", "Zestawienie obwodów")} anchor="circuit-list" />
        )}
        
        {hasUnified && (
          <TocItem title={t("pdf.toc.unified", "Protokół pomiaru izolacji i impedancji pętli zwarcia")} anchor="unified" />
        )}
        
        {hasRcd && (
          <TocItem title={t("pdf.toc.rcd", "Protokół sprawdzenia wyłączników różnicowoprądowych")} anchor="rcd" />
        )}
        
        {schematicCount > 0 && (
          <TocItem title={t("pdf.toc.schematic", "Schemat jednokreskowy rozdzielnicy")} anchor="schematic" />
        )}
        
        {dinRailCount > 0 && (
          <TocItem title={t("pdf.toc.dinRail", "Widok elewacji szyn DIN")} anchor="din-rail" />
        )}
      </View>

      <View style={pdfStyles.pageFooter} fixed>
        <Text style={pdfStyles.pageFooterText}>{t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")}</Text>
        <Text style={pdfStyles.pageFooterText} render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `${pageNumber} / ${totalPages}` })} />
      </View>
    </Page>
  );
}
