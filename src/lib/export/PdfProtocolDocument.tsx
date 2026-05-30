import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { PhaseDistributionResult } from "../phaseDistribution/phaseDistributionCalculator";
import {
  DEFAULT_ATTACHMENT_ITEMS,
  DEFAULT_WORK_SCOPE_ITEMS,
  formatDateForField,
  mergeDefaultAttachmentItems,
} from "../projectMetadata";
import {
  buildCircuitListTableRows,
  buildCircuitRowsFromSymbols,
} from "../circuitRows";
import type { ValidationResult } from "../validation/electricalValidationService";

const UNIFIED_ROWS_PER_PAGE = 7;
const CIRCUIT_LIST_ROWS_PER_PAGE = 10;
const TITLE_WORK_SCOPE_MAX_ITEMS = 12;
const TITLE_WORK_SCOPE_COLUMN_SIZE = 6;
const A4_PREVIEW_PADDING = 42.5;

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

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Arial", color: "#111827", backgroundColor: "#FFFFFF" },
  landscapePage: { padding: 30, fontFamily: "Arial", color: "#111827", backgroundColor: "#FFFFFF" },
  previewA4Page: { padding: A4_PREVIEW_PADDING },
  titlePage: { paddingHorizontal: 30, paddingVertical: 20, fontFamily: "Arial", color: "#111827", backgroundColor: "#FFFFFF" },
  
  // Layout basics
  flex: { display: "flex" },
  flexRow: { display: "flex", flexDirection: "row" },
  flexCol: { display: "flex", flexDirection: "column" },
  itemsCenter: { alignItems: "center" },
  justifyBetween: { justifyContent: "space-between" },
  justifyCenter: { justifyContent: "center" },
  justifyEnd: { justifyContent: "flex-end" },
  flexWrap: { flexWrap: "wrap" },
  flex1: { flex: 1 },
  wFull: { width: "100%" },
  
  // Margins
  mt1: { marginTop: 4 }, mt2: { marginTop: 8 }, mt3: { marginTop: 12 }, mt4: { marginTop: 16 }, mt6: { marginTop: 24 }, mtAuto: { marginTop: "auto" },
  mb1: { marginBottom: 4 }, mb2: { marginBottom: 8 }, mb25: { marginBottom: 10 }, mb3: { marginBottom: 12 }, mb4: { marginBottom: 16 }, mb6: { marginBottom: 24 },
  mr1: { marginRight: 4 }, mr2: { marginRight: 8 }, mr3: { marginRight: 12 },
  
  // Padding
  p1: { padding: 4 }, p2: { padding: 8 }, p3: { padding: 12 }, p4: { padding: 16 },
  px1: { paddingHorizontal: 4 }, px2: { paddingHorizontal: 8 }, px3: { paddingHorizontal: 12 }, px4: { paddingHorizontal: 16 },
  py1: { paddingVertical: 4 }, py2: { paddingVertical: 8 }, py3: { paddingVertical: 12 }, py4: { paddingVertical: 16 },
  
  // Borders
  border: { borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "solid" },
  borderT: { borderTopWidth: 1, borderTopColor: "#E5E7EB", borderTopStyle: "solid" },
  borderB: { borderBottomWidth: 1, borderBottomColor: "#E5E7EB", borderBottomStyle: "solid" },
  borderB2Dark: { borderBottomWidth: 2, borderBottomColor: "#1F2937", borderBottomStyle: "solid" },
  borderR: { borderRightWidth: 1, borderRightColor: "#E5E7EB", borderRightStyle: "solid" },
  borderL: { borderLeftWidth: 1, borderLeftColor: "#E5E7EB", borderLeftStyle: "solid" },
  borderDashed: { borderWidth: 1, borderColor: "#D1D5DB", borderStyle: "dashed" },
  rounded: { borderRadius: 4 },
  roundedLg: { borderRadius: 8 },
  roundedXl: { borderRadius: 12 },
  
  // Typography
  textXs: { fontSize: 8 },
  textSm: { fontSize: 10 },
  textBase: { fontSize: 12 },
  textLg: { fontSize: 14 },
  textXl: { fontSize: 18 },
  text2xl: { fontSize: 24 },
  
  fontLight: { fontWeight: "normal" },
  fontNormal: { fontWeight: "normal" },
  fontMedium: { fontWeight: "normal" },
  fontSemiBold: { fontWeight: "bold" },
  fontBold: { fontWeight: "bold" },
  fontExtraBold: { fontWeight: "bold" },
  fontBlack: { fontWeight: "bold" },
  
  italic: { fontStyle: "italic" },
  uppercase: { textTransform: "uppercase" },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" },
  
  // Colors
  textWhite: { color: "#FFFFFF" },
  textGray200: { color: "#E5E7EB" },
  textGray300: { color: "#D1D5DB" },
  textGray400: { color: "#9CA3AF" },
  textGray500: { color: "#6B7280" },
  textGray600: { color: "#4B5563" },
  textGray700: { color: "#374151" },
  textGray800: { color: "#1F2937" },
  textGray900: { color: "#111827" },
  textGray950: { color: "#030712" },
  textBrand: { color: "#0D79F2" },
  textBlue400: { color: "#60A5FA" },
  textEmerald600: { color: "#059669" },
  textRed500: { color: "#EF4444" },
  textAmber600: { color: "#D97706" },
  
  bgWhite: { backgroundColor: "#FFFFFF" },
  bgGray50: { backgroundColor: "#F9FAFB" },
  bgGray100: { backgroundColor: "#F3F4F6" },
  bgGray950: { backgroundColor: "#030712" },
  bgBrand: { backgroundColor: "#0D79F2" },
  bgBlue50: { backgroundColor: "#EFF6FF" },
  bgRed50: { backgroundColor: "#FEF2F2" },
  bgAmber50: { backgroundColor: "#FFFBEB" },
  
  // Specific complex components
  pb2: { paddingBottom: 8 },
  pb3: { paddingBottom: 12 },
  pb4: { paddingBottom: 16 },
  pt2: { paddingTop: 8 },
  pt3: { paddingTop: 12 },
  pt4: { paddingTop: 16 },
  ml2: { marginLeft: 8 },
  
  logoBox: { width: 40, height: 40, borderRadius: 8, overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", borderStyle: "solid", padding: 3 },
  logoImage: { width: "100%", height: "100%", objectFit: "contain" },
  logoPlaceholderText: { color: "#9AA3B4", fontSize: 8, fontWeight: "bold" },
  
  checkboxContainer: { width: 14, height: 14, borderRadius: 3, backgroundColor: "transparent", borderWidth: 1, borderColor: "#0D79F2", borderStyle: "solid", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxChecked: { color: "#0D79F2", fontSize: 10, fontWeight: "bold" },
  
  tableCellHeader: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    borderRightStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    borderRightStyle: "solid",
  },
  borderBlue100: {
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderStyle: "solid",
  },
  
  // Layout grids
  grid2: { flexDirection: "row", justifyContent: "space-between" },
  grid2Col: { width: "48%" },
  grid3: { flexDirection: "row", justifyContent: "space-between" },
  grid3Col: { width: "31%" },
  signatureSlot: { height: 48, justifyContent: "center", alignItems: "center" },
  titleStampSlot: { height: 60, width: "100%", justifyContent: "center", alignItems: "center" },
  validationGroup: { padding: 8, borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "solid", borderRadius: 6, marginBottom: 8 },
  validationGroupError: { borderLeftWidth: 3, borderLeftColor: "#EF4444" },
  validationGroupWarning: { borderLeftWidth: 3, borderLeftColor: "#D97706" },
  validationGroupInfo: { borderLeftWidth: 3, borderLeftColor: "#0D79F2" },
  validationMessage: { paddingTop: 5, marginTop: 5, borderTopWidth: 1, borderTopColor: "#E5E7EB", borderTopStyle: "solid" },
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

function getPdfCircuitGroupKey(symbol: SymbolItem): string {
  if (symbol.rcdSymbolId) return `rcd:${symbol.rcdSymbolId}`;
  if (symbol.group) return `group:${symbol.group}`;
  return "standalone";
}

export function buildPdfCircuitGroups(symbols: SymbolItem[]): PdfCircuitGroup[] {
  const mcbSymbols = symbols.filter((symbol) => symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo");
  const rcdSymbols = symbols.filter((symbol) => symbol.deviceKind === "rcd");

  const groupedCircuits = mcbSymbols.reduce((acc, mcb) => {
    const groupKey = getPdfCircuitGroupKey(mcb);
    const groupName = mcb.groupName || mcb.group || "standalone";
    if (!acc[groupKey]) acc[groupKey] = { groupKey, groupName, mcbs: [], rcd: null };
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
  const circuitListRows = buildCircuitListTableRows(buildCircuitRowsFromSymbols(symbols));

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const getSuffix = (total: number, index: number): string => {
    if (total <= 1) return "";
    return String.fromCharCode(65 + index);
  };

  const formatProtocolTitle = (originalTitle: string, suffix: string): string => {
    if (!suffix) return originalTitle;
    const match = originalTitle.match(/(Protokół\s+Nr\s+\d+)/i);
    if (match) return originalTitle.replace(match[1], `${match[1]}${suffix}`);
    const numMatch = originalTitle.match(/(\d+)/);
    if (numMatch) return originalTitle.replace(numMatch[1], `${numMatch[1]}${suffix}`);
    return `${originalTitle} ${suffix}`;
  };

  const formatProtocolNumberLabel = (headerTitle: string): string =>
    headerTitle.replace(/^protokół\s+(pomiarów\s+)?nr\s+/i, "").trim();

  const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());

  const drawingDateStr = metadata.drawingDate?.trim() || "";
  let resolvedYear = new Date().getFullYear();
  if (drawingDateStr) {
    const parsedDate = new Date(drawingDateStr);
    if (!isNaN(parsedDate.getTime())) resolvedYear = parsedDate.getFullYear();
  }

  const rawProjectNum = metadata.projectNumber?.trim() || "";
  const resolvedProtocolNumber = rawProjectNum
    ? (rawProjectNum.includes('/') ? rawProjectNum : `${rawProjectNum} / ${resolvedYear}`)
    : `....... / ${resolvedYear}`;

  const fallbackObjectName = metadata.titlePageObjectType || metadata.projectNumber || "Nowe zlecenie";

  const defaultWorkScope = DEFAULT_WORK_SCOPE_ITEMS.map((text) => ({ text, isChecked: true }));
  const workScopeItems = metadata.titlePageWorkScopeItems?.length ? metadata.titlePageWorkScopeItems : defaultWorkScope;
  const titleWorkScopeItems = workScopeItems.slice(0, TITLE_WORK_SCOPE_MAX_ITEMS);
  const titleAttachmentItems = mergeDefaultAttachmentItems(
    metadata.titlePageAttachmentItems?.length ? metadata.titlePageAttachmentItems : DEFAULT_ATTACHMENT_ITEMS,
  );
  const titleWorkScopeColumns = chunkArray(titleWorkScopeItems, TITLE_WORK_SCOPE_COLUMN_SIZE);
  const titleAttachmentColumns = titleAttachmentItems.length > 3
    ? chunkArray(titleAttachmentItems, Math.ceil(titleAttachmentItems.length / 2))
    : [titleAttachmentItems];
  const objectType = metadata.titlePageObjectType || "Budynek jednorodzinny / Lokal mieszkalny";
  const contractorName = metadata.contractor || metadata.author || "................................";
  const sepE = metadata.designerId || metadata.authorLicense || "................................";
  const sepD = metadata.authorLicense || metadata.designerId || "................................";
  const stampText = metadata.contractorSignature || "PIECZĘĆ WYKONAWCY";

  const isUnified = metadata.measurementProtocolStyle === "unified";
  const unifiedRows = metadata.measurementProtocols?.unifiedRows ?? [];
  const unifiedChunks = unifiedRows.length > 0 ? chunkArray(unifiedRows, UNIFIED_ROWS_PER_PAGE) : [[]];
  const circuitListChunks = circuitListRows.length > 0
    ? chunkArray(circuitListRows, CIRCUIT_LIST_ROWS_PER_PAGE)
    : [[]];
  const rcdHeaderTitle = formatProtocolTitle(
    metadata.measurementProtocols?.rcdGroundHeader?.headerTitle || "Protokół Nr 04 / 2026",
    "",
  );
  const rcdProtocolNumberLabel = formatProtocolNumberLabel(rcdHeaderTitle);

  return (
    <Document title={`Dokumentacja_${metadata.projectNumber || "powykonawcza"}`}>
      {(!previewOnly || previewOnly === "title-page") && (
        <Page size="A4" style={styles.titlePage}>
          <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
            <View style={[styles.flexRow, styles.itemsCenter]}>
              <View style={[styles.logoBox, styles.mr3]}>
                {metadata.titlePageCompanyLogoDataUrl ? (
                  <Image src={metadata.titlePageCompanyLogoDataUrl} style={styles.logoImage} />
                ) : (
                  <Text style={styles.logoPlaceholderText}>LOGO</Text>
                )}
              </View>
              <View>
                <Text style={[styles.textLg, styles.fontBold, styles.textGray900, styles.uppercase]}>Dokumentacja Powykonawcza</Text>
                <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)</Text>
              </View>
            </View>
            <View style={styles.textRight}>
              <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500, styles.uppercase]}>Protokół nr</Text>
              <View style={[styles.bgBrand, styles.px2, styles.py1, styles.rounded, styles.mt1, { alignSelf: 'flex-end' }]}>
                <Text style={[styles.textBase, styles.fontBold, styles.textWhite]}>{resolvedProtocolNumber}</Text>
              </View>
              <Text style={[styles.textXs, styles.textGray400, styles.mt2]}>Data: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
            </View>
          </View>

          <View style={[styles.itemsCenter, { marginTop: 14, marginBottom: 14 }]}>
            <Text style={[styles.text2xl, styles.fontBlack, styles.textGray900, styles.uppercase]}>Oświadczenie Wykonawcy</Text>
            <Text style={[styles.textSm, styles.textGray500, styles.italic, styles.mt1]}>instalacji elektrycznej wykonanej zgodnie z przepisami i normami</Text>
          </View>

          <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p3, styles.mb2]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Informacje o obiekcie</Text>
            <View style={styles.flexCol}>
              <View style={[styles.flexRow, styles.mb1]}>
                <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Rodzaj obiektu:</Text>
                <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{objectType}</Text>
              </View>
              <View style={[styles.flexRow, styles.mb1]}>
                <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Adres:</Text>
                <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.address || "................................................................"}</Text>
              </View>
              <View style={[styles.flexRow]}>
                <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Inwestor:</Text>
                <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.investor || "................................................................"}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.grid2, styles.mb2]}>
            <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Zakres prac</Text>
              <View style={titleWorkScopeColumns.length > 1 ? styles.grid2 : styles.flexCol}>
                {titleWorkScopeColumns.map((columnItems, columnIndex) => (
                  <View key={columnIndex} style={titleWorkScopeColumns.length > 1 ? styles.grid2Col : undefined}>
                    {columnItems.map((item, itemIndex) => {
                      const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                      return (
                        <View key={absoluteIndex} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                          <View style={styles.checkboxContainer}>
                            {item.isChecked ? <Text style={styles.checkboxChecked}>✓</Text> : null}
                          </View>
                          <Text style={[styles.textXs, styles.fontMedium, styles.textGray700, { flex: 1 }]}>{item.text}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Załączniki do protokołu</Text>
              <View style={titleAttachmentColumns.length > 1 ? styles.grid2 : styles.flexCol}>
                {titleAttachmentColumns.map((columnItems, columnIndex) => (
                  <View key={columnIndex} style={titleAttachmentColumns.length > 1 ? styles.grid2Col : undefined}>
                    {columnItems.map((item, itemIndex) => (
                      <View key={`${columnIndex}-${itemIndex}`} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                        <View style={styles.checkboxContainer}>
                          <Text style={styles.checkboxChecked}>✓</Text>
                        </View>
                        <Text style={[styles.textXs, styles.fontMedium, styles.textGray700, { flex: 1 }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.grid2, styles.mb2]}>
            <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col, styles.justifyCenter]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>Wykonawca / Instalator</Text>
              <Text style={[styles.textSm, styles.fontBold, styles.textGray950, styles.mt2]}>{contractorName}</Text>
              <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podmiot odpowiedzialny za montaż instalacji</Text>
            </View>
            <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col, styles.justifyCenter]}>
              <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>Uprawnienia SEP (Kwalifikacyjne)</Text>
              <View style={[styles.flexCol, styles.mt1]}>
                <View style={[styles.flexRow, styles.mb1]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>Eksploatacja (E):</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepE}</Text>
                </View>
                <View style={[styles.flexRow]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>Dozór (D):</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepD}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.bgWhite, styles.border, { borderColor: "#0D79F2" }, styles.roundedXl, styles.p3, styles.mb3, styles.textCenter]}>
            <Text style={[styles.textSm, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Pełna treść oświadczenia wykonawcy</Text>
            <Text style={[styles.textSm, styles.fontNormal, styles.textGray800, { lineHeight: 1.5 }]}>
              Oświadczam, że instalacja elektryczna w wyżej wymienionym obiekcie została wykonana zgodnie z przepisami ustawy Prawo Budowlane, obowiązującymi normami technicznymi (w tym PN-HD 60364-6) oraz sztuką budowlaną. Przeprowadzone pomiary odbiorcze wykazały skuteczność zastosowanych środków ochrony przeciwporażeniowej.
            </Text>
          </View>

          <View style={[styles.mtAuto]}>
            <View style={[styles.grid3, styles.borderT, styles.pt4, { alignItems: 'flex-end' }]}>
              <View style={[styles.grid3Col, styles.textCenter]}>
                <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na podpis</Text></View>
                <View style={[styles.borderT, styles.pt2]}>
                  <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Podpis Inwestora</Text>
                  <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Potwierdzam odbiór prac</Text>
                </View>
              </View>
              <View style={[styles.grid3Col, styles.textCenter, styles.itemsCenter]}>
                <View style={[styles.borderDashed, styles.roundedLg, styles.bgGray50, styles.titleStampSlot, styles.mb1]}>
                  <Text style={[styles.textXs, styles.textGray400, styles.fontSemiBold, styles.uppercase]}>{stampText}</Text>
                </View>
              </View>
              <View style={[styles.grid3Col, styles.textCenter]}>
                <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na podpis</Text></View>
                <View style={[styles.borderT, styles.pt2]}>
                  <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Podpis Elektryka</Text>
                  <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Osoba uprawniona (pomiarowiec)</Text>
                </View>
              </View>
            </View>
            <View style={[styles.textCenter, styles.mt6]}>
              <Text style={[styles.textXs, styles.textGray400, styles.uppercase]}>Strona 1 z 3 • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364</Text>
            </View>
          </View>
        </Page>
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
          {(previewOnly === "circuit-list" || (!previewOnly && circuitListRows.length > 0)) &&
            circuitListChunks.map((chunk, chunkIdx) => (
              <Page key={`circuit-list-${chunkIdx}`} size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
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
                        Arkusz {chunkIdx + 1} z {circuitListChunks.length}
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
                        <View style={[styles.tableCell, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900]}>{row.referenceDesignation || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "20%" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.circuitName || row.label || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "13%" }]}><Text style={[styles.textXs, styles.textGray600]}>{location || row.displayLocation || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.phase || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "12%", alignItems: "center" }]}><Text style={[styles.textXs, styles.fontMedium, styles.textGray900]}>{row.displayProtection || row.protectionType || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "14%" }]}>
                          <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900]}>{rcdLabel || "-"}</Text>
                          {rcdProtection ? <Text style={[styles.textXs, styles.textGray500]}>{rcdProtection}</Text> : null}
                        </View>
                        <View style={[styles.tableCell, { width: "8%", alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.cableCrossSection ? `${row.cableCrossSection} mm²` : "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "7%", alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.cableLength || "-"}</Text></View>
                        <View style={[styles.tableCell, { width: "7%", borderRightWidth: 0, alignItems: "center" }]}><Text style={[styles.textXs, styles.textGray900]}>{row.powerW || "-"}</Text></View>
                      </View>
                    ))}

                    {circuitListRows.length === 0 && (
                      <View style={[styles.tableCell, { borderRightWidth: 0, alignItems: "center" }]}>
                        <Text style={[styles.textXs, styles.textGray500]}>Brak obwodów do pokazania.</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.mtAuto, styles.textCenter, styles.borderT, styles.pt4]}>
                  <Text style={[styles.textXs, styles.textGray400, styles.uppercase]}>Lista obwodów • dokumentacja powykonawcza • PN-HD 60364</Text>
                </View>
              </Page>
            ))}

          {isUnified && (previewOnly === "unified" || (!previewOnly && unifiedRows.length > 0)) &&
            unifiedChunks.map((chunk, chunkIdx) => {
              const suffix = getSuffix(unifiedChunks.length, chunkIdx);
              const originalTitle = metadata.measurementProtocols?.unifiedHeader?.headerTitle || "Protokół Nr 01 / 2026";
              const chunkHeaderTitle = formatProtocolTitle(originalTitle, suffix);
              const chunkProtocolNumberLabel = formatProtocolNumberLabel(chunkHeaderTitle);
              const isFirstPage = chunkIdx === 0;
              const isLastPage = chunkIdx === unifiedChunks.length - 1;

              return (
                <Page key={`unified-${chunkIdx}`} size="A4" orientation="landscape" style={[styles.landscapePage, styles.previewA4Page]}>
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
                        <View style={[styles.flexRow, styles.itemsCenter, { width: "50%" }]}>
                          <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Napięcie próby:</Text>
                          <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray900, styles.bgGray100, styles.px1, styles.rounded]}>{protocolValue(metadata.measurementProtocols?.insulationTestVoltage, "500V")}</Text>
                        </View>
                        <View style={[styles.flexRow, styles.itemsCenter, styles.justifyEnd, { width: "50%" }]}>
                          <Text style={[styles.textXs, styles.fontBold, styles.textGray600, styles.mr2]}>Układ sieci:</Text>
                          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.bgBlue50, styles.px1, styles.rounded, styles.borderBlue100]}>TN-S / TN-C-S</Text>
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

                  <View style={[styles.mtAuto]}>
                    <View style={[styles.grid2, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'center' }]}>
                      <View style={[styles.grid2Col, styles.textCenter, { maxWidth: 200 }]}>
                        <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na pieczęć / podpis</Text></View>
                        <View style={[styles.borderT, styles.pt2]}>
                          <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Sprawdził (Wykonawca/Elektryk)</Text>
                          <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podpis osoby z uprawnieniami SEP</Text>
                        </View>
                      </View>
                      <View style={{ width: 40 }} />
                      <View style={[styles.grid2Col, styles.textCenter, { maxWidth: 200 }]}>
                        <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na podpis</Text></View>
                        <View style={[styles.borderT, styles.pt2]}>
                          <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Przedstawiciel Inwestora</Text>
                          <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Potwierdzam otrzymanie wyników</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Page>
              );
            })}

          {/* RCD Page in similar style if requested */}
          {(previewOnly === "rcd-ground" || (!previewOnly && metadata.measurementProtocols?.rcdRows?.length > 0)) && (
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
                <View style={[styles.grid2, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'center' }]}>
                  <View style={[styles.grid2Col, styles.textCenter, { maxWidth: 200 }]}>
                    <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na pieczęć / podpis</Text></View>
                    <View style={[styles.borderT, styles.pt2]}>
                      <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Sprawdził (Wykonawca/Elektryk)</Text>
                      <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podpis osoby z uprawnieniami SEP</Text>
                    </View>
                  </View>
                  <View style={{ width: 40 }} />
                  <View style={[styles.grid2Col, styles.textCenter, { maxWidth: 200 }]}>
                    <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na podpis</Text></View>
                    <View style={[styles.borderT, styles.pt2]}>
                      <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Przedstawiciel Inwestora</Text>
                      <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Potwierdzam otrzymanie wyników</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Page>
          )}


          {/* Schematic Images */}
          {(!previewOnly || previewOnly === "schematic") &&
            schematicImages.map((src, index) => (
              <Page key={`schematic-${index}`} size="A4" orientation="landscape" style={{ padding: 0 }}>
                <Image src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Page>
            ))}

          {/* Din Rail Images */}
          {(!previewOnly || previewOnly === "din-rail") &&
            dinRailImages.map((src, index) => (
              <Page key={`din-rail-${index}`} size="A4" orientation="landscape" style={styles.landscapePage}>
                <View style={[styles.bgGray100, styles.px3, styles.py2, styles.rounded, styles.border, styles.mb4]}>
                  <Text style={[styles.textXs, styles.fontBold, styles.textGray800]}>WIDOK ELEWACJI ROZDZIELNICY</Text>
                </View>
                <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Image src={src} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </View>
              </Page>
            ))}
            
          {/* Dummy element to suppress unused variable errors for things not currently rendered in unified mode */}
          <View style={{ display: 'none' }}>
             <Text>{!!groupedCircuits && !!phaseDistribution && !!validationResult ? '' : ''}</Text>
          </View>
        </>
      )}
    </Document>
  );
}
