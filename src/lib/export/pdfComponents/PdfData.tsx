import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles as styles } from "../pdfPages/pdfStyles";

export interface PdfSectionProps {
  number?: string;
  title: string | ReactNode;
  children?: ReactNode;
}

export function PdfSection({ number, title, children }: PdfSectionProps) {
  return (
    <>
      <View style={styles.sectionHeading}>
        {number && <Text style={styles.sectionNumber}>{number}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children && <View>{children}</View>}
    </>
  );
}

export interface PdfDataRowProps {
  label: ReactNode;
  value: ReactNode;
  isLast?: boolean;
  labelWidth?: number | string;
  valueStyle?: any;
}

export function PdfDataRow({ label, value, isLast, labelWidth = 140, valueStyle }: PdfDataRowProps) {
  return (
    <View style={isLast ? styles.dataRowLast : styles.dataRow}>
      <Text style={[styles.dataLabel, { width: labelWidth }]}>{label}</Text>
      <Text style={[styles.dataValue, { flex: 1 }, valueStyle]}>{value}</Text>
    </View>
  );
}

export function PdfGrid({ children, columns = 2, style }: { children: ReactNode; columns?: 2 | 3; style?: any }) {
  const gridStyle = columns === 2 ? styles.twoColGrid : styles.threeColGrid;
  return <View style={[gridStyle, style]}>{children}</View>;
}

export function PdfGridColumn({ children, columns = 2, style }: { children?: ReactNode; columns?: 2 | 3; style?: any }) {
  const colStyle = columns === 2 ? styles.twoColGridItem : styles.threeColGridItem;
  return <View style={[colStyle, style]}>{children}</View>;
}

export function PdfCallout({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.callout}>
      {title && <Text style={styles.calloutTitle}>{title}</Text>}
      <Text style={styles.calloutBody}>{children}</Text>
    </View>
  );
}

export function PdfCheckbox({ isChecked, label }: { isChecked?: boolean; label: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
      <View style={styles.checkboxContainer}>
        {isChecked ? <Text style={styles.checkboxChecked}>✓</Text> : null}
      </View>
      <Text style={[styles.dataValue, { fontSize: 9, fontWeight: "normal" }]}>{label}</Text>
    </View>
  );
}

export function PdfBadge({ children }: { children: ReactNode }) {
  return (
    <View style={styles.protocolNumberPill}>
      <Text style={styles.protocolNumberText}>{children}</Text>
    </View>
  );
}
