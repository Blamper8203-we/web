import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles, palette } from "./pdfStyles";
import type { PdfCircuitGroup } from "./pdfHelpers";
import i18next from "i18next";
const t = i18next.t.bind(i18next);
import { translateDefaultProjectText } from "../../projectMetadata";

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
    <Page size="A4" style={styles.page}>
      <View style={styles.pageTopBar} fixed />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <View>
            <Text style={styles.eyebrow}>{t("pdf.projectSummary.eyebrow", "Sekcja 02")}</Text>
            <Text style={styles.pageTitle}>{t("pdf.projectSummary.title", "Podsumowanie projektu")}</Text>
            <Text style={styles.pageSubtitle}>{t("pdf.projectSummary.subtitle", "Grupowanie RCD → MCB oraz statystyki instalacji")}</Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdf.projectSummary.date", "Data")}</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
        </View>
      </View>

      {/* Section 01 — Stats as horizontal strip with thin dividers */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>{t("pdf.projectSummary.stats", "Statystyki instalacji")}</Text>
      </View>
      <View style={[styles.threeColGrid, { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: palette.hairline, borderBottomStyle: "solid" }]}>
        <View style={styles.threeColGridItem}>
          <Text style={[styles.metaLabel, { marginBottom: 4 }]}>{t("pdf.projectSummary.mcb", "Zabezpieczenia (MCB/RCBO)")}</Text>
          <Text style={[styles.pageTitle, { fontSize: 26, color: palette.brand }]}>{totalMcbs}</Text>
        </View>
        <View style={[styles.threeColGridItem, { borderLeftWidth: 0.5, borderLeftColor: palette.hairline, borderLeftStyle: "solid", paddingLeft: 18 }]}>
          <Text style={[styles.metaLabel, { marginBottom: 4 }]}>{t("pdf.projectSummary.rcd", "Wyłączniki różnicoprądowe (RCD)")}</Text>
          <Text style={[styles.pageTitle, { fontSize: 26, color: palette.brand }]}>{totalRcds}</Text>
        </View>
        <View style={[styles.threeColGridItem, { borderLeftWidth: 0.5, borderLeftColor: palette.hairline, borderLeftStyle: "solid", paddingLeft: 18 }]}>
          <Text style={[styles.metaLabel, { marginBottom: 4 }]}>{t("pdf.projectSummary.noRcd", "Obwody bez RCD")}</Text>
          <Text style={[styles.pageTitle, { fontSize: 26, color: palette.brand }]}>{standaloneMcbs}</Text>
        </View>
      </View>

      {/* Section 02 — RCD grouping list (semantic groupings, kept as flat rows) */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>02</Text>
        <Text style={styles.sectionTitle}>{t("pdf.projectSummary.rcdGrouping", "Grupowanie ochrony różnicoprądowej")}</Text>
      </View>
      {groupedCircuits.length === 0 ? (
        <View style={styles.callout}>
          <Text style={styles.calloutBody}>{t("pdf.projectSummary.noMcbRcd", "Projekt nie zawiera zabezpieczeń ani wyłączników różnicoprądowych.")}</Text>
        </View>
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

      {/* Bottom meta strip */}
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

      {/* Footer (page-fixed) */}
      <View style={styles.pageFooter} fixed>
        <Text style={styles.pageFooterText}>{t("pdf.footer.normLabel", "PN-HD 60364 • dokument wygenerowany cyfrowo")}</Text>
        <Text
          style={styles.pageFooterText}
          render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `${pageNumber} / ${totalPages}` })}
        />
      </View>
    </Page>
  );
}