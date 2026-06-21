import { Font, StyleSheet } from "@react-pdf/renderer";

export const A4_PREVIEW_PADDING = 42.5;

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

export const pdfStyles = StyleSheet.create({
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
  textBrand: { color: "#1e3a5f" },
  textBlue400: { color: "#60A5FA" },
  textEmerald600: { color: "#059669" },
  textRed500: { color: "#EF4444" },
  textAmber600: { color: "#D97706" },
  
  bgWhite: { backgroundColor: "#FFFFFF" },
  bgGray50: { backgroundColor: "#F9FAFB" },
  bgGray100: { backgroundColor: "#F3F4F6" },
  bgGray950: { backgroundColor: "#030712" },
  bgBrand: { backgroundColor: "#1e3a5f" },
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
  
  checkboxContainer: { width: 14, height: 14, borderRadius: 3, backgroundColor: "transparent", borderWidth: 1, borderColor: "#1e3a5f", borderStyle: "solid", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxChecked: { color: "#1e3a5f", fontSize: 10, fontWeight: "bold" },
  
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
  validationGroupInfo: { borderLeftWidth: 3, borderLeftColor: "#1e3a5f" },
  validationMessage: { paddingTop: 5, marginTop: 5, borderTopWidth: 1, borderTopColor: "#E5E7EB", borderTopStyle: "solid" },
});
