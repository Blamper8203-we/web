import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles as styles } from "../pdfPages/pdfStyles";

export function PdfEyebrow({ children, style }: { children: ReactNode; style?: any }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function PdfTitle({ children, style }: { children: ReactNode; style?: any }) {
  return <Text style={[styles.pageTitle, style]}>{children}</Text>;
}

export function PdfSubtitle({ children, style }: { children: ReactNode; style?: any }) {
  return <Text style={[styles.pageSubtitle, style]}>{children}</Text>;
}

export function PdfHero({ eyebrow, title, subtitle, style }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; style?: any }) {
  return (
    <View style={[{ marginBottom: 12, marginTop: 0 }, style]}>
      {eyebrow && <PdfEyebrow>{eyebrow}</PdfEyebrow>}
      <Text style={[styles.pageTitle, { fontSize: 26, marginTop: 6, lineHeight: 1.1 }]}>
        {title}
      </Text>
      {subtitle && <PdfSubtitle style={{ marginTop: 6 }}>{subtitle}</PdfSubtitle>}
    </View>
  );
}

export function PdfMeta({ label, value, valueSubtle }: { label: ReactNode; value: ReactNode; valueSubtle?: ReactNode }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
      {valueSubtle && <Text style={styles.metaValueSubtle}>{valueSubtle}</Text>}
    </View>
  );
}
