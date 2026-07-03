import { Font, StyleSheet } from "@react-pdf/renderer";

// =============================================================================
//  DINBoard PDF Design Tokens
// =============================================================================
//
//  Style: "Modern Technical Documentation"
//  Inspiration: Linear / Stripe Docs / Notion Reports — restrained, professional,
//  prints beautifully on A4 (mono or color), ages well.
//
//  Design rules:
//    1. ONE accent color (navy #1E3A5F) — never on body text, never on bg
//       fills except: section rules, table headers, navy top bar, accent bars
//       on callouts/statements.
//    2. NO card-itis — sections separated by whitespace + numbered markers,
//       not by bordered boxes. Cards only where content is genuinely discrete
//       (e.g. RCD grouping where the boundary is semantic).
//    3. Hairline borders — borders are #E2E8F0 (1pt) by default. Navy borders
//       only on table top edges and the page top bar.
//    4. Vertical type rhythm — labels uppercase tracked; values regular case.
//    5. Footer page info uses muted slate (#94A3B8) — never gray-500.
// =============================================================================

export const A4_PREVIEW_PADDING = 42.5;

// Aria is a system-safe Arial-equivalent; we still register the TTF explicitly
// because @react-pdf/renderer needs the font in its own registry.
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

// Reusable color constants — exported so page components can use them for
// inline overrides without re-typing hex.
export const palette = {
  brand: "#1E3A5F",          // DINBoard navy — primary accent
  brandStrong: "#2D5078",    // hover / active / section emphasis
  brandSubtle: "#F1F4F9",    // very light tint for accent backgrounds
  ink: "#0F172A",            // primary text — slate-900
  inkSecondary: "#334155",   // secondary text — slate-700
  inkTertiary: "#64748B",    // tertiary text — slate-500
  inkMuted: "#94A3B8",       // captions / footer — slate-400
  inkInverse: "#FFFFFF",
  pageBg: "#FAF9F6",         // warm off-white paper
  rowAltBg: "#F8FAFC",       // alternating row tint
  hairline: "#E2E8F0",       // 1pt borders — slate-200
  border: "#CBD5E1",         // default borders — slate-300
  borderStrong: "#94A3B8",   // emphasized borders — slate-400
  success: "#047857",        // emerald-700 — assessment "Pozytywna"
  warning: "#B45309",        // amber-700
  danger: "#B91C1C",         // red-700
  info: "#1E3A5F",           // = brand
  infoTint: "#EFF4FA",       // light blue tint for Riso columns
};

