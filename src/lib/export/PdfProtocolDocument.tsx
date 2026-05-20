import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MeasurementProtocolHeaderSettings, ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { PhaseDistributionResult } from "../phaseDistribution/phaseDistributionCalculator";
import { formatDateForField } from "../projectMetadata";
import type { ValidationResult } from "../validation/electricalValidationService";

Font.register({
  family: "Arial",
  fonts: [
    { src: "/fonts/arial.ttf" },
    { src: "/fonts/arialbd.ttf", fontWeight: "bold" },
    { src: "/fonts/ariali.ttf", fontStyle: "italic" },
    {
      src: "/fonts/arialbi.ttf",
      fontWeight: "bold",
      fontStyle: "italic",
    },
  ],
});

const UI_SCALE = 0.75;

const COLORS = {
  FrameColor: "#18263F",
  DividerColor: "#D7DFEA",
  CardBorderColor: "#D9E3EF",
  BackgroundColor: "#F8FBFF",
  TextColor: "#0F172A",
  MutedColor: "#526174",
  AccentColor: "#1D4ED8",
  CheckMarkGreen: "#2FBF3A",
  White: "#FFFFFF",
  PrimaryColor: "#1F2937",
  AccentGreen: "#10B981",
  AccentOrange: "#0D79F2",
  TableEven: "#F9FAFB",
  TableOdd: "#FFFFFF",
} as const;

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Arial", color: COLORS.TextColor },
  landscapePage: { padding: 30, fontFamily: "Arial", color: COLORS.TextColor },
  titlePage: { padding: 4, fontFamily: "Arial", color: COLORS.TextColor },
  titleContainer: {
    border: `1.5pt solid ${COLORS.FrameColor}`,
    padding: 18,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  logoBox: {
    width: 84,
    height: 42,
    border: `1pt solid ${COLORS.CardBorderColor}`,
    padding: 6,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: { alignItems: "center", marginVertical: 22 },
  card: { border: `1pt solid ${COLORS.CardBorderColor}`, padding: 12, backgroundColor: COLORS.White },
  cardLight: {
    border: `1pt solid ${COLORS.CardBorderColor}`,
    padding: 12,
    backgroundColor: COLORS.BackgroundColor,
  },
  cardTitle: { fontSize: 9 * UI_SCALE, color: COLORS.MutedColor, fontWeight: "bold", marginBottom: 6 },
  infoRow: { flexDirection: "row", marginBottom: 6 },
  infoLabel: { width: 78, fontSize: 9.5 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor },
  infoValue: {
    flex: 1,
    fontSize: 10.4 * UI_SCALE,
    fontWeight: "bold",
    color: COLORS.TextColor,
    borderBottom: `1pt solid ${COLORS.CardBorderColor}`,
    paddingBottom: 2,
  },
  divider: { height: 1, backgroundColor: COLORS.DividerColor, marginVertical: 6 },
  signatureBox: { alignItems: "center", flex: 1 },
  stampBox: {
    width: 88,
    height: 58,
    border: `1pt solid ${COLORS.CardBorderColor}`,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14 * UI_SCALE,
    fontWeight: "bold",
    color: COLORS.PrimaryColor,
    marginTop: 20,
    marginBottom: 10,
    borderBottom: `1pt solid ${COLORS.DividerColor}`,
    paddingBottom: 4,
  },
  groupHeader: { flexDirection: "row", backgroundColor: "#E5E7EB", padding: 8, marginTop: 15, alignItems: "flex-end" },
  table: { width: "100%", border: `1pt solid ${COLORS.CardBorderColor}`, borderBottom: 0 },
  tableRow: { flexDirection: "row", borderBottom: `1pt solid ${COLORS.CardBorderColor}` },
  tableHeaderRow: { flexDirection: "row", backgroundColor: COLORS.PrimaryColor },
  tableCellHeader: { padding: 5, fontSize: 9 * UI_SCALE, fontWeight: "bold", color: COLORS.White },
  tableCell: { padding: 5, fontSize: 9 * UI_SCALE, color: COLORS.TextColor },
  tableCellBold: { padding: 5, fontSize: 9 * UI_SCALE, fontWeight: "bold", color: COLORS.AccentGreen },
  protocolSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  protocolHeaderLeft: { flex: 1, paddingRight: 10 },
  protocolHeaderTitle: { fontSize: 26 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor },
  protocolHeaderSubtitle: { marginTop: 4, fontSize: 12.5 * UI_SCALE, fontStyle: "italic", color: COLORS.MutedColor },
  protocolHeaderRight: { alignItems: "flex-end" },
  protocolHeaderLine: { fontSize: 10 * UI_SCALE, color: COLORS.MutedColor, marginBottom: 2 },
  protocolHeaderDivider: { height: 1.5, backgroundColor: COLORS.FrameColor, marginTop: 8, marginBottom: 14 },
  protocolSectionHeading: {
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: COLORS.PrimaryColor,
    color: COLORS.White,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10.5 * UI_SCALE,
    fontWeight: "bold",
  },
  protocolFieldRow: { flexDirection: "row", marginBottom: 8 },
  protocolFieldItem: { flex: 1, flexDirection: "row", alignItems: "flex-end", paddingRight: 14 },
  protocolFieldLabel: { fontSize: 10 * UI_SCALE, fontWeight: "bold", marginRight: 6 },
  protocolFieldValue: {
    flex: 1,
    fontSize: 10 * UI_SCALE,
    borderBottom: `1pt solid ${COLORS.CardBorderColor}`,
    paddingBottom: 2,
  },
  protocolNote: { marginTop: 7, fontSize: 9 * UI_SCALE, color: COLORS.MutedColor, fontStyle: "italic" },
  protocolConclusionBox: {
    border: `1pt solid ${COLORS.CardBorderColor}`,
    backgroundColor: COLORS.BackgroundColor,
    padding: 10,
    marginBottom: 8,
  },
});

