import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { SymbolItem } from '../../types/symbolItem';
import type { ProjectMetadata } from '../../types/projectMetadata';
import type { PhaseDistributionResult } from '../phaseDistribution/phaseDistributionCalculator';
import type { ValidationResult } from '../validation/electricalValidationService';
import { formatDateForField } from '../projectMetadata';
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontStyle: 'italic' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bolditalic-webfont.ttf', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

const UiScale = 0.85; // Odpowiednik UiToPdfScale

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
  AccentOrange: "#F59E0B",
  TableEven: "#F9FAFB",
  TableOdd: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Roboto', color: COLORS.TextColor },
  landscapePage: { padding: 30, fontFamily: 'Roboto', color: COLORS.TextColor },
  
  // Title Page
  titleContainer: {
    border: `1.5pt solid ${COLORS.FrameColor}`,
    padding: 18,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  logoBox: { width: 84, height: 42, border: `1pt solid ${COLORS.CardBorderColor}`, padding: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  heroSection: { alignItems: 'center', marginVertical: 22 },
  
  card: { border: `1pt solid ${COLORS.CardBorderColor}`, padding: 12, backgroundColor: COLORS.White },
  cardLight: { border: `1pt solid ${COLORS.CardBorderColor}`, padding: 12, backgroundColor: COLORS.BackgroundColor },
  cardTitle: { fontSize: 9 * UiScale, color: COLORS.MutedColor, fontWeight: 'bold', marginBottom: 6 },
  
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { width: 80, fontSize: 9.5 * UiScale, fontWeight: 'bold', color: COLORS.TextColor },
  infoValue: { flex: 1, fontSize: 10.4 * UiScale, fontWeight: 'bold', color: COLORS.TextColor, borderBottom: `1pt solid ${COLORS.CardBorderColor}`, paddingBottom: 2 },
  
  divider: { height: 1, backgroundColor: COLORS.DividerColor, marginVertical: 6 },
  
  signatureBox: { alignItems: 'center', flex: 1 },
  stampBox: { width: 88, height: 58, border: `1pt solid ${COLORS.CardBorderColor}`, justifyContent: 'center', alignItems: 'center' },
  
  // Standard Sections
  sectionTitle: { fontSize: 14 * UiScale, fontWeight: 'bold', color: COLORS.PrimaryColor, marginTop: 20, marginBottom: 10, borderBottom: `1pt solid ${COLORS.DividerColor}`, paddingBottom: 4 },
  
  // Circuit Table
  groupHeader: { flexDirection: 'row', backgroundColor: '#E5E7EB', padding: 8, marginTop: 15, alignItems: 'flex-end' },
  table: { width: '100%', border: `1pt solid ${COLORS.CardBorderColor}`, borderBottom: 0 },
  tableRow: { flexDirection: 'row', borderBottom: `1pt solid ${COLORS.CardBorderColor}` },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.PrimaryColor },
  tableCellHeader: { padding: 5, fontSize: 9 * UiScale, fontWeight: 'bold', color: COLORS.White },
  tableCell: { padding: 5, fontSize: 9 * UiScale, color: COLORS.TextColor },
  tableCellBold: { padding: 5, fontSize: 9 * UiScale, fontWeight: 'bold', color: COLORS.AccentGreen },
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

export function PdfProtocolDocument({
  metadata,
  symbols,
  phaseDistribution,
  validationResult,
  schematicImages,
  dinRailImages = [],
  previewOnly,
}: PdfProtocolDocumentProps) {
  
  const mcbSymbols = symbols.filter(s => s.deviceKind === "mcb" || s.deviceKind === "rcbo");
  const rcdSymbols = symbols.filter(s => s.deviceKind === "rcd");
  
  const groupedCircuits = mcbSymbols.reduce((acc, mcb) => {
    const groupName = mcb.group || "standalone";
    if (!acc[groupName]) acc[groupName] = { groupName, mcbs: [], rcd: null };
    acc[groupName].mcbs.push(mcb);
    return acc;
  }, {} as Record<string, { groupName: string, mcbs: SymbolItem[], rcd: SymbolItem | null }>);

  rcdSymbols.forEach(rcd => {
    const groupName = rcd.group || "standalone";
    if (groupedCircuits[groupName]) groupedCircuits[groupName].rcd = rcd;
  });

  const displayDate = formatDateForField(metadata.drawingDate) || formatDateForField(new Date().toISOString());
  const year = new Date().getFullYear();
  const protocolNumber = metadata.projectNumber ? `${metadata.projectNumber} / ${year}` : `....... / ${year}`;
  
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

  return (
    <Document title={`Dokumentacja_${metadata.projectNumber || 'Projekt'}`}>
      
      {/* TITLE PAGE */}
      {(!previewOnly || previewOnly === "title-page") && (
      <Page size="A4" style={{ padding: 10, fontFamily: 'Roboto', color: COLORS.TextColor }}>
        <View style={styles.titleContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={styles.logoBox}>
                {metadata.titlePageCompanyLogoDataUrl ? (
                  <Image src={metadata.titlePageCompanyLogoDataUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Text style={{ fontSize: 7.5 * UiScale, color: COLORS.MutedColor }}>LOGO</Text>
                )}
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 * UiScale, fontWeight: 'bold', color: COLORS.TextColor }}>DOKUMENTACJA POWYKONAWCZA</Text>
                <Text style={{ fontSize: 8 * UiScale, color: COLORS.MutedColor, marginTop: 2 }}>ZGODNOŚĆ Z NORMĄ PN-HD 60364</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8.6 * UiScale, fontWeight: 'bold', color: COLORS.TextColor }}>NR PROTOKOŁU: {protocolNumber}</Text>
              <Text style={{ fontSize: 8.3 * UiScale, color: COLORS.MutedColor, marginTop: 3 }}>Data: {displayDate}</Text>
            </View>
          </View>
          
          <View style={{ height: 1, backgroundColor: COLORS.FrameColor, marginBottom: 10 }} />
          
          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={{ fontSize: 29 * UiScale, fontWeight: 'bold', color: COLORS.TextColor }}>OŚWIADCZENIE WYKONAWCY</Text>
            <Text style={{ fontSize: 11 * UiScale, color: COLORS.MutedColor, marginTop: 4, fontStyle: 'italic' }}>instalacji elektrycznej wykonanej zgodnie z przepisami</Text>
          </View>

          {/* Object Info */}
          <View style={[styles.cardLight, { marginBottom: 12 }]}>
            <Text style={styles.cardTitle}>INFORMACJE O OBIEKCIE</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rodzaj:</Text>
              <Text style={styles.infoValue}>{metadata.titlePageObjectType || metadata.company || "Budynek jednorodzinny / Lokal mieszkalny"}</Text>
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

          {/* Checklists */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={[styles.card, { flex: 1, minHeight: 94 }]}>
              <Text style={[styles.cardTitle, { textAlign: 'center' }]}>ZAKRES PRAC</Text>
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  {workScopeItems.slice(0, 5).map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 9, height: 9, border: `1pt solid ${item.isChecked ? COLORS.CheckMarkGreen : COLORS.TextColor}`, display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
                        {item.isChecked && <Text style={{ fontSize: 8.2 * UiScale, fontWeight: 'bold', color: COLORS.CheckMarkGreen }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 8.5 * UiScale, color: COLORS.TextColor }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  {workScopeItems.slice(5, 10).map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 9, height: 9, border: `1pt solid ${item.isChecked ? COLORS.CheckMarkGreen : COLORS.TextColor}`, display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
                        {item.isChecked && <Text style={{ fontSize: 8.2 * UiScale, fontWeight: 'bold', color: COLORS.CheckMarkGreen }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 8.5 * UiScale, color: COLORS.TextColor }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <View style={[styles.card, { flex: 1, minHeight: 94 }]}>
              <Text style={[styles.cardTitle, { textAlign: 'center' }]}>ZAŁĄCZNIKI</Text>
              <View style={styles.divider} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  {attachmentItems.slice(0, 5).map((item, i) => (
                    <Text key={i} style={{ fontSize: 8.6 * UiScale, color: COLORS.TextColor, marginBottom: 6 }}>- {item}</Text>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Contractor & SEP */}
          <View style={{ flexDirection: 'row', gap: 20, paddingTop: 14, borderTop: `1pt solid ${COLORS.DividerColor}`, marginBottom: 20 }}>
            <View style={[styles.cardLight, { flex: 1 }]}>
              <Text style={[styles.cardTitle, { color: COLORS.TextColor }]}>WYKONAWCA / INSTALATOR</Text>
              <View style={styles.divider} />
              <Text style={{ fontSize: 15 * UiScale, fontWeight: 'bold', color: COLORS.TextColor, marginTop: 6 }}>{metadata.contractor || metadata.author || "................................"}</Text>
              <Text style={{ fontSize: 11 * UiScale, color: COLORS.TextColor }}>{metadata.author || "................................"}</Text>
              <Text style={{ fontSize: 8.2 * UiScale, color: COLORS.MutedColor }}>Dokumentacja odbiorowa instalacji elektrycznej</Text>
            </View>
            <View style={[styles.cardLight, { flex: 1 }]}>
              <Text style={[styles.cardTitle, { color: COLORS.TextColor }]}>UPRAWNIENIA SEP</Text>
              <View style={styles.divider} />
              <Text style={{ fontSize: 12 * UiScale, fontWeight: 'bold', color: COLORS.AccentColor, marginTop: 6 }}>Kwalifikacje: E + D</Text>
              <Text style={{ fontSize: 10 * UiScale, color: COLORS.TextColor }}>Nr: {metadata.designerId || metadata.authorLicense || "................................"}</Text>
              <Text style={{ fontSize: 8.6 * UiScale, color: COLORS.MutedColor }}>Ważne do: {metadata.titlePageSepValidUntil || "................................"}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 'auto', marginBottom: 12 }}>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 8.2 * UiScale, color: COLORS.TextColor, marginBottom: 3, minHeight: 20 }}>{metadata.investorSignature || "nie dotyczy"}</Text>
              <View style={{ height: 1, backgroundColor: COLORS.DividerColor, width: '100%' }} />
              <Text style={{ fontSize: 7.7 * UiScale, color: COLORS.MutedColor, marginTop: 3 }}>PODPIS INWESTORA</Text>
            </View>
            <View style={styles.stampBox}>
              <Text style={{ fontSize: 7.5 * UiScale, color: COLORS.MutedColor }}>PIECZĄTKA WYKONAWCY</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 8.2 * UiScale, color: COLORS.TextColor, marginBottom: 3, minHeight: 20 }}>{metadata.designerSignature || "nie dotyczy"}</Text>
              <View style={{ height: 1, backgroundColor: COLORS.DividerColor, width: '100%' }} />
              <Text style={{ fontSize: 7.7 * UiScale, color: COLORS.MutedColor, marginTop: 3 }}>PODPIS ELEKTRYKA</Text>
            </View>
          </View>

          <View style={{ paddingTop: 8, borderTop: `1pt solid ${COLORS.DividerColor}` }}>
            <Text style={{ fontSize: 7.2 * UiScale, color: COLORS.MutedColor }}>Instalacja została wykonana zgodnie z projektem (jeśli dotyczy), przepisami oraz normą PN-HD 60364. Pomiary wykazały skuteczność zastosowanych środków ochrony.</Text>
          </View>
        </View>
      </Page>
      )}

      {(!previewOnly || previewOnly !== "title-page") && (
        <>
      {/* SCHEMATIC PAGES */}
      {!previewOnly && schematicImages.map((src, i) => (
        <Page key={`schematic-${i}`} size="A4" orientation="landscape" style={{ padding: 0 }}>
          <Image src={src} style={{ width: '100%', height: '100%' }} />
        </Page>
      ))}

      {!previewOnly && dinRailImages.map((src, i) => (
        <Page key={`din-rail-${i}`} size="A4" orientation="landscape" style={styles.landscapePage}>
          <Text style={styles.sectionTitle}>WIDOK ELEWACJI ROZDZIELNICY</Text>
          <View style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Image src={src} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </View>
        </Page>
      ))}

      {!previewOnly && (<>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>ZESTAWIENIE OBWODÓW</Text>
        
        {Object.values(groupedCircuits).map((group, gIdx) => {
          const rcdLabel = group.rcd ? (group.rcd.referenceDesignation || group.rcd.label || "RCD") : group.groupName;
          const rcdDesc = group.rcd ? (group.rcd.protectionType || group.rcd.type) : "Zabezpieczenie grupowe";
          const groupColor = group.rcd ? COLORS.AccentGreen : COLORS.AccentOrange;

          return (
            <View key={gIdx} wrap={false} style={{ marginBottom: 15 }}>
              <View style={styles.groupHeader}>
                <View style={{ width: 75 }}>
                  <Text style={{ fontSize: 8 * UiScale, color: COLORS.MutedColor }}>Nr RCD</Text>
                  <Text style={{ fontSize: 11 * UiScale, fontWeight: 'bold', color: groupColor }}>{rcdLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8 * UiScale, color: COLORS.MutedColor }}>RCD</Text>
                  <Text style={{ fontSize: 11 * UiScale, fontWeight: 'bold', color: groupColor }}>{rcdDesc}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10 * UiScale, color: COLORS.MutedColor }}>{group.mcbs.length} obwodów</Text>
                </View>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Ref.</Text></View>
                  <View style={{ width: '30%' }}><Text style={styles.tableCellHeader}>Nazwa obwodu</Text></View>
                  <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Zabezp.</Text></View>
                  <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Faza</Text></View>
                  <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Moc</Text></View>
                  <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Przekrój</Text></View>
                  <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Lokalizacja</Text></View>
                </View>
                {group.mcbs.map((mcb, i) => {
                  const bg = i % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd;
                  return (
                    <View style={[styles.tableRow, { backgroundColor: bg }]} key={i}>
                      <View style={{ width: '10%' }}><Text style={styles.tableCellBold}>{mcb.referenceDesignation || "-"}</Text></View>
                      <View style={{ width: '30%' }}><Text style={styles.tableCell}>{mcb.circuitName || mcb.label || "-"}</Text></View>
                      <View style={{ width: '15%' }}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{mcb.protectionType || "-"}</Text></View>
                      <View style={{ width: '10%' }}><Text style={styles.tableCell}>{mcb.phase || "-"}</Text></View>
                      <View style={{ width: '10%' }}><Text style={styles.tableCell}>{mcb.powerW > 0 ? `${mcb.powerW}W` : "-"}</Text></View>
                      <View style={{ width: '10%' }}><Text style={styles.tableCell}>{mcb.cableCrossSection ? `${mcb.cableCrossSection} mm²` : "-"}</Text></View>
                      <View style={{ width: '15%' }}><Text style={styles.tableCell}>{mcb.location || "-"}</Text></View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Page>

      {/* POWER BALANCE & VALIDATION */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>BILANS MOCY I WALIDACJA</Text>
        
        <Text style={{ fontSize: 11 * UiScale, fontWeight: 'bold', color: COLORS.MutedColor, marginBottom: 5 }}>Rozkład fazowy</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={{ width: '33%' }}><Text style={styles.tableCellHeader}>Faza</Text></View>
            <View style={{ width: '33%' }}><Text style={styles.tableCellHeader}>Moc całkowita</Text></View>
            <View style={{ width: '34%' }}><Text style={styles.tableCellHeader}>Prąd obciążenia</Text></View>
          </View>
          <View style={[styles.tableRow, { backgroundColor: COLORS.TableEven }]}>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>L1</Text></View>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>{phaseDistribution.l1PowerW.toFixed(0)} W</Text></View>
            <View style={{ width: '34%' }}><Text style={styles.tableCell}>{phaseDistribution.l1CurrentA.toFixed(1)} A</Text></View>
          </View>
          <View style={[styles.tableRow, { backgroundColor: COLORS.TableOdd }]}>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>L2</Text></View>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>{phaseDistribution.l2PowerW.toFixed(0)} W</Text></View>
            <View style={{ width: '34%' }}><Text style={styles.tableCell}>{phaseDistribution.l2CurrentA.toFixed(1)} A</Text></View>
          </View>
          <View style={[styles.tableRow, { backgroundColor: COLORS.TableEven }]}>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>L3</Text></View>
            <View style={{ width: '33%' }}><Text style={styles.tableCell}>{phaseDistribution.l3PowerW.toFixed(0)} W</Text></View>
            <View style={{ width: '34%' }}><Text style={styles.tableCell}>{phaseDistribution.l3CurrentA.toFixed(1)} A</Text></View>
          </View>
        </View>
        
        <Text style={{ marginTop: 10, fontWeight: 'bold', color: COLORS.TextColor }}>
          Asymetria obciążenia: {phaseDistribution.imbalancePercent.toFixed(1)}%
        </Text>

        <Text style={{ fontSize: 11 * UiScale, fontWeight: 'bold', color: COLORS.MutedColor, marginTop: 20, marginBottom: 5 }}>Status walidacji</Text>
        {validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
          <View style={{ backgroundColor: '#ECFDF5', border: '1pt solid #D1FAE5', padding: 10 }}>
            <Text style={{ color: COLORS.AccentGreen, fontWeight: 'bold' }}>Brak błędów i ostrzeżeń. Projekt jest prawidłowy.</Text>
          </View>
        ) : (
          <View>
            {validationResult.errors.map((err, i) => (
              <View key={`err-${i}`} style={{ backgroundColor: '#FEF2F2', border: '1pt solid #FEE2E2', padding: 8, marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', color: '#EF4444', fontSize: 9 * UiScale }}>[BŁĄD {err.code}] {err.message}</Text>
              </View>
            ))}
            {validationResult.warnings.map((warn, i) => (
              <View key={`warn-${i}`} style={{ backgroundColor: '#FFFBEB', border: '1pt solid #FEF3C7', padding: 8, marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.AccentOrange, fontSize: 9 * UiScale }}>[OSTRZEŻENIE {warn.code}] {warn.message}</Text>
              </View>
            ))}
          </View>
        )}
      </Page></>)}

      {/* MEASUREMENT PROTOCOLS */}
      {(previewOnly === "continuity" || (!previewOnly && metadata.measurementProtocols?.continuityRows?.length > 0)) && (
        <Page size="A4" orientation="landscape" style={styles.landscapePage}>
          <Text style={styles.sectionTitle}>{(metadata.measurementProtocols?.continuityHeader?.headerTitle || "PROTOKÓŁ CIĄGŁOŚCI PRZEWODÓW PE").toUpperCase()}</Text>
          <Text style={{ marginBottom: 15, color: COLORS.MutedColor, fontSize: 10 * UiScale }}>{metadata.measurementProtocols?.continuityHeader?.headerSubtitle || "Badanie ciągłości przewodów ochronnych i wyrównawczych"}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={{ width: '5%' }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Oznaczenie</Text></View>
              <View style={{ width: '25%' }}><Text style={styles.tableCellHeader}>Obwód</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.tableCellHeader}>Połączenie</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>R [Ω]</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
            </View>
            {(metadata.measurementProtocols?.continuityRows ?? []).map((r, i) => (
              <View style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]} key={i}>
                <View style={{ width: '5%' }}><Text style={styles.tableCell}>{r.index}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCellBold}>{r.referenceDesignation}</Text></View>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{r.circuitName}</Text></View>
                <View style={{ width: '20%' }}><Text style={styles.tableCell}>{r.connectionType}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCell}>{r.measuredResistance}</Text></View>
                <View style={{ width: '20%' }}><Text style={[styles.tableCell, { color: r.assessment === 'Pozytywna' ? COLORS.AccentGreen : COLORS.TextColor }]}>{r.assessment}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}

      {(previewOnly === "loop" || (!previewOnly && metadata.measurementProtocols?.loopImpedanceRows?.length > 0)) && (
        <Page size="A4" orientation="landscape" style={styles.landscapePage}>
          <Text style={styles.sectionTitle}>{(metadata.measurementProtocols?.loopHeader?.headerTitle || "PROTOKÓŁ BADANIA PĘTLI ZWARCIA").toUpperCase()}</Text>
          <Text style={{ marginBottom: 15, color: COLORS.MutedColor, fontSize: 10 * UiScale }}>{metadata.measurementProtocols?.loopHeader?.headerSubtitle || "Skuteczność samoczynnego wyłączenia zasilania"}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={{ width: '5%' }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Oznaczenie</Text></View>
              <View style={{ width: '25%' }}><Text style={styles.tableCellHeader}>Obwód</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Zabezp.</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Ia [A]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Zs [Ω]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Zs max [Ω]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
            </View>
            {(metadata.measurementProtocols?.loopImpedanceRows ?? []).map((r, i) => (
              <View style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]} key={i}>
                <View style={{ width: '5%' }}><Text style={styles.tableCell}>{r.index}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCellBold}>{r.referenceDesignation}</Text></View>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{r.circuitName}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCell}>{r.protectionType}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.tripCurrent}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.measuredImpedance}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.allowedImpedance}</Text></View>
                <View style={{ width: '10%' }}><Text style={[styles.tableCell, { color: r.assessment === 'Pozytywna' ? COLORS.AccentGreen : COLORS.TextColor }]}>{r.assessment}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}

      {(previewOnly === "insulation" || (!previewOnly && metadata.measurementProtocols?.insulationRows?.length > 0)) && (
        <Page size="A4" orientation="landscape" style={styles.landscapePage}>
          <Text style={styles.sectionTitle}>{(metadata.measurementProtocols?.insulationHeader?.headerTitle || "PROTOKÓŁ REZYSTANCJI IZOLACJI").toUpperCase()}</Text>
          <Text style={{ marginBottom: 15, color: COLORS.MutedColor, fontSize: 10 * UiScale }}>{metadata.measurementProtocols?.insulationHeader?.headerSubtitle || "Badanie stanu izolacji instalacji elektrycznej"}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={{ width: '5%' }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Oznaczenie</Text></View>
              <View style={{ width: '25%' }}><Text style={styles.tableCellHeader}>Obwód</Text></View>
              <View style={{ width: '12%' }}><Text style={styles.tableCellHeader}>L-N [MΩ]</Text></View>
              <View style={{ width: '12%' }}><Text style={styles.tableCellHeader}>L-PE [MΩ]</Text></View>
              <View style={{ width: '12%' }}><Text style={styles.tableCellHeader}>N-PE [MΩ]</Text></View>
              <View style={{ width: '9%' }}><Text style={styles.tableCellHeader}>Wym.</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
            </View>
            {(metadata.measurementProtocols?.insulationRows ?? []).map((r, i) => (
              <View style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]} key={i}>
                <View style={{ width: '5%' }}><Text style={styles.tableCell}>{r.index}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCellBold}>{r.referenceDesignation}</Text></View>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{r.circuitName}</Text></View>
                <View style={{ width: '12%' }}><Text style={styles.tableCell}>{r.lnResistance}</Text></View>
                <View style={{ width: '12%' }}><Text style={styles.tableCell}>{r.lpeResistance}</Text></View>
                <View style={{ width: '12%' }}><Text style={styles.tableCell}>{r.npeResistance}</Text></View>
                <View style={{ width: '9%' }}><Text style={styles.tableCell}>{r.requiredResistance}</Text></View>
                <View style={{ width: '10%' }}><Text style={[styles.tableCell, { color: r.assessment === 'Pozytywna' ? COLORS.AccentGreen : COLORS.TextColor }]}>{r.assessment}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}

      {(previewOnly === "rcd-ground" || (!previewOnly && metadata.measurementProtocols?.rcdRows?.length > 0)) && (
        <Page size="A4" orientation="landscape" style={styles.landscapePage}>
          <Text style={styles.sectionTitle}>{(metadata.measurementProtocols?.rcdGroundHeader?.headerTitle || "PROTOKÓŁ BADAŃ WYŁĄCZNIKÓW RCD").toUpperCase()}</Text>
          <Text style={{ marginBottom: 15, color: COLORS.MutedColor, fontSize: 10 * UiScale }}>{metadata.measurementProtocols?.rcdGroundHeader?.headerSubtitle || "Skuteczność zadziałania wyłączników różnicowoprądowych"}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={{ width: '5%' }}><Text style={styles.tableCellHeader}>Lp.</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Oznaczenie</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.tableCellHeader}>Typ RCD</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>IΔn [mA]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>I test [mA]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Czas [ms]</Text></View>
              <View style={{ width: '10%' }}><Text style={styles.tableCellHeader}>Test man.</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableCellHeader}>Ocena</Text></View>
            </View>
            {(metadata.measurementProtocols?.rcdRows ?? []).map((r, i) => (
              <View style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? COLORS.TableEven : COLORS.TableOdd }]} key={i}>
                <View style={{ width: '5%' }}><Text style={styles.tableCell}>{r.index}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCellBold}>{r.referenceDesignation}</Text></View>
                <View style={{ width: '20%' }}><Text style={styles.tableCell}>{r.deviceType}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCell}>{r.residualCurrent}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.tripCurrent}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.tripTimeMs}</Text></View>
                <View style={{ width: '10%' }}><Text style={styles.tableCell}>{r.testButtonResult}</Text></View>
                <View style={{ width: '15%' }}><Text style={[styles.tableCell, { color: r.assessment === 'Pozytywna' ? COLORS.AccentGreen : COLORS.TextColor }]}>{r.assessment}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}
        </>
      )}
    </Document>
  );
}
