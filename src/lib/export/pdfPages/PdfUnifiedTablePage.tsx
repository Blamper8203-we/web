import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import type { MeasurementUnifiedProtocolRow } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";
import { formatProtocolNumberLabel, formatProtocolTitle, getSuffix, protocolValue } from "./pdfHelpers";

interface PdfUnifiedTablePageProps {
  metadata: ProjectMetadata;
  chunk: MeasurementUnifiedProtocolRow[];
  chunkIdx: number;
  totalChunks: number;
  displayDate: string;
  fallbackObjectName: string;
}

export function PdfUnifiedTablePage({
  metadata,
  chunk,
  chunkIdx,
  totalChunks,
  displayDate,
  fallbackObjectName,
}: PdfUnifiedTablePageProps) {
  const suffix = getSuffix(totalChunks, chunkIdx);
  const originalTitle = metadata.measurementProtocols?.unifiedHeader?.headerTitle || "Protokół Nr 01 / 2026";
  const chunkHeaderTitle = formatProtocolTitle(originalTitle, suffix);
  const chunkProtocolNumberLabel = formatProtocolNumberLabel(chunkHeaderTitle);
  const isFirstPage = chunkIdx === 0;
  const isLastPage = chunkIdx === totalChunks - 1;

  return (
    <Page size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
        <View style={[styles.flexRow, styles.itemsCenter, { width: "72%" }]}>
          <View style={[styles.bgBrand, styles.px3, styles.py1, styles.rounded, styles.mr3]}>
            <Text style={[styles.textWhite, styles.fontBold, styles.textXs, styles.uppercase]}>Tabela zbiorcza</Text>
          </View>
          <View>
            <Text style={[styles.textLg, styles.fontExtraBold, styles.textGray900, styles.uppercase]}>
              Protokół Pomiarów Nr <Text style={[styles.bgGray100, styles.px1, styles.rounded, styles.textBrand]}>{chunkProtocolNumberLabel}</Text>
            </Text>
            <Text style={[styles.textXs, styles.textGray500, styles.fontMedium, styles.mt1]}>Zbiorcze wyniki pomiarów pętli zwarcia i rezystancji izolacji</Text>
          </View>
        </View>
        <View style={[styles.textRight, { width: "26%" }]}>
          <Text style={[styles.textXs, styles.textGray400]}>Data pomiarów: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>Obiekt: <Text style={[styles.fontSemiBold, styles.textGray900]}>{fallbackObjectName}</Text></Text>
        </View>
      </View>

      {isFirstPage && (
        <View style={styles.mt4}>
          <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>1. Dane techniczne i narzędzia pomiarowe</Text>
          </View>
          <View style={[styles.bgWhite, styles.p3, styles.border, styles.rounded, styles.flexRow, styles.flexWrap, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Miernik (Pętla):</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.loopMeterName, "....................")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Miernik (Izolacja):</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.insulationMeterName, "....................")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Nr ser. (Pętla):</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.loopMeterSerialNumber, "....................")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Nr ser. (Izolacja):</Text>
              <Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{protocolValue(metadata.measurementProtocols?.insulationMeterSerialNumber, "....................")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Napięcie sieci:</Text>
              <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900, styles.bgGray100, styles.px1, styles.rounded]}>{protocolValue(metadata.measurementProtocols?.loopNetworkVoltage, "230/400V")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%", marginBottom: 8 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Układ sieci:</Text>
              <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900, styles.bgGray100, styles.px1, styles.rounded]}>{protocolValue(metadata.measurementProtocols?.loopNetworkSystem, "TN-S / TN-C-S")}</Text>
            </View>
            <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Napięcie próby:</Text>
              <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900, styles.bgGray100, styles.px1, styles.rounded]}>{protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.mt4}>
        <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>{isFirstPage ? "2. Zbiorcze wyniki pomiarów obwodów" : `2. Zbiorcze wyniki pomiarów obwodów (ciąg dalszy ${chunkIdx + 1})`}</Text>
        </View>
        
        <View style={[styles.border, { borderTopWidth: 0, borderBottomWidth: 0 }]}>
          <View style={[styles.flexRow, styles.bgGray50, styles.borderB]}>
            <View style={[styles.tableCellHeader, { width: "4%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Lp.</Text></View>
            <View style={[styles.tableCellHeader, { width: "20%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Nazwa obwodu</Text></View>
            <View style={[styles.tableCellHeader, { width: "12%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Lokalizacja</Text></View>
            <View style={[styles.tableCellHeader, { width: "8%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700, styles.textCenter]}>In</Text></View>
            <View style={[styles.tableCellHeader, { width: "22%", padding: 0 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray700, styles.textCenter, styles.p1, styles.borderB]}>Riso [MΩ] (Wym. {metadata.measurementProtocols?.groundRequiredResistance || "> 1.0"})</Text>
              <View style={[styles.flexRow, styles.bgWhite]}>
                <View style={[styles.flex1, styles.borderR, styles.p1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>L-N</Text></View>
                <View style={[styles.flex1, styles.borderR, styles.p1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>L-PE</Text></View>
                <View style={[styles.flex1, styles.p1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>N-PE</Text></View>
              </View>
            </View>
            <View style={[styles.tableCellHeader, { width: "22%", padding: 0 }]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textGray700, styles.textCenter, styles.p1, styles.borderB]}>Pętla zwarcia</Text>
              <View style={[styles.flexRow, styles.bgWhite]}>
                <View style={[styles.flex1, styles.borderR, styles.p1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>Zs [Ω]</Text></View>
                <View style={[styles.flex1, styles.p1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>Zadm [Ω]</Text></View>
              </View>
            </View>
            <View style={[styles.tableCellHeader, { width: "12%", borderRightWidth: 0, justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontBold, styles.textGray700]}>Ocena</Text></View>
          </View>

          {chunk.map((row, index) => {
            const bg = styles.bgWhite;
            return (
              <View style={[styles.flexRow, styles.borderB, bg]} key={index}>
                <View style={[styles.tableCell, { width: "4%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500]}>{row.index}</Text></View>
                <View style={[styles.tableCell, { width: "20%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.circuitName}</Text></View>
                <View style={[styles.tableCell, { width: "12%", justifyContent: "center" }]}><Text style={[styles.textXs, styles.textGray600]}>{row.location}</Text></View>
                <View style={[styles.tableCell, { width: "8%", justifyContent: "center", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.protectionType}</Text></View>
                
                {/* Riso columns */}
                <View style={[styles.flexRow, { width: "22%" }]}>
                  <View style={[styles.tableCell, styles.flex1, styles.justifyCenter, styles.itemsCenter, { backgroundColor: "#EFF6FF" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.lnResistance}</Text></View>
                  <View style={[styles.tableCell, styles.flex1, styles.justifyCenter, styles.itemsCenter, { backgroundColor: "#EFF6FF" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.lpeResistance}</Text></View>
                  <View style={[styles.tableCell, styles.flex1, styles.justifyCenter, styles.itemsCenter, { backgroundColor: "#EFF6FF" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.npeResistance}</Text></View>
                </View>
                
                {/* Loop columns */}
                <View style={[styles.flexRow, { width: "22%" }]}>
                  <View style={[styles.tableCell, styles.flex1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.measuredImpedance}</Text></View>
                  <View style={[styles.tableCell, styles.flex1, styles.justifyCenter, styles.itemsCenter]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.allowedImpedance}</Text></View>
                </View>
                
                <View style={[styles.tableCell, { width: "12%", borderRightWidth: 0, justifyContent: "center", alignItems: "center" }]}>
                  <Text style={[styles.textXs, styles.fontSemiBold, row.assessment === "Pozytywna" ? styles.textEmerald600 : styles.textGray900]}>{row.assessment}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {isLastPage && (
        <View style={[styles.mt4]}>
          <Text style={[styles.textXs, styles.textGray500, styles.mb1]}><Text style={styles.fontBold}>Uwaga:</Text> Wszystkie odbiorniki elektryczne na czas pomiaru rezystancji izolacji zostały odłączone. Pomiary przeprowadzono przy napięciu probierczym stałym {protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}.</Text>
          <Text style={[styles.textXs, styles.textGray500]}><Text style={styles.fontBold}>Legenda:</Text> In - prąd znamionowy zabezpieczenia, Zs - zmierzona impedancja pętli zwarcia, Zadm - maksymalna dopuszczalna impedancja pętli zwarcia warunkująca szybkie wyłączenie.</Text>
        </View>
      )}

      {isLastPage && metadata.measurementProtocols?.recommendationsText && (
        <View style={styles.mt4}>
          <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>3. Zalecenia</Text>
          </View>
          <View style={[styles.bgWhite, styles.p3, styles.border, styles.rounded, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <Text style={[styles.textXs, styles.textGray900, styles.fontMedium, { lineHeight: 1.5 }]}>{metadata.measurementProtocols.recommendationsText}</Text>
          </View>
        </View>
      )}

      <View style={[styles.mtAuto]}>
        <View style={[styles.flexRow, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'flex-end' }]}>
          <View style={[styles.textCenter, { width: 250 }]}>
            <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na pieczęć / podpis</Text></View>
            <View style={[styles.borderT, styles.pt2]}>
              <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Sprawdził (Wykonawca/Elektryk)</Text>
              <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podpis osoby z uprawnieniami SEP</Text>
            </View>
          </View>
        </View>
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