interface PdfProtocolDocumentProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  phaseDistribution: PhaseDistributionResult;
  validationResult: ValidationResult;
  schematicImages: string[];
  dinRailImages?: string[];
  previewOnly?: string;
}

interface PdfCircuitGroup {
  groupKey: string;
  groupName: string;
  mcbs: SymbolItem[];
  rcd: SymbolItem | null;
}

function protocolValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function renderProtocolHeader(
  header: MeasurementProtocolHeaderSettings | undefined,
  fallbackTitle: string,
  fallbackSubtitle: string,
  fallbackDate: string,
  fallbackObjectName: string,
) {
  return (
    <>
      <View style={styles.protocolSheetHeader}>
        <View style={styles.protocolHeaderLeft}>
          <Text style={styles.protocolHeaderTitle}>{protocolValue(header?.headerTitle, fallbackTitle)}</Text>
          <Text style={styles.protocolHeaderSubtitle}>{protocolValue(header?.headerSubtitle, fallbackSubtitle)}</Text>
        </View>
        <View style={styles.protocolHeaderRight}>
          <Text style={styles.protocolHeaderLine}>Data pomiarów: {protocolValue(header?.measurementDate, fallbackDate)}</Text>
          <Text style={styles.protocolHeaderLine}>Obiekt: {protocolValue(header?.objectName, fallbackObjectName)}</Text>
        </View>
      </View>
      <View style={styles.protocolHeaderDivider} />
    </>
  );
}

function getPdfCircuitGroupKey(symbol: SymbolItem): string {
  if (symbol.rcdSymbolId) {
    return `rcd:${symbol.rcdSymbolId}`;
  }

  if (symbol.group) {
    return `group:${symbol.group}`;
  }

  return "standalone";
}

