import { Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";
import type { PdfCircuitGroup } from "./pdfHelpers";
import { t } from "i18next";

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
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
        <View>
          <Text style={[styles.textLg, styles.fontBold, styles.textGray900, styles.uppercase]}>
            {t("pdf.projectSummary.title", "Podsumowanie projektu")}
          </Text>
          <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>
            {t("pdf.projectSummary.subtitle", "Grupowanie RCD \u2192 MCB oraz statystyki instalacji")}
          </Text>
        </View>
        <View style={styles.textRight}>
          <Text style={[styles.textXs, styles.textGray400]}>
            {t("pdf.projectSummary.date", "Data:")} <Text style={[styles.fontBold, styles.textGray700]}>{displayDate}</Text>
          </Text>
        </View>
      </View>

      <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p3, styles.mt3, styles.mb3]}>
        <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>
          {t("pdf.projectSummary.stats", "Statystyki instalacji")}
        </Text>
        <View style={styles.flexRow}>
          <View style={styles.grid3Col}>
            <Text style={[styles.textXs, styles.textGray500]}>{t("pdf.projectSummary.mcb", "Zabezpieczenia (MCB/RCBO)")}</Text>
            <Text style={[styles.textXl, styles.fontBlack, styles.textGray900]}>{totalMcbs}</Text>
          </View>
          <View style={styles.grid3Col}>
            <Text style={[styles.textXs, styles.textGray500]}>{t("pdf.projectSummary.rcd", "Wyłączniki różnicoprądowe (RCD)")}</Text>
            <Text style={[styles.textXl, styles.fontBlack, styles.textGray900]}>{totalRcds}</Text>
          </View>
          <View style={styles.grid3Col}>
            <Text style={[styles.textXs, styles.textGray500]}>{t("pdf.projectSummary.noRcd", "Obwody bez RCD")}</Text>
            <Text style={[styles.textXl, styles.fontBlack, styles.textGray900]}>{standaloneMcbs}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>
        {t("pdf.projectSummary.rcdGrouping", "Grupowanie ochrony różnicoprądowej")}
      </Text>
      {groupedCircuits.length === 0 ? (
        <View style={[styles.border, styles.rounded, styles.p3, styles.bgGray50]}>
          <Text style={[styles.textSm, styles.textGray500, styles.italic]}>
            {t("pdf.projectSummary.noMcbRcd", "Projekt nie zawiera zabezpieczeń ani wyłączników różnicoprądowych.")}
          </Text>
        </View>
      ) : (
        groupedCircuits.map((group, groupIdx) => (
          <View
            key={`${group.groupKey}-${groupIdx}`}
            style={[styles.border, styles.rounded, styles.p3, styles.mb2, ...(group.rcd ? [styles.validationGroupInfo] : [])]}
          >
            <View style={[styles.flexRow, styles.justifyBetween, styles.mb2]}>
              <View>
                <Text style={[styles.textXs, styles.textGray500, styles.uppercase]}>
                  {group.rcd ? t("pdf.projectSummary.rcdGroup", "Grupa RCD") : t("pdf.projectSummary.noRcdCircuit", "Obwód bez RCD")}
                </Text>
                <Text style={[styles.textBase, styles.fontBold, styles.textGray900]}>
                  {group.groupName}
                </Text>
              </View>
              {group.rcd && (
                <View style={styles.textRight}>
                  <Text style={[styles.textXs, styles.textGray500]}>{t("pdf.projectSummary.rcdType", "Typ RCD")}</Text>
                  <Text style={[styles.textSm, styles.fontSemiBold, styles.textGray700]}>
                    {group.rcd.moduleRef?.replace(/^.*\//, "") || "RCD"}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.borderT, styles.pt2]}>
              <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray700, styles.mb1]}>
                {t("pdf.projectSummary.circuits", "Obwody")} ({group.mcbs.length})
              </Text>
              {group.mcbs.map((mcb, mcbIdx) => (
                <View
                  key={mcb.id ?? `mcb-${mcbIdx}`}
                  style={[styles.flexRow, styles.mb1]}
                >
                  <Text style={[styles.textXs, styles.textGray600, { width: 60 }]}>
                    {mcb.label || mcb.moduleRef?.replace(/^.*\//, "") || `MCB ${mcbIdx + 1}`}
                  </Text>
                  <Text style={[styles.textXs, styles.textGray700, styles.flex1]}>
                    {mcb.circuitName || mcb.deviceKind || "\u2014"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      <View style={[styles.mtAuto]}>
        <View style={[styles.borderT, styles.pt3, styles.flexRow, styles.justifyBetween]}>
          <Text style={[styles.textXs, styles.textGray500]}>
            {t("pdf.projectSummary.object", "Obiekt:")} <Text style={[styles.fontSemiBold, styles.textGray700]}>
              {metadata.titlePageObjectType || metadata.projectNumber || t("pdf.projectSummary.newOrder", "Nowe zlecenie")}
            </Text>
          </Text>
          <Text style={[styles.textXs, styles.textGray500]}>
            {t("pdf.projectSummary.contractor", "Wykonawca:")} <Text style={[styles.fontSemiBold, styles.textGray700]}>
              {metadata.contractor || metadata.author || "\u2014"}
            </Text>
          </Text>
        </View>
        <View style={[styles.textCenter, styles.mt3]} fixed>
          <Text
            style={[styles.textXs, styles.textGray400, styles.uppercase]}
            render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364` })}
          />
        </View>
      </View>
    </Page>
  );
}