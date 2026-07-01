import { Page, Text, View } from "@react-pdf/renderer";
import { Image as PdfImage } from "@react-pdf/renderer";
import { t } from "i18next";
import { pdfStyles as styles } from "./pdfStyles";

interface PdfDinRailSnapshotPageProps {
  imageDataUrl: string;
}

export function PdfDinRailSnapshotPage({ imageDataUrl }: PdfDinRailSnapshotPageProps) {
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
    <Page size="A4" orientation="portrait" style={styles.page}>
      <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <PdfImage src={dataUrl} />
      </View>
      <View style={[styles.textCenter, styles.mt4]} fixed>
        <Text
          style={[styles.textXs, styles.textGray400, styles.uppercase]}
          render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages })}
        />
      </View>
    </Page>
  );
}
