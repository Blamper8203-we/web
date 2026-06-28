import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";
import { formatProtocolNumberLabel, formatProtocolTitle, protocolValue } from "./pdfHelpers";

interface PdfRcdTablePageProps {
  metadata: ProjectMetadata;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfRcdTablePage({
  metadata,
  displayDate,
  fallbackObjectName,
}: PdfRcdTablePageProps) {
  const rcdHeaderTitle = formatProtocolTitle(
    metadata.measurementProtocols?.rcdGroundHeader?.headerTitle || "Protokół Nr 04 / 2026",
    "",
  );
  const rcdProtocolNumberLabel = formatProtocolNumberLabel(rcdHeaderTitle);

  return (
    <Page size="A4" style={styles.titlePage}>
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb2]}>
        <View style={[styles.flexRow, styles.itemsCenter, { width: "70%" }]}>
          <View style={[styles.bgBrand, styles.px3, styles.py1, styles.rounded, styles.mr3]}>
            <Text style={[styles.textWhite, styles.fontBold, styles.textXs, styles.uppercase]}>RCD i uziemienie</Text>
          </View>
          <View>
            <Text style={[styles.textLg, styles.fontExtraBold, styles.textGray900, styles.uppercase]}>
              Protokół Pomiarów Nr <Text style={[styles.bgGray100, styles.px1, styles.rounded, styles.textBrand]}>{rcdProtocolNumberLabel}</Text>
            </Text>
            <Text style={[styles.textXs, styles.textGray500, styles.fontMedium, styles.mt1]}>Test wyłączników różnicowoprądowych RCD i pomiar rezystancji uziemienia</Text>
          </View>
        </View>
        <View style={[styles.textRight, { width: "28%" }]}>
          <Text style={[styles.textXs, styles.textGray400]}>Data pomiarów: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>Obiekt: <Text style={[styles.fontSemiBold, styles.textGray900]}>{fallbackObjectName}</Text></Text>
        </View>
      </View>

      <View style={styles.mt2}>
        <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>1. Dane techniczne i narzędzia pomiarowe</Text>
        </View>
        <View style={[styles.bgWhite, styles.p3, styles.border, styles.rounded, styles.flexRow, styles.flexWrap, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Miernik:</Text>
            <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.rcdGroundMeterName, "....................")}</Text>
          </View>
          <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Nr fabryczny:</Text>
            <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.rcdGroundMeterSerialNumber, "....................")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.mt4}>
        <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>2. Tabela pomiarów (Wyłączniki różnicowoprądowe)</Text>
        </View>
        <View style={[styles.border, { borderTopWidth: 0, borderBottomWidth: 0 }]}>
          <View style={[styles.flexRow, styles.bgGray50, styles.borderB]}>
            <View style={[styles.tableCellHeader, { width: "6%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Lp.</Text></View>
            <View style={[styles.tableCellHeader, { width: "24%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Typ RCD</Text></View>
            <View style={[styles.tableCellHeader, { width: "14%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>IΔn [mA]</Text></View>
            <View style={[styles.tableCellHeader, { width: "16%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Prąd wyzw. [mA]</Text></View>
            <View style={[styles.tableCellHeader, { width: "16%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Czas wyzw. [ms]</Text></View>
            <View style={[styles.tableCellHeader, { width: "14%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Przycisk TEST</Text></View>
            <View style={[styles.tableCellHeader, { width: "10%", borderRightWidth: 0, justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Ocena</Text></View>
          </View>
          {(metadata.measurementProtocols?.rcdRows ?? []).map((row, index) => {
            const bg = styles.bgWhite;
            return (
              <View style={[styles.flexRow, styles.borderB, bg]} key={index}>
                <View style={[styles.tableCell, { width: "6%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>{row.index}</Text></View>
                <View style={[styles.tableCell, { width: "24%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.deviceType}</Text></View>
                <View style={[styles.tableCell, { width: "14%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.residualCurrent}</Text></View>
                <View style={[styles.tableCell, { width: "16%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.tripCurrent}</Text></View>
                <View style={[styles.tableCell, { width: "16%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.tripTimeMs}</Text></View>
                <View style={[styles.tableCell, { width: "14%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textEmerald600]}>{row.testButtonResult}</Text></View>
                <View style={[styles.tableCell, { width: "10%", borderRightWidth: 0, justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textEmerald600]}>{row.assessment}</Text></View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.mt2}>
        <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>3. Pomiar rezystancji uziemienia (GSU)</Text>
        </View>
        <View style={[styles.bgWhite, styles.p3, styles.border, styles.rounded, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
          <View style={[styles.flexRow, styles.mb2]}>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Metoda pomiaru:</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.groundMeasurementMethod, "....................")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Rodzaj uziomu:</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.groundElectrodeType, "....................")}</Text>
            </View>
          </View>
          <View style={[styles.grid2, styles.mt2]}>
            <View style={[styles.flexRow, styles.itemsCenter]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray700, styles.mr2]}>Zmierzona wartość Ru:</Text>
              <Text style={[styles.textSm, styles.fontBlack, styles.textBrand]}>{protocolValue(metadata.measurementProtocols?.groundMeasuredResistance, "..........")}Ω</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray700, styles.mr2]}>Wartość wymagana:</Text>
              <Text style={[styles.textSm, styles.fontBold, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.groundRequiredResistance, "..........")}Ω</Text>
            </View>
          </View>
          <View style={[styles.mt2, styles.pt2, styles.borderT]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textGray800, styles.uppercase, styles.mb1]}>Orzeczenie techniczne:</Text>
            <View style={[styles.border, styles.rounded, styles.p2, styles.bgWhite]}>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray700, { lineHeight: 1.4 }]}>
                {protocolValue(metadata.measurementProtocols?.groundConclusionText, "Instalacja uziemiająca spełnia wymagania...")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.mtAuto]}>
        {metadata.isFormalDocumentationMode !== false ? (
          <View style={[styles.flexRow, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'flex-end' }]}>
            <View style={[styles.textCenter, { width: 250 }]}>
              <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na pieczęć / podpis</Text></View>
              <View style={[styles.borderT, styles.pt2]}>
                <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Sprawdził (Wykonawca/Elektryk)</Text>
                <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podpis osoby z uprawnieniami SEP</Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={[styles.textCenter, styles.mt6]} fixed>
          <Text
            style={[styles.textXs, styles.textGray400, styles.uppercase]}
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364`}
          />
        </View>
      </View>
    </Page>
  );
}
