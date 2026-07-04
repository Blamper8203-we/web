import { Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles, palette } from "./pdfStyles";
import type { PdfCircuitGroup } from "./pdfHelpers";
import i18next from "i18next";
import { translateDefaultProjectText } from "../../projectMetadata";
import {
  PdfPage, PdfHeader, PdfFooter, PdfSection, PdfGrid, PdfGridColumn, PdfCallout
} from "../pdfComponents";

const t = i18next.t.bind(i18next);

interface PdfProjectSummaryPageProps {
  metadata: ProjectMetadata;
  groupedCircuits: PdfCircuitGroup[];
  displayDate: string;
}

export function PdfProjectSummaryPage({
  metadata,
  groupedCircuits,
  displayDate,
}: PdfProjectSummaryPageProps) {
  const totalMcbs = groupedCircuits.reduce((sum, g) => sum + g.mcbs.length, 0);
  const totalRcds = groupedCircuits.filter((g) => g.rcd !== null).length;
  const standaloneMcbs = groupedCircuits.filter((g) => g.rcd === null).length;

  return (
    <PdfPage id="summary">
      <PdfHeader
        brandText={t("pdf.projectSummary.title", "Podsumowanie projektu")}
        brandSubText={t("pdf.projectSummary.subtitle", "Grupowanie RCD → MCB oraz statystyki instalacji")}
        rightContent={
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 7.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", textAlign: "right" }}>{t("pdf.projectSummary.date", "Data")}</Text>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#1f2937", textAlign: "right" }}>{displayDate}</Text>
          </View>
        }
      />

      <PdfSection
        number="01"
        title={t("pdf.projectSummary.stats", "Statystyki instalacji")}
      >
        <PdfGrid columns={3} style={{ paddingVertical: 18, paddingHorizontal: 16, backgroundColor: palette.brandSubtle, borderRadius: 4, marginBottom: 12 }}>
          <PdfGridColumn columns={3}>
            <Text style={[styles.metaLabel, { marginBottom: 6 }]}>{t("pdf.projectSummary.mcb", "Zabezpieczenia (MCB/RCBO)")}</Text>
            <Text style={[styles.pageTitle, { fontSize: 28, color: palette.brandStrong }]}>{totalMcbs}</Text>
          </PdfGridColumn>
          <PdfGridColumn columns={3} style={{ borderLeftWidth: 1, borderLeftColor: palette.border, borderLeftStyle: "solid", paddingLeft: 18 }}>
            <Text style={[styles.metaLabel, { marginBottom: 6 }]}>{t("pdf.projectSummary.rcd", "Wyłączniki różnicoprądowe (RCD)")}</Text>
            <Text style={[styles.pageTitle, { fontSize: 28, color: palette.brandStrong }]}>{totalRcds}</Text>
          </PdfGridColumn>
          <PdfGridColumn columns={3} style={{ borderLeftWidth: 1, borderLeftColor: palette.border, borderLeftStyle: "solid", paddingLeft: 18 }}>
            <Text style={[styles.metaLabel, { marginBottom: 6 }]}>{t("pdf.projectSummary.noRcd", "Obwody bez RCD")}</Text>
            <Text style={[styles.pageTitle, { fontSize: 28, color: palette.brandStrong }]}>{standaloneMcbs}</Text>
          </PdfGridColumn>
        </PdfGrid>
      </PdfSection>

      <PdfSection
        number="02"
        title={t("pdf.projectSummary.rcdGrouping", "Grupowanie ochrony różnicoprądowej")}
      >
        {groupedCircuits.length === 0 ? (
          <PdfCallout>
            {t("pdf.projectSummary.noMcbRcd", "Projekt nie zawiera zabezpieczeń ani wyłączników różnicoprądowych.")}
          </PdfCallout>
        ) : (
          groupedCircuits.map((group, groupIdx) => (
            <View
              key={`${group.groupKey}-${groupIdx}`}
              style={[
                styles.flexCol,
                { marginBottom: 14, paddingLeft: 14, borderLeftWidth: group.rcd ? 3 : 0.5, borderLeftColor: group.rcd ? palette.brand : palette.border, borderLeftStyle: "solid" },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View>
                  <Text style={[styles.eyebrow, { marginBottom: 2 }]}>
                    {group.rcd ? t("pdf.projectSummary.rcdGroup", "Grupa RCD") : t("pdf.projectSummary.noRcdCircuit", "Obwód bez RCD")}
                  </Text>
                  <Text style={[styles.dataValue, { fontSize: 11 }]}>{group.groupName}</Text>
                </View>
                {group.rcd && (
                  <View style={styles.textRight}>
                    <Text style={styles.metaLabel}>{t("pdf.projectSummary.rcdType", "Typ RCD")}</Text>
                    <Text style={[styles.dataValue, { fontSize: 9 }]}>
                      {group.rcd.moduleRef?.replace(/^.*\//, "") || "RCD"}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.eyebrow, { marginTop: 4, marginBottom: 6 }]}>
                {t("pdf.projectSummary.circuits", "Obwody")} · {group.mcbs.length}
              </Text>
              {group.mcbs.map((mcb, mcbIdx) => (
                <View key={mcb.id ?? `mcb-${mcbIdx}`} style={[styles.dataRow, mcbIdx === group.mcbs.length - 1 ? styles.dataRowLast : {}]}>
                  <Text style={[styles.dataValue, { fontSize: 8.5, width: 70, color: palette.inkTertiary }]}>
                    {mcb.label || mcb.moduleRef?.replace(/^.*\//, "") || `MCB ${mcbIdx + 1}`}
                  </Text>
                  <Text style={[styles.dataValue, { fontSize: 8.5, flex: 1, fontWeight: "normal" }]}>
                    {mcb.circuitName || mcb.deviceKind || "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </PdfSection>

      <View style={[styles.dataRow, { marginTop: 24, borderTopWidth: 0.5, borderTopColor: palette.hairline, borderTopStyle: "solid", paddingTop: 12 }]}>
        <Text style={styles.dataLabel}>{t("pdf.projectSummary.object", "Obiekt")}</Text>
        <Text style={[styles.dataValue, { flex: 1 }]}>
          {metadata.titlePageObjectType ? translateDefaultProjectText(metadata.titlePageObjectType, t) : (metadata.projectNumber || t("pdf.projectSummary.newOrder", "Nowe zlecenie"))}
        </Text>
      </View>
      <View style={styles.dataRowLast}>
        <Text style={styles.dataLabel}>{t("pdf.projectSummary.contractor", "Wykonawca")}</Text>
        <Text style={[styles.dataValue, { flex: 1 }]}>
          {metadata.contractor || metadata.author || "—"}
        </Text>
      </View>

      <PdfFooter leftText={t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")} />
    </PdfPage>
  );
}