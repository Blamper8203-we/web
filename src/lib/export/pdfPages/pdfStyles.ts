import { Font, StyleSheet } from "@react-pdf/renderer";

// =============================================================================
//  DINBoard PDF Design Tokens — "Engineering Hierarchy" (Style 8)
// =============================================================================
//
//  Style: "Engineering Hierarchy Done Right"
//  Inspiration: Siemens S7 manuals, ABB drive datasheets, Phoenix Contact
//  catalogues — professional industrial documentation where hierarchy is
//  created with Restrained Eyebrow + Tracked UPPERCASE on structural labels,
//  but DATA and inline labels stay in regular case for readability.
//
//  Design rules (per AGENTS.md "PDF is part of engineering deliverable"):
//    1. ONE accent color (warm amber #d97706) — used SPARINGLY for hierarchy
//       cues (page top bar, eyebrow text, section numbers, protocol pill).
//       Never on body text, never on data values.
//    2. UPPERCASE + letter-spacing ONLY on STRUCTURAL labels (brand strip,
//       section titles, table headers, footer chrome). DATA labels stay in
//       sentence case — "Rodzaj obiektu" not "RODZAJ OBIEKTU".
//    3. Hairline borders — borders are #E5E7EB (0.5–0.75pt) by default. Ink
//       (#1F2937) only on table top edges, page top bar, signature lines.
//    4. Vertical type rhythm — section numbers mono + amber, labels muted
//       gray, values dark slate + bold. Hero titles: regular case, tight
//       tracking (negative letter-spacing on big text).
//    5. Footer chrome uses tracked UPPERCASE small caps (intentional
//       typographic micro-detail — same as Siemens datasheet footers).
// =============================================================================

export const A4_PREVIEW_PADDING = 42.5;

// IBM Plex Sans — primary type family for the PDF. Sans-serif designed by
// IBM for engineering/technical content (paired with Plex Mono for chrome).
// TTF files bundled under public/fonts/. SIL Open Font License 1.1 — see
// public/fonts/IBMPlexSans-OFL.txt for the full license text and copyright
// notice ("Plex" is a Reserved Font Name; we use the family as-shipped).
Font.register({
  family: "IBM Plex Sans",
  fonts: [
    { src: "/fonts/IBMPlexSans-Regular.ttf" },
    { src: "/fonts/IBMPlexSans-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/IBMPlexSans-Italic.ttf", fontStyle: "italic" },
    { src: "/fonts/IBMPlexSans-BoldItalic.ttf", fontWeight: "bold", fontStyle: "italic" },
  ],
});

// IBM Plex Mono — for technical chrome (section numbers, numeric protocol
// codes). Same license as Plex Sans — see public/fonts/IBMPlexMono-OFL.txt.
Font.register({
  family: "IBM Plex Mono",
  fonts: [
    { src: "/fonts/IBMPlexMono-Regular.ttf" },
    { src: "/fonts/IBMPlexMono-Bold.ttf", fontWeight: "bold" },
  ],
});

// Arial TTF is kept as a defensive fallback in case the Plex Sans TTF fails
// to load in a constrained environment (e.g. headless renderer without
// internet — though our TTF is bundled locally, network policy can still
// block it on some CI runners). @react-pdf/renderer falls back automatically
// if the registered family isn't found.
Font.register({
  family: "Arial",
  fonts: [
    { src: "/fonts/arial.ttf" },
    { src: "/fonts/arialbd.ttf", fontWeight: "bold" },
    { src: "/fonts/ariali.ttf", fontStyle: "italic" },
    { src: "/fonts/arialbi.ttf", fontWeight: "bold", fontStyle: "italic" },
  ],
});

// Reusable color constants — exported so page components can use them for
// inline overrides without re-typing hex.
export const palette = {
  // Accent — crisp corporate teal, professional and modern
  accent: "#0d9488",          // teal-600 — page top bar, eyebrow, section numbers
  accentStrong: "#0f766e",    // teal-700 — pressed/hover/focus state
  accentSubtle: "#f0fdfa",    // teal-50 — very light tinted backgrounds

  // Backward-compat aliases
  brand: "#0d9488",
  brandStrong: "#0f766e",
  brandSubtle: "#f0fdfa",

  // Ink hierarchy — clean slate
  ink: "#0f172a",             // slate-900 — primary text + table header bg
  inkSecondary: "#334155",    // slate-700
  inkTertiary: "#64748b",     // slate-500 — inline labels (regular case)
  inkMuted: "#94a3b8",        // slate-400 — page footer text
  inkInverse: "#ffffff",

  // Surfaces
  pageBg: "#ffffff",
  rowAltBg: "#f8fafc",        // slate-50 — very subtle zebra
  hairline: "#e2e8f0",        // slate-200 — default border
  border: "#cbd5e1",          // slate-300
  borderStrong: "#94a3b8",    // slate-400

  // Status (kept semantic, no brand-color pollution)
  success: "#059669",         // emerald-600 — measurement pass
  warning: "#d97706",         // amber-600 — measurement warning
  danger: "#dc2626",          // red-600 — measurement fail
  info: "#0d9488",            // alias for accent (kept for backward compat)
  infoTint: "#f0fdfa",        // alias for accentSubtle
};

