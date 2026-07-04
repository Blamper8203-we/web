import { Page, Text, View } from "@react-pdf/renderer";
import { Image as PdfImage } from "@react-pdf/renderer";
import i18next from "i18next";
const t = i18next.t.bind(i18next);
import { pdfStyles as styles } from "./pdfStyles";

interface PdfDinRailSnapshotPageProps {
  id?: string;
  imageDataUrl: string;
}

export function PdfDinRailSnapshotPage({ id, imageDataUrl }: PdfDinRailSnapshotPageProps) {
  // Przekazany dataUrl jest teraz generowany jako obraz PNG z canvas (exportDinRailToDataURLWithOptions)
  // zamiast natywnego SVG. `@react-pdf/renderer` wspiera poprawnie tylko obrazy rastrowe (PNG, JPG)
  // w znaczniku <Image>, w przeciwieństwie do zagnieżdżonych obrazów SVG.
  const dataUrl = imageDataUrl.startsWith("data:")
    ? imageDataUrl
    : `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(imageDataUrl)))}`;

  return (
    // WHY (portrait + minimal chrome): A4 portrait page with the rail image
    // taking the full content area. The previous version had a section-label
    // header above the image, which ate ~40pt of vertical space — on A4 portrait
    // that matters because the rail content is wide and the scaled image is
    // already short on the page.
    <Page id={id} size="A4" orientation="portrait" style={styles.page}>
      <View style={styles.pageTopBar} fixed />

      <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <PdfImage src={dataUrl} />
      </View>

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