export const pdfStyles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────
  // PAGE BASE
  // ─────────────────────────────────────────────────────────────────────
  page: {
    padding: 36,
    paddingTop: 28,
    fontFamily: "Arial",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 9,
    lineHeight: 1.45,
  },
  landscapePage: {
    padding: 32,
    paddingTop: 24,
    fontFamily: "Arial",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 9,
    lineHeight: 1.45,
  },
  titlePage: {
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 32,
    fontFamily: "Arial",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 9,
    lineHeight: 1.45,
  },
  previewA4Page: { padding: A4_PREVIEW_PADDING },

  // ─────────────────────────────────────────────────────────────────────
  // PAGE TOP BAR (3pt navy stripe at top of every page)
  // ─────────────────────────────────────────────────────────────────────
  pageTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: palette.brand,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PAGE HEADER (replaces heavy border-b-2-dark pattern)
  // title-block left | meta right; separated by hairline rule under
  // ─────────────────────────────────────────────────────────────────────
  pageHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    marginBottom: 22,
    borderBottomWidth: 0.75,
    borderBottomColor: palette.ink,
    borderBottomStyle: "solid",
  },
  pageHeaderLeft: { display: "flex", flexDirection: "row", alignItems: "center", flex: 1 },
  pageHeaderRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "32%" },

  // Eyebrow tag — small uppercase tracked label above the page title
  eyebrow: {
    fontSize: 7,
    fontWeight: "bold",
    color: palette.brand,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  // Page H1 — the main title of the page
  pageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: palette.ink,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    lineHeight: 1.2,
  },

  // Subtitle — muted description under page title
  pageSubtitle: {
    fontSize: 8.5,
    color: palette.inkTertiary,
    marginTop: 3,
  },

  // Meta on the right side of header (date / object)
  metaLabel: {
    fontSize: 7,
    color: palette.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: palette.ink,
  },
  metaValueSubtle: {
    fontSize: 8.5,
    color: palette.inkSecondary,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SECTION HEADING — numbered marker + title + thin rule
  // replaces gray-100 pillbox pattern
  // ─────────────────────────────────────────────────────────────────────
  sectionHeading: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 18,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  sectionNumber: {
    fontSize: 9,
    fontWeight: "bold",
    color: palette.brand,
    marginRight: 10,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: palette.ink,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },

  // ─────────────────────────────────────────────────────────────────────
  // DATA LAYOUT — label : value pairs (replaces bordered cards)
  // ─────────────────────────────────────────────────────────────────────
  dataRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  dataRowLast: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 5,
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: palette.inkSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dataValue: {
    fontSize: 10,
    color: palette.ink,
    fontWeight: "bold",
  },
  dataValueMuted: {
    fontSize: 10,
    color: palette.inkTertiary,
    fontStyle: "italic",
  },

  // ─────────────────────────────────────────────────────────────────────
  // TWO-COLUMN DATA GRID — replaces card grids for scope / attachments /
  // contractor / license blocks
  // ─────────────────────────────────────────────────────────────────────
  twoColGrid: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  twoColGridItem: { width: "48%" },
  threeColGrid: { display: "flex", flexDirection: "row", justifyContent: "space-between" },
  threeColGridItem: { width: "31%" },

  // ─────────────────────────────────────────────────────────────────────
  // STATEMENT BLOCK — left accent bar + generous padding (replaces card)
  // ─────────────────────────────────────────────────────────────────────
  statementBlock: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 14,
    marginVertical: 18,
    borderLeftWidth: 3,
    borderLeftColor: palette.brand,
    borderLeftStyle: "solid",
    backgroundColor: palette.brandSubtle,
  },
  statementTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: palette.brand,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  statementBody: {
    fontSize: 9.5,
    color: palette.inkSecondary,
    lineHeight: 1.55,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SIGNATURE ROW — minimal: thin line + label
  // ─────────────────────────────────────────────────────────────────────
  signatureRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 20,
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: palette.hairline,
    borderTopStyle: "solid",
  },
  signatureSlot: {
    width: 160,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    height: 36,
    borderBottomWidth: 0.75,
    borderBottomColor: palette.inkMuted,
    borderBottomStyle: "solid",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  signatureStampSlot: {
    width: "100%",
    height: 56,
    borderWidth: 0.5,
    borderColor: palette.border,
    borderStyle: "dashed",
    borderRadius: 2,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  signatureLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: palette.ink,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 6,
    textAlign: "center",
  },
  signatureSubLabel: {
    fontSize: 6.5,
    color: palette.inkMuted,
    marginTop: 2,
    textAlign: "center",
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHECKBOX — slim, navy border, navy check
  // ─────────────────────────────────────────────────────────────────────
  checkboxContainer: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 0.75,
    borderColor: palette.brand,
    borderStyle: "solid",
    backgroundColor: palette.inkInverse,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    color: palette.brand,
    fontSize: 9,
    fontWeight: "bold",
    lineHeight: 1,
  },

  // ─────────────────────────────────────────────────────────────────────
  // TABLE — navy header, alternating rows, no vertical lines
  // ─────────────────────────────────────────────────────────────────────
  table: {
    borderTopWidth: 1.5,
    borderTopColor: palette.brand,
    borderTopStyle: "solid",
    marginBottom: 12,
  },
  tableHeaderRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.brand,
    color: palette.inkInverse,
  },
  tableHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: palette.inkInverse,
    display: "flex",
    alignItems: "center",
  },
  tableHeaderCellCenter: {
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: palette.inkInverse,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableBodyRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.inkInverse,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  tableBodyRowAlt: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.rowAltBg,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  tableCell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
  },
  tableCellCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableCellMuted: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.inkTertiary,
    display: "flex",
    alignItems: "center",
  },
  tableCellMutedCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.inkTertiary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableCellEmphasis: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.ink,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
  },
  tableCellEmphasisCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.ink,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableCellIndex: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.inkTertiary,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  // For Riso group of 3 sub-columns under merged header
  tableCellInfo: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.ink,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: palette.infoTint,
  },
  // Success-coloured assessment
  tableCellSuccess: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 8.5,
    color: palette.success,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  // ─────────────────────────────────────────────────────────────────────
  // PROTOCOL NUMBER PILL — small navy filled chip
  // ─────────────────────────────────────────────────────────────────────
  protocolNumberPill: {
    backgroundColor: palette.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    alignSelf: "flex-end",
  },
  protocolNumberText: {
    color: palette.inkInverse,
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },

  // ─────────────────────────────────────────────────────────────────────
  // CALLOUT — for documentation sections
  // ─────────────────────────────────────────────────────────────────────
  callout: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: palette.brandSubtle,
    borderLeftWidth: 3,
    borderLeftColor: palette.brand,
    borderLeftStyle: "solid",
  },
  calloutTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: palette.brand,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  calloutBody: {
    fontSize: 9.5,
    color: palette.inkSecondary,
    lineHeight: 1.55,
  },

  // ─────────────────────────────────────────────────────────────────────
  // FOOTER (page-fixed band)
  // ─────────────────────────────────────────────────────────────────────
  pageFooter: {
    position: "absolute",
    bottom: 14,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: palette.hairline,
    borderTopStyle: "solid",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageFooterText: {
    fontSize: 6.5,
    color: palette.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // ─────────────────────────────────────────────────────────────────────
  // UTILITY (kept for backwards compat with minimal use)
  // ─────────────────────────────────────────────────────────────────────
  flex: { display: "flex" },
  flexRow: { display: "flex", flexDirection: "row" },
  flexCol: { display: "flex", flexDirection: "column" },
  flex1: { flex: 1 },
  flexWrap: { flexWrap: "wrap" },
  itemsCenter: { alignItems: "center" },
  itemsEnd: { alignItems: "flex-end" },
  justifyBetween: { justifyContent: "space-between" },
  justifyCenter: { justifyContent: "center" },
  justifyEnd: { justifyContent: "flex-end" },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" },
  wFull: { width: "100%" },
  mtAuto: { marginTop: "auto" },

  // Spacing helpers (point values)
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  mt5: { marginTop: 20 },
  mt6: { marginTop: 28 },
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  mb5: { marginBottom: 20 },
  mb6: { marginBottom: 28 },
  mr2: { marginRight: 8 },
  mr3: { marginRight: 12 },

  // Padding helpers
  p2: { padding: 8 },
  p3: { padding: 12 },
  p4: { padding: 16 },
  px2: { paddingHorizontal: 8 },
  px3: { paddingHorizontal: 12 },
  px4: { paddingHorizontal: 16 },
  py1: { paddingVertical: 4 },
  py2: { paddingVertical: 8 },
  py3: { paddingVertical: 12 },
  py4: { paddingVertical: 16 },
  pt4: { paddingTop: 16 },
  pb2: { paddingBottom: 8 },
  pb3: { paddingBottom: 12 },
  pb4: { paddingBottom: 16 },

  // Typography helpers (use the semantic names in new code)
  textXs: { fontSize: 7.5 },
  textSm: { fontSize: 9 },
  textBase: { fontSize: 10.5 },
  textLg: { fontSize: 14 },
  textXl: { fontSize: 18 },
  text2xl: { fontSize: 22 },

  fontNormal: { fontWeight: "normal" },
  fontMedium: { fontWeight: "normal" },
  fontSemiBold: { fontWeight: "bold" },
  fontBold: { fontWeight: "bold" },
  fontExtraBold: { fontWeight: "bold" },
  fontBlack: { fontWeight: "bold" },

  italic: { fontStyle: "italic" },
  uppercase: { textTransform: "uppercase" },

  // Color helpers (slate palette + brand)
  textWhite: { color: palette.inkInverse },
  textInk: { color: palette.ink },
  textInkSecondary: { color: palette.inkSecondary },
  textInkTertiary: { color: palette.inkTertiary },
  textInkMuted: { color: palette.inkMuted },
  textBrand: { color: palette.brand },
  textBrandStrong: { color: palette.brandStrong },
  textSuccess: { color: palette.success },
  textWarning: { color: palette.warning },
  textDanger: { color: palette.danger },

  // Surfaces
  bgWhite: { backgroundColor: palette.inkInverse },
  bgRowAlt: { backgroundColor: palette.rowAltBg },
  bgBrand: { backgroundColor: palette.brand },
  bgBrandSubtle: { backgroundColor: palette.brandSubtle },
  bgPage: { backgroundColor: palette.pageBg },

  // Logo
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: palette.border,
    borderStyle: "solid",
    padding: 3,
    backgroundColor: palette.inkInverse,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%", objectFit: "contain" },
  logoPlaceholderText: { color: palette.inkMuted, fontSize: 7, fontWeight: "bold" },
});