export const pdfStyles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────
  // PAGE BASE
  // ─────────────────────────────────────────────────────────────────────
  page: {
    padding: 36,
    paddingTop: 28,
    fontFamily: "IBM Plex Sans",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 10,
    lineHeight: 1.5,
  },
  landscapePage: {
    padding: 32,
    paddingTop: 24,
    fontFamily: "IBM Plex Sans",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 10,
    lineHeight: 1.5,
  },
  titlePage: {
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 32,
    fontFamily: "IBM Plex Sans",
    color: palette.ink,
    backgroundColor: palette.pageBg,
    fontSize: 10,
    lineHeight: 1.5,
  },
  previewA4Page: { padding: A4_PREVIEW_PADDING },

  // ─────────────────────────────────────────────────────────────────────
  // PAGE TOP BAR — Thin 3px amber line at the very top edge of the page
  // ─────────────────────────────────────────────────────────────────────
  pageTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: palette.accent,
  },

  // ─────────────────────────────────────────────────────────────────────
  // PAGE HEADER — Clean, minimalist white header separated by a single dark line
  // ─────────────────────────────────────────────────────────────────────
  pageHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: palette.ink,
    borderBottomStyle: "solid",
  },
  pageHeaderLeft: { display: "flex", flexDirection: "row", alignItems: "center", flex: 1 },
  pageHeaderRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "32%" },

  // Eyebrow tag — small uppercase tracked accent label above titles.
  // (Only place where uppercase + tracking is OK at small sizes — it serves
  // hierarchy, not decoration. See PdfTitlePage for paired hero eyebrow.)
  eyebrow: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: palette.accent,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 4,
  },

  // Page H1 — big regular-case title (NO uppercase, tight tracking).
  // This is the key visual change: hero titles no longer shout.
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: palette.ink,
    letterSpacing: -0.5,
    lineHeight: 1.15,
  },

  // Page brand — single-line identity in page header left block.
  pageBrand: {
    fontSize: 12,
    fontWeight: "bold",
    color: palette.ink,
    letterSpacing: 0,
  },
  // Page brand sub — small norm reference under brand line.
  pageBrandSub: {
    fontSize: 8.5,
    color: palette.inkTertiary,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // Page header right block — compact one-line metadata.
  pageHeaderRightLine: {
    fontSize: 10,
    color: palette.ink,
    fontWeight: "bold",
    textAlign: "right",
  },
  pageHeaderRightLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: palette.inkTertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  pageHeaderRightValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: palette.ink,
  },
  pageHeaderRightSep: {
    fontSize: 10,
    color: palette.inkTertiary,
    fontWeight: "normal",
  },

  // Subtitle — muted regular-case description under page title.
  pageSubtitle: {
    fontSize: 10,
    color: palette.inkTertiary,
    marginTop: 4,
    lineHeight: 1.45,
  },

  // Meta on the right side of header (date / object).
  // Tracked UPPERCASE small label = chrome, OK here.
  metaLabel: {
    fontSize: 7.5,
    color: palette.inkTertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
    fontWeight: "bold",
  },
  metaValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: palette.ink,
  },
  metaValueSubtle: {
    fontSize: 9.5,
    color: palette.inkSecondary,
  },

  // ─────────────────────────────────────────────────────────────────────
  // SECTION HEADING — amber mono number + UPPERCASE title + ink hairline.
  // WHY: tighter margins than previous version (18/8 instead of 22/12)
  // to keep 3 sections + statement + signatures on one A4 page.
  // ─────────────────────────────────────────────────────────────────────
  sectionHeading: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: palette.accent,
    borderBottomStyle: "solid",
  },
  sectionNumber: {
    fontFamily: "IBM Plex Mono",
    fontSize: 10,
    fontWeight: "bold",
    color: palette.accent,
    marginRight: 12,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: palette.ink,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  // ─────────────────────────────────────────────────────────────────────
  // DATA LAYOUT — KEY CHANGE: labels in SENTENCE case, no tracking.
  // This is the single biggest typographic shift from the previous design —
  // "Rodzaj obiektu" now reads as a label, not as a shout.
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
    fontSize: 9.5,
    fontWeight: "normal",
    color: palette.inkTertiary,
    // NO textTransform. NO letterSpacing. Just sentence-case muted text.
  },
  dataValue: {
    fontSize: 10.5,
    color: palette.ink,
    fontWeight: "bold",
  },
  dataValueMuted: {
    fontSize: 10,
    color: palette.inkTertiary,
    fontStyle: "italic",
  },

  // ─────────────────────────────────────────────────────────────────────
  // TWO-COLUMN DATA GRID
  // ─────────────────────────────────────────────────────────────────────
  twoColGrid: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  twoColGridItem: { width: "48%" },
  threeColGrid: { display: "flex", flexDirection: "row", justifyContent: "space-between" },
  threeColGridItem: { width: "31%" },

  // ─────────────────────────────────────────────────────────────────────
  // STATEMENT BLOCK — light amber tint + amber left bar (was navy).
  // WHY: tighter padding than the previous version so the statement fits
  // comfortably above the signature row on a single A4 page (no overflow).
  // ─────────────────────────────────────────────────────────────────────
  statementBlock: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 10,
    paddingBottom: 10,
    marginVertical: 14,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    borderLeftStyle: "solid",
    backgroundColor: palette.accentSubtle,
  },
  statementTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: palette.accent,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  statementBody: {
    fontSize: 9,
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
    paddingTop: 22,
    marginTop: 22,
    borderTopWidth: 0.5,
    borderTopColor: palette.hairline,
    borderTopStyle: "solid",
  },
  signatureSlot: {
    width: 150,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    height: 44,
    borderBottomWidth: 0.75,
    borderBottomColor: palette.ink,
    borderBottomStyle: "solid",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  signatureStampSlot: {
    width: "100%",
    height: 44,
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
    fontSize: 8.5,
    fontWeight: "bold",
    color: palette.ink,
    marginTop: 6,
    textAlign: "center",
  },
  signatureSubLabel: {
    fontSize: 7,
    color: palette.inkTertiary,
    marginTop: 2,
    textAlign: "center",
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHECKBOX — slim, ink border, ink check (was navy → now ink for less
  // visual noise; amber is reserved for hierarchy)
  // ─────────────────────────────────────────────────────────────────────
  checkboxContainer: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 0.75,
    borderColor: palette.ink,
    borderStyle: "solid",
    backgroundColor: palette.inkInverse,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    color: palette.ink,
    fontSize: 9,
    fontWeight: "bold",
    lineHeight: 1,
  },

  // ─────────────────────────────────────────────────────────────────────
  // TABLE — Minimalist Swiss Design. No dark headers, clean hairlines.
  // ─────────────────────────────────────────────────────────────────────
  table: {
    borderTopWidth: 2,
    borderTopColor: palette.ink,
    borderTopStyle: "solid",
    marginBottom: 16,
  },
  tableHeaderRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: palette.ink,
    borderBottomStyle: "solid",
  },
  tableHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.0,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
  },
  tableHeaderCellCenter: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.0,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableBodyRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.pageBg,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  tableBodyRowAlt: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: palette.pageBg, // No zebra striping in minimal design
    borderBottomWidth: 0.5,
    borderBottomColor: palette.hairline,
    borderBottomStyle: "solid",
  },
  tableCell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
  },
  tableCellCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableCellMuted: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.inkTertiary,
    display: "flex",
    alignItems: "center",
  },
  tableCellMutedCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.inkTertiary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableCellEmphasis: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.ink,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
  },
  tableCellEmphasisCenter: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
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
    fontSize: 9,
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
    fontSize: 9,
    color: palette.ink,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: palette.infoTint,
  },
  // Success-coloured assessment (measurement pass)
  tableCellSuccess: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 9,
    color: palette.success,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  // ─────────────────────────────────────────────────────────────────────
  // PROTOCOL NUMBER PILL — small amber filled chip
  // ─────────────────────────────────────────────────────────────────────
  protocolNumberPill: {
    backgroundColor: palette.accent,
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
  // CALLOUT — for documentation sections (light amber tint + amber left bar)
  // ─────────────────────────────────────────────────────────────────────
  callout: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: palette.accentSubtle,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    borderLeftStyle: "solid",
  },
  calloutTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: palette.accent,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  calloutBody: {
    fontSize: 10,
    color: palette.inkSecondary,
    lineHeight: 1.6,
  },

  // ─────────────────────────────────────────────────────────────────────
  // FOOTER (page-fixed band) — tracked UPPERCASE small chrome
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
    fontSize: 7.5,
    color: palette.inkTertiary,
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
  textXs: { fontSize: 8 },
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

  // Color helpers (slate palette + accent)
  textWhite: { color: palette.inkInverse },
  textInk: { color: palette.ink },
  textInkSecondary: { color: palette.inkSecondary },
  textInkTertiary: { color: palette.inkTertiary },
  textInkMuted: { color: palette.inkMuted },
  textBrand: { color: palette.accent },
  textBrandStrong: { color: palette.accentStrong },
  textSuccess: { color: palette.success },
  textWarning: { color: palette.warning },
  textDanger: { color: palette.danger },

  // Surfaces
  bgWhite: { backgroundColor: palette.inkInverse },
  bgRowAlt: { backgroundColor: palette.rowAltBg },
  bgBrand: { backgroundColor: palette.accent },
  bgBrandSubtle: { backgroundColor: palette.accentSubtle },
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