import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles as styles, palette } from "../pdfPages/pdfStyles";

export function PdfTable({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={[styles.table, style]}>{children}</View>;
}

export function PdfTableHeaderRow({ children, isSubHeader }: { children: ReactNode; isSubHeader?: boolean }) {
  return (
    <View style={[styles.tableHeaderRow, isSubHeader ? { backgroundColor: palette.inkSecondary } : {}]}>
      {children}
    </View>
  );
}

export function PdfTableHeaderCell({ children, width, align = "left", style }: { children?: ReactNode; width?: string | number; align?: "left" | "center"; style?: any }) {
  const cellStyle = align === "center" ? styles.tableHeaderCellCenter : styles.tableHeaderCell;
  return (
    <View style={[cellStyle, { width }, style]}>
      {typeof children === "string" || typeof children === "number" ? <Text>{children}</Text> : children}
    </View>
  );
}

export function PdfTableBodyRow({ children, isAlt }: { children: ReactNode; isAlt?: boolean }) {
  return <View style={isAlt ? styles.tableBodyRowAlt : styles.tableBodyRow}>{children}</View>;
}

export function PdfTableCell({ children, width, align = "left", variant = "normal", style }: { children?: ReactNode; width?: string | number; align?: "left" | "center"; variant?: "normal" | "muted" | "emphasis" | "index" | "success"; style?: any }) {
  let cellStyle = styles.tableCell;
  if (variant === "muted") cellStyle = align === "center" ? styles.tableCellMutedCenter : styles.tableCellMuted;
  else if (variant === "emphasis") cellStyle = align === "center" ? styles.tableCellEmphasisCenter : styles.tableCellEmphasis;
  else if (variant === "index") cellStyle = styles.tableCellIndex;
  else if (variant === "success") cellStyle = styles.tableCellSuccess;
  else cellStyle = align === "center" ? styles.tableCellCenter : styles.tableCell;

  return (
    <View style={[cellStyle, { width }, style]}>
      {typeof children === "string" || typeof children === "number" ? <Text>{children}</Text> : children}
    </View>
  );
}