export function buildPdfCircuitGroups(symbols: SymbolItem[]): PdfCircuitGroup[] {
  const mcbSymbols = symbols.filter((symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo");
  const rcdSymbols = symbols.filter((symbol) => symbol.deviceKind === "rcd");

  const groupedCircuits = mcbSymbols.reduce((acc, mcb) => {
    const groupKey = getPdfCircuitGroupKey(mcb);
    const groupName = mcb.groupName || mcb.group || "standalone";
    if (!acc[groupKey]) {
      acc[groupKey] = { groupKey, groupName, mcbs: [], rcd: null };
    }
    acc[groupKey].mcbs.push(mcb);
    return acc;
  }, {} as Record<string, PdfCircuitGroup>);

  rcdSymbols.forEach((rcd) => {
    const rcdKey = `rcd:${rcd.id}`;
    if (groupedCircuits[rcdKey]) {
      groupedCircuits[rcdKey].rcd = rcd;
      groupedCircuits[rcdKey].groupName = rcd.groupName || rcd.group || groupedCircuits[rcdKey].groupName;
      return;
    }

    if (rcd.group) {
      const fallbackKey = `group:${rcd.group}`;
      if (groupedCircuits[fallbackKey]) {
        groupedCircuits[fallbackKey].rcd = rcd;
        groupedCircuits[fallbackKey].groupName = rcd.groupName || rcd.group || groupedCircuits[fallbackKey].groupName;
      }
    }
  });

  return Object.values(groupedCircuits);
}

export function PdfProtocolDocument({
  metadata,
  symbols,
  phaseDistribution,
  validationResult,
  schematicImages,
  dinRailImages = [],
  previewOnly,
}: PdfProtocolDocumentProps) {
  const groupedCircuits = buildPdfCircuitGroups(symbols);
  const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());

  const drawingDateStr = metadata.drawingDate?.trim() || "";
  let resolvedYear = new Date().getFullYear();
  if (drawingDateStr) {
    const parsedDate = new Date(drawingDateStr);
    if (!isNaN(parsedDate.getTime())) {
      resolvedYear = parsedDate.getFullYear();
    }
  }

  const rawProjectNum = metadata.projectNumber?.trim() || "";
  const resolvedProtocolNumber = rawProjectNum
    ? (rawProjectNum.includes('/') ? rawProjectNum : `${rawProjectNum} / ${resolvedYear}`)
    : `....... / ${resolvedYear}`;

  const fallbackObjectName = metadata.titlePageObjectType || metadata.projectNumber || "Nowy projekt";

  const defaultWorkScope = [
    { text: "Montaż rozdzielnicy głównej", isChecked: true },
    { text: "Układanie przewodów i osprzętu", isChecked: true },
    { text: "Pomiary ochrony przeciwporażeniowej", isChecked: true },
  ];
  const workScopeItems = metadata.titlePageWorkScopeItems?.length ? metadata.titlePageWorkScopeItems : defaultWorkScope;

  const defaultAttachments = [
    "Protokoły z pomiarów",
    "Schemat rozdzielnicy",
    "Uprawnienia wykonawcy",
  ];
  const attachmentItems = metadata.titlePageAttachmentItems?.length ? metadata.titlePageAttachmentItems : defaultAttachments;

  // Align signature values and stamp with isFormalDocumentationMode and signature settings
  const investorSignature = metadata.isFormalDocumentationMode
    ? metadata.investorSignature || ""
    : "nie dotyczy";
  const installerSignature = metadata.isFormalDocumentationMode
    ? metadata.designerSignature || ""
    : "nie dotyczy";
  const stampText = metadata.isFormalDocumentationMode
    ? metadata.contractorSignature || "PIECZĄTKA WYKONAWCY"
    : "NIE DOTYCZY";

  const workScopeLeft = Array.from({ length: 5 }, (_, i) => workScopeItems[i] || null);
  const workScopeRight = Array.from({ length: 5 }, (_, i) => workScopeItems[i + 5] || null);

  const leftAttachmentItems = attachmentItems.slice(0, 5);
  const rightAttachmentItems = attachmentItems.slice(5, 10);

  return (
    <Document title={`Dokumentacja_${metadata.projectNumber || "Projekt"}`}>
      {(!previewOnly || previewOnly === "title-page") && (
        <Page size="A4" style={styles.titlePage}>
          <View style={styles.titleContainer}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={styles.logoBox}>
                  {metadata.titlePageCompanyLogoDataUrl ? (
                    <Image
                      src={metadata.titlePageCompanyLogoDataUrl}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 7.5 * UI_SCALE, color: COLORS.MutedColor }}>LOGO</Text>
                  )}
                </View>
                <View style={{ justifyContent: "center" }}>
                  <Text style={{ fontSize: 14 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor }}>
                    DOKUMENTACJA POWYKONAWCZA
                  </Text>
                  <Text style={{ fontSize: 8 * UI_SCALE, color: COLORS.MutedColor, marginTop: 2 }}>
                    ZGODNOŚĆ Z NORMĄ PN-HD 60364
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                <Text style={{ fontSize: 8.6 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor }}>
                  NR PROTOKOŁU: {resolvedProtocolNumber}
                </Text>
                <Text style={{ fontSize: 8.3 * UI_SCALE, color: COLORS.MutedColor, marginTop: 3 }}>
                  Data: {displayDate}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: COLORS.FrameColor, marginBottom: 10 }} />

            <View style={styles.heroSection}>
              <Text style={{ fontSize: 29 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor }}>
                OŚWIADCZENIE WYKONAWCY
              </Text>
              <Text style={{ fontSize: 11 * UI_SCALE, color: COLORS.MutedColor, marginTop: 4, fontStyle: "italic" }}>
                instalacji elektrycznej wykonanej zgodnie z przepisami
              </Text>
            </View>

            <View style={[styles.cardLight, { marginBottom: 12 }]}>
              <Text style={styles.cardTitle}>INFORMACJE O OBIEKCIE</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rodzaj:</Text>
                <Text style={styles.infoValue}>
                  {metadata.titlePageObjectType || metadata.company || "Budynek jednorodzinny / Lokal mieszkalny"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Adres:</Text>
                <Text style={styles.infoValue}>{metadata.address || "................................................................"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inwestor:</Text>
                <Text style={styles.infoValue}>{metadata.investor || "................................................................"}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <View style={[styles.card, { flex: 1, minHeight: 94 }]}>
                <Text style={[styles.cardTitle, { textAlign: "center" }]}>ZAKRES PRAC</Text>
                <View style={styles.divider} />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    {workScopeLeft.map((item, index) => {
                      if (!item) return <View key={`spacer-l-${index}`} style={{ height: 12 }} />;
                      const isChecked = metadata.titlePageUseManualWorkScopeCheckboxes ? false : item.isChecked;
                      return (
                        <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                          <View
                            style={{
                              width: 9,
                              height: 9,
                              border: `1pt solid ${isChecked ? COLORS.CheckMarkGreen : COLORS.TextColor}`,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 6,
                            }}
                          >
                            {isChecked && (
                              <Text style={{ fontSize: 8.2 * UI_SCALE, fontWeight: "bold", color: COLORS.CheckMarkGreen }}>
                                ✓
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 8.5 * UI_SCALE, color: COLORS.TextColor }}>{item.text}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ flex: 1 }}>
                    {workScopeRight.map((item, index) => {
                      if (!item) return <View key={`spacer-r-${index}`} style={{ height: 12 }} />;
                      const isChecked = metadata.titlePageUseManualWorkScopeCheckboxes ? false : item.isChecked;
                      return (
                        <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                          <View
                            style={{
                              width: 9,
                              height: 9,
                              border: `1pt solid ${isChecked ? COLORS.CheckMarkGreen : COLORS.TextColor}`,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 6,
                            }}
                          >
                            {isChecked && (
                              <Text style={{ fontSize: 8.2 * UI_SCALE, fontWeight: "bold", color: COLORS.CheckMarkGreen }}>
                                ✓
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 8.5 * UI_SCALE, color: COLORS.TextColor }}>{item.text}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View style={[styles.card, { flex: 1, minHeight: 94 }]}>
                <Text style={[styles.cardTitle, { textAlign: "center" }]}>ZAŁĄCZNIKI</Text>
                <View style={styles.divider} />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    {leftAttachmentItems.map((item, index) => (
                      <Text key={index} style={{ fontSize: 8.6 * UI_SCALE, color: COLORS.TextColor, marginBottom: 6 }}>
                        - {item}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    {rightAttachmentItems.map((item, index) => (
                      <Text key={index} style={{ fontSize: 8.6 * UI_SCALE, color: COLORS.TextColor, marginBottom: 6 }}>
                        - {item}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 20, paddingTop: 14, borderTop: `1pt solid ${COLORS.DividerColor}`, marginBottom: 20 }}>
              <View style={[styles.cardLight, { flex: 1 }]}>
                <Text style={[styles.cardTitle, { color: COLORS.TextColor }]}>WYKONAWCA / INSTALATOR</Text>
                <View style={styles.divider} />
                <Text style={{ fontSize: 15 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor, marginTop: 6 }}>
                  {metadata.contractor || metadata.author || "................................"}
                </Text>
                <Text style={{ fontSize: 11 * UI_SCALE, color: COLORS.TextColor }}>
                  {metadata.author || metadata.contractor || "................................"}
                </Text>
                <Text style={{ fontSize: 8.2 * UI_SCALE, color: COLORS.MutedColor }}>
                  Dokumentacja odbiorowa instalacji elektrycznej
                </Text>
              </View>
              <View style={[styles.cardLight, { flex: 1 }]}>
                <Text style={[styles.cardTitle, { color: COLORS.TextColor }]}>UPRAWNIENIA SEP</Text>
                <View style={styles.divider} />
                <Text style={{ fontSize: 12 * UI_SCALE, fontWeight: "bold", color: COLORS.TextColor, marginTop: 6 }}>
                  Kwalifikacje: E + D
                </Text>
                <Text style={{ fontSize: 10 * UI_SCALE, color: COLORS.TextColor }}>
                  Nr: {metadata.designerId || metadata.authorLicense || "................................"}
                </Text>
                <Text style={{ fontSize: 8.6 * UI_SCALE, color: COLORS.MutedColor }}>
                  Ważne do: {metadata.titlePageSepValidUntil || "................................"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 16, marginTop: "auto", marginBottom: 12 }}>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 8.2 * UI_SCALE, color: COLORS.TextColor, marginBottom: 3, minHeight: 20 }}>
                  {investorSignature}
                </Text>
                <View style={{ height: 1, backgroundColor: COLORS.DividerColor, width: "100%" }} />
                <Text style={{ fontSize: 7.7 * UI_SCALE, color: COLORS.MutedColor, marginTop: 3 }}>PODPIS INWESTORA</Text>
              </View>
              <View style={styles.stampBox}>
                <Text style={{ fontSize: 7.5 * UI_SCALE, color: COLORS.MutedColor, textAlign: "center" }}>
                  {stampText}
                </Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={{ fontSize: 8.2 * UI_SCALE, color: COLORS.TextColor, marginBottom: 3, minHeight: 20 }}>
                  {installerSignature}
                </Text>
                <View style={{ height: 1, backgroundColor: COLORS.DividerColor, width: "100%" }} />
                <Text style={{ fontSize: 7.7 * UI_SCALE, color: COLORS.MutedColor, marginTop: 3 }}>PODPIS ELEKTRYKA</Text>
              </View>
            </View>

            <View style={{ paddingTop: 8, borderTop: `1pt solid ${COLORS.DividerColor}` }}>
              <Text style={{ fontSize: 7.2 * UI_SCALE, color: COLORS.MutedColor }}>
                Instalacja została wykonana zgodnie z projektem (jeśli dotyczy), przepisami oraz normą PN-HD 60364.
                Pomiary wykazały skuteczność zastosowanych środków ochrony.
              </Text>
            </View>
          </View>
        </Page>
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
          {!previewOnly &&
            schematicImages.map((src, index) => (
              <Page key={`schematic-${index}`} size="A4" orientation="landscape" style={{ padding: 0 }}>
                <Image src={src} style={{ width: "100%", height: "100%" }} />
              </Page>
            ))}

          {!previewOnly &&
            dinRailImages.map((src, index) => (
              <Page key={`din-rail-${index}`} size="A4" orientation="landscape" style={styles.landscapePage}>
                <Text style={styles.sectionTitle}>WIDOK ELEWACJI ROZDZIELNICY</Text>
                <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Image src={src} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </View>
              </Page>
            ))}

          {!previewOnly && (
            <>
              <Page size="A4" style={styles.page}>
                <Text style={styles.sectionTitle}>ZESTAWIENIE OBWODÓW</Text>

                {groupedCircuits.map((group, index) => {
                  const rcdLabel = group.rcd ? group.rcd.referenceDesignation || group.rcd.label || "RCD" : group.groupName;
                  const rcdDesc = group.rcd
                    ? group.rcd.protectionType || group.rcd.type
                    : "Zabezpieczenie grupowe";
                  const groupColor = group.rcd ? COLORS.AccentGreen : COLORS.AccentOrange;

                  return (
                    <View key={index} wrap={false} style={{ marginBottom: 15 }}>
                      <View style={styles.groupHeader}>
                        <View style={{ width: 75 }}>
                          <Text style={{ fontSize: 8 * UI_SCALE, color: COLORS.MutedColor }}>Nr RCD</Text>
                          <Text style={{ fontSize: 11 * UI_SCALE, fontWeight: "bold", color: groupColor }}>{rcdLabel}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 8 * UI_SCALE, color: COLORS.MutedColor }}>RCD</Text>
                          <Text style={{ fontSize: 11 * UI_SCALE, fontWeight: "bold", color: groupColor }}>{rcdDesc}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 10 * UI_SCALE, color: COLORS.MutedColor }}>
                            {group.mcbs.length} obwodów
                          </Text>
                        </View>
                      </View>

                      <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                          <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Ref.</Text></View>
                          <View style={{ width: "30%" }}><Text style={styles.tableCellHeader}>Nazwa obwodu</Text></View>
                          <View style={{ width: "15%" }}><Text style={styles.tableCellHeader}>Zabezp.</Text></View>
                          <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Faza</Text></View>
                          <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Moc</Text></View>
                          <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Przekrój</Text></View>
                          <View style={{ width: "15%" }}><Text style={styles.tableCellHeader}>Lokalizacja</Text></View>
                        </View>
                        {group.mcbs.map((mcb, rowIndex) => {
                          const bg = rowIndex % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd;
                          return (
                            <View style={[styles.tableRow, { backgroundColor: bg }]} key={rowIndex}>
                              <View style={{ width: "10%" }}><Text style={styles.tableCellBold}>{mcb.referenceDesignation || "-"}</Text></View>
                              <View style={{ width: "30%" }}><Text style={styles.tableCell}>{mcb.circuitName || mcb.label || "-"}</Text></View>
                              <View style={{ width: "15%" }}><Text style={[styles.tableCell, { fontWeight: "bold" }]}>{mcb.protectionType || "-"}</Text></View>
                              <View style={{ width: "10%" }}><Text style={styles.tableCell}>{mcb.phase || "-"}</Text></View>
                              <View style={{ width: "10%" }}><Text style={styles.tableCell}>{mcb.powerW > 0 ? `${mcb.powerW} W` : "-"}</Text></View>
                              <View style={{ width: "10%" }}><Text style={styles.tableCell}>{mcb.cableCrossSection ? `${mcb.cableCrossSection} mm²` : "-"}</Text></View>
                              <View style={{ width: "15%" }}><Text style={styles.tableCell}>{mcb.location || "-"}</Text></View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </Page>

              <Page size="A4" style={styles.page}>
                <Text style={styles.sectionTitle}>BILANS MOCY I WALIDACJA</Text>

                <Text style={{ fontSize: 11 * UI_SCALE, fontWeight: "bold", color: COLORS.MutedColor, marginBottom: 5 }}>
                  Rozkład fazowy
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <View style={{ width: "33%" }}><Text style={styles.tableCellHeader}>Faza</Text></View>
                    <View style={{ width: "33%" }}><Text style={styles.tableCellHeader}>Moc całkowita</Text></View>
                    <View style={{ width: "34%" }}><Text style={styles.tableCellHeader}>Prąd obciążenia</Text></View>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: COLORS.TableEven }]}>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>L1</Text></View>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>{phaseDistribution.l1PowerW.toFixed(0)} W</Text></View>
                    <View style={{ width: "34%" }}><Text style={styles.tableCell}>{phaseDistribution.l1CurrentA.toFixed(1)} A</Text></View>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: COLORS.TableOdd }]}>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>L2</Text></View>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>{phaseDistribution.l2PowerW.toFixed(0)} W</Text></View>
                    <View style={{ width: "34%" }}><Text style={styles.tableCell}>{phaseDistribution.l2CurrentA.toFixed(1)} A</Text></View>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: COLORS.TableEven }]}>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>L3</Text></View>
                    <View style={{ width: "33%" }}><Text style={styles.tableCell}>{phaseDistribution.l3PowerW.toFixed(0)} W</Text></View>
                    <View style={{ width: "34%" }}><Text style={styles.tableCell}>{phaseDistribution.l3CurrentA.toFixed(1)} A</Text></View>
                  </View>
                </View>

                <Text style={{ marginTop: 10, fontWeight: "bold", color: COLORS.TextColor }}>
                  Asymetria obciążenia: {phaseDistribution.imbalancePercent.toFixed(1)}%
                </Text>

                <Text style={{ fontSize: 11 * UI_SCALE, fontWeight: "bold", color: COLORS.MutedColor, marginTop: 20, marginBottom: 5 }}>
                  Status walidacji
                </Text>
                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
                  <View style={{ backgroundColor: "#ECFDF5", border: "1pt solid #D1FAE5", padding: 10 }}>
                    <Text style={{ color: COLORS.AccentGreen, fontWeight: "bold" }}>
                      Brak błędów i ostrzeżeń. Projekt jest prawidłowy.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {validationResult.errors.map((error, index) => (
                      <View
                        key={`err-${index}`}
                        style={{ backgroundColor: "#FEF2F2", border: "1pt solid #FEE2E2", padding: 8, marginBottom: 4 }}
                      >
                        <Text style={{ fontWeight: "bold", color: "#EF4444", fontSize: 9 * UI_SCALE }}>
                          [BŁĄD {error.code}] {error.message}
                        </Text>
                      </View>
                    ))}
                    {validationResult.warnings.map((warning, index) => (
                      <View
                        key={`warn-${index}`}
                        style={{ backgroundColor: "#FFFBEB", border: "1pt solid #FEF3C7", padding: 8, marginBottom: 4 }}
                      >
                        <Text style={{ fontWeight: "bold", color: COLORS.AccentOrange, fontSize: 9 * UI_SCALE }}>
                          [OSTRZEŻENIE {warning.code}] {warning.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Page>
            </>
          )}

          {(previewOnly === "continuity" || (!previewOnly && metadata.measurementProtocols?.continuityRows?.length > 0)) && (
            <Page size="A4" orientation="landscape" style={styles.landscapePage}>
              {renderProtocolHeader(
                metadata.measurementProtocols?.continuityHeader,
                "Protokół Nr 01 / 2026",
                "Badanie ciągłości przewodów PE i połączeń wyrównawczych",
                displayDate,
                fallbackObjectName,
              )}
              <Text style={styles.protocolSectionHeading}>1. Dane techniczne i narzędzia</Text>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Miernik:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.continuityMeterName,
                      "..........................................",
                    )}
                  </Text>
                </View>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Nr fabryczny:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.continuityMeterSerialNumber,
                      "..........................................",
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Prąd pomiarowy:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(metadata.measurementProtocols?.continuityMeasurementCurrent, ">= 200 mA")}
                  </Text>
                </View>
              </View>
              <Text style={styles.protocolSectionHeading}>2. Wyniki badania ciągłości</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={{ width: "6%" }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
                  <View style={{ width: "30%" }}><Text style={styles.tableCellHeader}>Nazwa obwodu / element</Text></View>
                  <View style={{ width: "18%" }}><Text style={styles.tableCellHeader}>Lokalizacja</Text></View>
                  <View style={{ width: "20%" }}><Text style={styles.tableCellHeader}>Badany przewód / połączenie</Text></View>
                  <View style={{ width: "12%" }}><Text style={styles.tableCellHeader}>Wynik [Ω]</Text></View>
                  <View style={{ width: "14%" }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
                </View>
                {(metadata.measurementProtocols?.continuityRows ?? []).map((row, index) => (
                  <View
                    style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]}
                    key={index}
                  >
                    <View style={{ width: "6%" }}><Text style={styles.tableCell}>{row.index}</Text></View>
                    <View style={{ width: "30%" }}><Text style={styles.tableCellBold}>{row.circuitName}</Text></View>
                    <View style={{ width: "18%" }}><Text style={styles.tableCell}>{row.location}</Text></View>
                    <View style={{ width: "20%" }}><Text style={styles.tableCell}>{row.connectionType}</Text></View>
                    <View style={{ width: "12%" }}><Text style={styles.tableCell}>{row.measuredResistance}</Text></View>
                    <View style={{ width: "14%" }}>
                      <Text style={[styles.tableCell, { color: row.assessment === "Pozytywna" ? COLORS.AccentGreen : COLORS.TextColor }]}>
                        {row.assessment}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.protocolNote}>
                Legenda: PE - przewód ochronny, połączenie wyrównawcze - połączenie ochronne między częściami przewodzącymi.
              </Text>
            </Page>
          )}

          {(previewOnly === "loop" || (!previewOnly && metadata.measurementProtocols?.loopImpedanceRows?.length > 0)) && (
            <Page size="A4" orientation="landscape" style={styles.landscapePage}>
              {renderProtocolHeader(
                metadata.measurementProtocols?.loopHeader,
                "Protokół Nr 02 / 2026",
                "Badanie skuteczności ochrony przeciwporażeniowej",
                displayDate,
                fallbackObjectName,
              )}
              <Text style={styles.protocolSectionHeading}>1. Dane techniczne i narzędzia</Text>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Miernik:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(metadata.measurementProtocols?.loopMeterName, "..........................................")}
                  </Text>
                </View>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Nr fabryczny:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.loopMeterSerialNumber,
                      "..........................................",
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Napięcie sieci:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(metadata.measurementProtocols?.loopNetworkVoltage, "230/400V")}
                  </Text>
                </View>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Układ sieci:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(metadata.measurementProtocols?.loopNetworkSystem, "TN-S / TN-C-S")}
                  </Text>
                </View>
              </View>
              <Text style={styles.protocolSectionHeading}>2. Wyniki pomiarów impedancji pętli zwarcia</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={{ width: "5%" }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
                  <View style={{ width: "22%" }}><Text style={styles.tableCellHeader}>Nazwa obwodu / punkt pomiarowy</Text></View>
                  <View style={{ width: "16%" }}><Text style={styles.tableCellHeader}>Lokalizacja</Text></View>
                  <View style={{ width: "13%" }}><Text style={styles.tableCellHeader}>Typ zabezp.</Text></View>
                  <View style={{ width: "8%" }}><Text style={styles.tableCellHeader}>In [A]</Text></View>
                  <View style={{ width: "8%" }}><Text style={styles.tableCellHeader}>Ia [A]</Text></View>
                  <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Zs [Ω]</Text></View>
                  <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>Zadm [Ω]</Text></View>
                  <View style={{ width: "8%" }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
                </View>
                {(metadata.measurementProtocols?.loopImpedanceRows ?? []).map((row, index) => (
                  <View
                    style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]}
                    key={index}
                  >
                    <View style={{ width: "5%" }}><Text style={styles.tableCell}>{row.index}</Text></View>
                    <View style={{ width: "22%" }}><Text style={styles.tableCellBold}>{row.circuitName}</Text></View>
                    <View style={{ width: "16%" }}><Text style={styles.tableCell}>{row.location}</Text></View>
                    <View style={{ width: "13%" }}><Text style={styles.tableCell}>{row.protectionType}</Text></View>
                    <View style={{ width: "8%" }}><Text style={styles.tableCell}>{row.ratedCurrent}</Text></View>
                    <View style={{ width: "8%" }}><Text style={styles.tableCell}>{row.tripCurrent}</Text></View>
                    <View style={{ width: "10%" }}><Text style={styles.tableCell}>{row.measuredImpedance}</Text></View>
                    <View style={{ width: "10%" }}><Text style={styles.tableCell}>{row.allowedImpedance}</Text></View>
                    <View style={{ width: "8%" }}>
                      <Text style={[styles.tableCell, { color: row.assessment === "Pozytywna" ? COLORS.AccentGreen : COLORS.TextColor }]}>
                        {row.assessment}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.protocolNote}>
                Legenda: In - prąd znamionowy zabezpieczenia, Ia - prąd wyłączenia, Zs - zmierzona impedancja pętli zwarcia,
                Zadm - dopuszczalna impedancja pętli zwarcia.
              </Text>
            </Page>
          )}

          {(previewOnly === "insulation" || (!previewOnly && metadata.measurementProtocols?.insulationRows?.length > 0)) && (
            <Page size="A4" orientation="landscape" style={styles.landscapePage}>
              {renderProtocolHeader(
                metadata.measurementProtocols?.insulationHeader,
                "Protokół Nr 03 / 2026",
                "Badanie rezystancji izolacji obwodów",
                displayDate,
                fallbackObjectName,
              )}
              <Text style={styles.protocolSectionHeading}>1. Dane techniczne i narzędzia</Text>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Miernik:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.insulationMeterName,
                      "..........................................",
                    )}
                  </Text>
                </View>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Nr fabryczny:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.insulationMeterSerialNumber,
                      "..........................................",
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Napięcie próby:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}
                  </Text>
                </View>
              </View>
              <Text style={styles.protocolSectionHeading}>
                {`2. Wyniki pomiarów rezystancji izolacji (napięcie próby ${protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")})`}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={{ width: "5%" }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
                  <View style={{ width: "23%" }}><Text style={styles.tableCellHeader}>Nazwa obwodu / punkt pomiarowy</Text></View>
                  <View style={{ width: "15%" }}><Text style={styles.tableCellHeader}>Lokalizacja</Text></View>
                  <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>L-N [MΩ]</Text></View>
                  <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>L-PE [MΩ]</Text></View>
                  <View style={{ width: "10%" }}><Text style={styles.tableCellHeader}>N-PE [MΩ]</Text></View>
                  <View style={{ width: "12%" }}><Text style={styles.tableCellHeader}>Wymagana [MΩ]</Text></View>
                  <View style={{ width: "15%" }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
                </View>
                {(metadata.measurementProtocols?.insulationRows ?? []).map((row, index) => (
                  <View
                    style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]}
                    key={index}
                  >
                    <View style={{ width: "5%" }}><Text style={styles.tableCell}>{row.index}</Text></View>
                    <View style={{ width: "23%" }}><Text style={styles.tableCell}>{row.circuitName}</Text></View>
                    <View style={{ width: "15%" }}><Text style={styles.tableCell}>{row.location}</Text></View>
                    <View style={{ width: "10%" }}><Text style={styles.tableCell}>{row.lnResistance}</Text></View>
                    <View style={{ width: "10%" }}><Text style={styles.tableCell}>{row.lpeResistance}</Text></View>
                    <View style={{ width: "10%" }}><Text style={styles.tableCell}>{row.npeResistance}</Text></View>
                    <View style={{ width: "12%" }}><Text style={styles.tableCell}>{row.requiredResistance}</Text></View>
                    <View style={{ width: "15%" }}>
                      <Text style={[styles.tableCell, { color: row.assessment === "Pozytywna" ? COLORS.AccentGreen : COLORS.TextColor }]}>
                        {row.assessment}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.protocolNote}>Uwaga: Wszystkie odbiorniki na czas pomiaru zostały odłączone.</Text>
              <Text style={styles.protocolNote}>
                Legenda: L-N - przewód fazowy do neutralnego, L-PE - przewód fazowy do ochronnego,
                N-PE - przewód neutralny do ochronnego.
              </Text>
            </Page>
          )}

          {(previewOnly === "rcd-ground" || (!previewOnly && metadata.measurementProtocols?.rcdRows?.length > 0)) && (
            <Page size="A4" orientation="landscape" style={styles.landscapePage}>
              {renderProtocolHeader(
                metadata.measurementProtocols?.rcdGroundHeader,
                "Protokół Nr 04 / 2026",
                "Test wyłączników RCD i rezystancja uziemienia",
                displayDate,
                fallbackObjectName,
              )}
              <Text style={styles.protocolSectionHeading}>1. Dane techniczne i narzędzia</Text>
              <View style={styles.protocolFieldRow}>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Miernik:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.rcdGroundMeterName,
                      "..........................................",
                    )}
                  </Text>
                </View>
                <View style={styles.protocolFieldItem}>
                  <Text style={styles.protocolFieldLabel}>Nr fabryczny:</Text>
                  <Text style={styles.protocolFieldValue}>
                    {protocolValue(
                      metadata.measurementProtocols?.rcdGroundMeterSerialNumber,
                      "..........................................",
                    )}
                  </Text>
                </View>
              </View>
              <Text style={styles.protocolSectionHeading}>2. Badanie wyłączników różnicowoprądowych (RCD)</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={{ width: "6%" }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
                  <View style={{ width: "22%" }}><Text style={styles.tableCellHeader}>Typ RCD</Text></View>
                  <View style={{ width: "14%" }}><Text style={styles.tableCellHeader}>IΔn [mA]</Text></View>
                  <View style={{ width: "14%" }}><Text style={styles.tableCellHeader}>Prąd wyzw. [mA]</Text></View>
                  <View style={{ width: "14%" }}><Text style={styles.tableCellHeader}>Czas wyzw. [ms]</Text></View>
                  <View style={{ width: "14%" }}><Text style={styles.tableCellHeader}>Przycisk TEST</Text></View>
                  <View style={{ width: "16%" }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
                </View>
                {(metadata.measurementProtocols?.rcdRows ?? []).map((row, index) => (
                  <View
                    style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]}
                    key={index}
                  >
                    <View style={{ width: "6%" }}><Text style={styles.tableCell}>{row.index}</Text></View>
                    <View style={{ width: "22%" }}><Text style={styles.tableCellBold}>{row.deviceType}</Text></View>
                    <View style={{ width: "14%" }}><Text style={styles.tableCell}>{row.residualCurrent}</Text></View>
                    <View style={{ width: "14%" }}><Text style={styles.tableCell}>{row.tripCurrent}</Text></View>
                    <View style={{ width: "14%" }}><Text style={styles.tableCell}>{row.tripTimeMs}</Text></View>
                    <View style={{ width: "14%" }}><Text style={styles.tableCell}>{row.testButtonResult}</Text></View>
                    <View style={{ width: "16%" }}>
                      <Text style={[styles.tableCell, { color: row.assessment === "Pozytywna" ? COLORS.AccentGreen : COLORS.TextColor }]}>
                        {row.assessment}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.protocolNote}>
                Legenda: IΔn - znamionowy prąd różnicowy, TEST - wynik działania przycisku testowego.
              </Text>
              <Text style={styles.protocolSectionHeading}>3. Pomiar rezystancji uziemienia (GSU)</Text>
              <View style={styles.protocolConclusionBox}>
                <View style={styles.protocolFieldRow}>
                  <View style={styles.protocolFieldItem}>
                    <Text style={styles.protocolFieldLabel}>Metoda pomiaru:</Text>
                    <Text style={styles.protocolFieldValue}>
                      {protocolValue(metadata.measurementProtocols?.groundMeasurementMethod, "..........................................")}
                    </Text>
                  </View>
                  <View style={styles.protocolFieldItem}>
                    <Text style={styles.protocolFieldLabel}>Rodzaj uziomu:</Text>
                    <Text style={styles.protocolFieldValue}>
                      {protocolValue(metadata.measurementProtocols?.groundElectrodeType, "..........................................")}
                    </Text>
                  </View>
                </View>
                <View style={styles.protocolFieldRow}>
                  <View style={styles.protocolFieldItem}>
                    <Text style={styles.protocolFieldLabel}>Zmierzona wartość Ru:</Text>
                    <Text style={styles.protocolFieldValue}>
                      {protocolValue(metadata.measurementProtocols?.groundMeasuredResistance, "........................")} Ω
                    </Text>
                  </View>
                  <View style={styles.protocolFieldItem}>
                    <Text style={styles.protocolFieldLabel}>Wartość wymagana:</Text>
                    <Text style={styles.protocolFieldValue}>
                      {protocolValue(metadata.measurementProtocols?.groundRequiredResistance, "........................")} Ω
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10 * UI_SCALE, fontWeight: "bold", marginTop: 8, marginBottom: 4 }}>ORZECZENIE:</Text>
                <Text style={{ fontSize: 9.6 * UI_SCALE }}>
                  {protocolValue(
                    metadata.measurementProtocols?.groundConclusionText,
                    "........................................................................................................................",
                  )}
                </Text>
              </View>
              <Text style={styles.protocolSectionHeading}>4. Zalecenia po pomiarach</Text>
              <View style={styles.protocolConclusionBox}>
                <Text style={{ fontSize: 9.6 * UI_SCALE }}>
                  {protocolValue(
                    metadata.measurementProtocols?.recommendationsText,
                    "........................................................................................................................",
                  )}
                </Text>
              </View>
              <Text style={styles.protocolNote}>
                Legenda: GSU - główna szyna uziemiająca, Ru - zmierzona rezystancja uziemienia.
              </Text>
            </Page>
          )}
        </>
      )}
    </Document>
  );
}
