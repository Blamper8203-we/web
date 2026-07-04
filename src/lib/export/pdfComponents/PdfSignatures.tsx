import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles as styles } from "../pdfPages/pdfStyles";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

export function PdfSignatureRow({ children }: { children: ReactNode }) {
  return <View style={styles.signatureRow}>{children}</View>;
}

export interface PdfSignatureSlotProps {
  label: string;
  subLabel?: string;
  value?: string;
  placeholder?: string;
  isStamp?: boolean;
}

export function PdfSignatureSlot({ label, subLabel, value, placeholder = t("pdf.footer.signatureSlot", "miejsce na podpis"), isStamp }: PdfSignatureSlotProps) {
  return (
    <View style={styles.signatureSlot}>
      {isStamp ? (
        <View style={styles.signatureStampSlot}>
          <Text style={[styles.dataValueMuted, { fontSize: 7, textAlign: "center", paddingHorizontal: 4 }]}>{value || placeholder}</Text>
        </View>
      ) : (
        <View style={styles.signatureLine}>
          {value ? (
            <Text style={[styles.dataValue, { fontSize: 9 }]}>{value}</Text>
          ) : (
            <Text style={[styles.dataValueMuted, { fontSize: 7 }]}>{placeholder}</Text>
          )}
        </View>
      )}
      <Text style={styles.signatureLabel}>{label}</Text>
      {subLabel && <Text style={styles.signatureSubLabel}>{subLabel}</Text>}
    </View>
  );
}

export function PdfSignatureEmptySlot() {
  return <View style={{ width: 160 }} />;
}
