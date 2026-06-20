import { Page, Text, View } from "@react-pdf/renderer";
import type { CircuitListTableRow } from "../../circuitRows";
import { pdfStyles as styles } from "./pdfStyles";
import { EMPTY_FIELD_PLACEHOLDER } from "./pdfHelpers";

interface PdfCircuitListPageProps {
  chunk: CircuitListTableRow[];
  chunkIdx: number;
  totalChunks: number;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfCircuitListPage({
  chunk,
  chunkIdx,
  totalChunks,
  displayDate,
  fallbackObjectName,
}: PdfCircuitListPageProps) {
  return (
    <Page size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
        <View style={[styles.flexRow, styles.itemsCenter, { width: "72%" }]}>
          <View style={[styles.bgBrand, styles.px3, styles.py1, styles.rounded, styles.mr3]}>
            <Text style={[styles.textWhite, styles.fontBold, styles.textXs, styles.uppercase]}>Lista obwodów</Text>
          </View>
          <View>
            <Text style={[styles.textLg, styles.fontExtraBold, styles.textGray900, styles.uppercase]}>
              Zestawienie obwodów instalacji elektrycznej
            </Text>
            <Text style={[styles.textXs, styles.textGray500, styles.fontMedium, styles.mt1]}>
              Arkusz {chunkIdx + 1} z {totalChunks}
            </Text>
          </View>
        </View>
        <View style={[styles.textRight, { width: "26%" }]}>
          <Text style={[styles.textXs, styles.textGray400]}>Data: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>Obiekt: <Text style={[styles.fontSemiBold, styles.textGray900]}>{fallbackObjectName}</Text></Text>
        </View>
      </View>

      <View style={styles.mt4}>
        <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>
            {chunkIdx === 0 ? "1. Lista obwodów" : `1. Lista obwodów (ciąg dalszy ${chunkIdx + 1})`}
          </Text>
        </View>
        <View style={[styles.border, { borderTopWidth: 0, borderBottomWidth: 0 }]}>
          <View style={[styles.flexRow, styles.bgGray50, styles.borderB]}>
            <View style={[styles.tableCellHeader, { width: "4%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Lp.</Text></View>
            <View style={[styles.tableCellHeader, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Ozn.</Text></View>
            <View style={[styles.tableCellHeader, { width: "20%" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Nazwa obwodu</Text></View>
            <View style={[styles.tableCellHeader, { width: "13%" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Lokalizacja</Text></View>
            <View style={[styles.tableCellHeader, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Faza</Text></View>
            <View style={[styles.tableCellHeader, { width: "12%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Zabezp.</Text></View>
            <View style={[styles.tableCellHeader, { width: "14%" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>RCD</Text></View>
            <View style={[styles.tableCellHeader, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Przewód</Text></View>
            <View style={[styles.tableCellHeader, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Dł. [m]</Text></View>
            <View style={[styles.tableCellHeader, { width: "7%", borderRightWidth: 0, alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Moc</Text></View>
          </View>

          {chunk.map(({ index, location, rcdLabel, rcdProtection, row }) => (
            <View style={[styles.flexRow, styles.borderB, styles.bgWhite]} key={row.id}>
              <View style={[styles.tableCell, { width: "4%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>{index}</Text></View>
              <View style={[styles.tableCell, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900]}>{row.referenceDesignation || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "20%" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.circuitName || row.label || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "13%" }]}><Text style={[styles.textXs, styles.textGray600]}>{location || row.displayLocation || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.phase || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "12%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.displayProtection || row.protectionType || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "14%" }]}>
                <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900]}>{rcdLabel || EMPTY_FIELD_PLACEHOLDER}</Text>
                {rcdProtection ? <Text style={[styles.textXs, styles.textGray500]}>{rcdProtection}</Text> : null}
              </View>
              <View style={[styles.tableCell, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.cableCrossSection ? `${row.cableCrossSection} mm²` : EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.cableLength || EMPTY_FIELD_PLACEHOLDER}</Text></View>
              <View style={[styles.tableCell, { width: "7%", borderRightWidth: 0, alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.powerW || EMPTY_FIELD_PLACEHOLDER}</Text></View>
            </View>
          ))}

          {chunk.length === 0 && (
            <View style={[styles.tableCell, { borderRightWidth: 0, alignItems: "center" }]}>
              <Text style={[styles.textXs, styles.textGray500]}>Brak obwodów do pokazania.</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.mtAuto, styles.textCenter, styles.borderT, styles.pt4]} fixed>
        <Text
          style={[styles.textXs, styles.textGray400, styles.uppercase]}
          render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364`}
        />
      </View>
    </Page>
  );
}
