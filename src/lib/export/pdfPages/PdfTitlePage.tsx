import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata, TitlePageChecklistItem } from "../../../types/projectMetadata";
import { pdfStyles as styles, palette } from "./pdfStyles";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "./pdfHelpers";
import { chunkRows } from "../../measurementProtocolHelpers";
import { DEFAULT_ATTACHMENT_ITEMS, DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems, translateDefaultProjectText } from "../../projectMetadata";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

interface PdfTitlePageProps {
  metadata: ProjectMetadata;
  displayDate: string;
}

export function PdfTitlePage({ metadata, displayDate }: PdfTitlePageProps) {
  // WHY: UI hides SEP / signature fields when isFormalDocumentationMode is false
  // (ProjectPropertiesPage.tsx:176,243,336,369) and the schematic title block
  // replaces signatures with "nie dotyczy" (schematicTitleBlockRenderer.ts:189,199).
  // The PDF must mirror UI/schematic — otherwise toggling "Robocza / uproszczona"
  // would silently still emit a full formal PDF.
  const isFormalDocumentationMode = metadata.isFormalDocumentationMode !== false;

  const drawingDateStr = metadata.drawingDate?.trim() || "";
  let resolvedYear = new Date().getFullYear();
  if (drawingDateStr) {
    const parsedDate = new Date(drawingDateStr);
    if (!isNaN(parsedDate.getTime())) resolvedYear = parsedDate.getFullYear();
  }

  const rawProjectNum = metadata.projectNumber?.trim() || "";
  const resolvedProtocolNumber = rawProjectNum
    ? (rawProjectNum.includes('/') ? rawProjectNum : `${rawProjectNum} / ${resolvedYear}`)
    : `....... / ${resolvedYear}`;

  const objectType = metadata.titlePageObjectType ? translateDefaultProjectText(metadata.titlePageObjectType, t) : t("pdfDocumentationPage.editor.titlePage.objectTypePlaceholder");
  const contractorName = metadata.contractor || metadata.author || "................................";
  const sepE = metadata.designerId || "................................";
  const sepD = metadata.authorLicense || "................................";
  const sepValidUntil = metadata.titlePageSepValidUntil?.trim() || "........................";
  const stampText = metadata.contractorSignature ? translateDefaultProjectText(metadata.contractorSignature, t) : t("pdf.titlePage.signContractor", "PIECZĘĆ WYKONAWCY");
  const designerSignatureText = metadata.designerSignature?.trim() || "";
  const investorSignatureText = metadata.investorSignature?.trim() || "";
  const useManualCheckboxes = Boolean(metadata.titlePageUseManualWorkScopeCheckboxes);

  const defaultWorkScope = DEFAULT_WORK_SCOPE_ITEMS.map((text) => ({ text, isChecked: true }));
  const workScopeItems = metadata.titlePageWorkScopeItems?.length ? metadata.titlePageWorkScopeItems : defaultWorkScope;
  const titleWorkScopeItems = workScopeItems.slice(0, TITLE_WORK_SCOPE_MAX_ITEMS);
  const titleWorkScopeColumns = chunkRows(titleWorkScopeItems, TITLE_WORK_SCOPE_COLUMN_SIZE);

  const titleAttachmentItems = mergeDefaultAttachmentItems(
    metadata.titlePageAttachmentItems?.length ? metadata.titlePageAttachmentItems : DEFAULT_ATTACHMENT_ITEMS,
  );
  const titleAttachmentColumns = titleAttachmentItems.length > 3
    ? chunkRows(titleAttachmentItems, Math.ceil(titleAttachmentItems.length / 2))
    : [titleAttachmentItems];

  return (
    <Page size="A4" style={styles.titlePage}>
      {/* Navy top bar — visual identity mark */}
      <View style={styles.pageTopBar} fixed />

      {/* Page header: left identity block + right protocol number pill */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          {metadata.titlePageCompanyLogoDataUrl ? (
            <View style={[styles.logoBox, { marginRight: 14 }]}>
              <Image src={metadata.titlePageCompanyLogoDataUrl} style={styles.logoImage} />
            </View>
          ) : null}
          <View>
            <Text style={styles.eyebrow}>{t("pdf.titlePage.mainHeader", "Dokumentacja powykonawcza")}</Text>
            <Text style={styles.pageSubtitle}>{t("pdf.titlePage.subHeader", "ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)")}</Text>
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <Text style={[styles.metaLabel, { alignSelf: "flex-end" }]}>{t("pdfDocumentationPage.editor.titlePage.protocolNr", "Numer protokołu")}</Text>
          <View style={[styles.protocolNumberPill, { marginTop: 4 }]}>
            <Text style={styles.protocolNumberText}>{resolvedProtocolNumber}</Text>
          </View>
          <Text style={[styles.metaValueSubtle, { marginTop: 8, fontSize: 8 }]}>
            <Text style={styles.metaLabel}>{t("pdfDocumentationPage.editor.titlePage.docDate", "Data dokumentacji")}: </Text>
            <Text style={[styles.metaValue, { fontSize: 8.5 }]}>{displayDate}</Text>
          </Text>
          {metadata.statementDate?.trim() && metadata.statementDate !== metadata.drawingDate ? (
            <Text style={[styles.metaValueSubtle, { marginTop: 3, fontSize: 8 }]}>
              <Text style={styles.metaLabel}>{t("pdfDocumentationPage.editor.titlePage.statementDate", "Data oświadczenia")}: </Text>
              <Text style={[styles.metaValue, { fontSize: 8.5 }]}>{metadata.statementDate}</Text>
            </Text>
          ) : null}
        </View>
      </View>

      {/* Hero — document title (centred) */}
      <View style={{ alignItems: "center", marginBottom: 22, marginTop: 4 }}>
        <Text style={[styles.pageTitle, { fontSize: 22, letterSpacing: 1.2 }]}>
          {t("pdf.titlePage.statement", "Oświadczenie Wykonawcy")}
        </Text>
        <Text style={[styles.pageSubtitle, { fontStyle: "italic", marginTop: 6, fontSize: 9.5, color: palette.inkSecondary }]}>
          {t("pdf.titlePage.statementSub", "instalacji elektrycznej wykonanej zgodnie z przepisami i normami")}
        </Text>
      </View>

      {/* Section 01 — Informacje o obiekcie */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>{t("pdfDocumentationPage.editor.titlePage.objectInfo", "Informacje o obiekcie")}</Text>
      </View>
      <View>
        <View style={styles.dataRow}>
          <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.objectType", "Rodzaj obiektu")}</Text>
          <Text style={[styles.dataValue, { flex: 1 }]}>{objectType}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.titlePage.address", "Adres")}</Text>
          <Text style={[styles.dataValue, { flex: 1 }]}>{metadata.address || "................................................................"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.titlePage.investor", "Inwestor")}</Text>
          <Text style={[styles.dataValue, { flex: 1 }]}>{metadata.investor || "................................................................"}</Text>
        </View>
        {metadata.investorAddress?.trim() ? (
          <View style={styles.dataRowLast}>
            <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdf.titlePage.investorAddress", "Adres inwestora")}</Text>
            <Text style={[styles.dataValue, { flex: 1 }]}>{metadata.investorAddress}</Text>
          </View>
        ) : (
          <View style={styles.dataRowLast} />
        )}
      </View>

      {/* Section 02 — Zakres + Załączniki (two-column, no cards) */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>02</Text>
        <Text style={styles.sectionTitle}>{t("pdf.titlePage.scope", "Zakres prac i załączniki")}</Text>
      </View>
      <View style={styles.twoColGrid}>
        <View style={styles.twoColGridItem}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>{t("pdf.titlePage.scope", "Zakres prac")}</Text>
          <View style={titleWorkScopeColumns.length > 1 ? styles.flexRow : styles.flexCol}>
            {titleWorkScopeColumns.map((columnItems: TitlePageChecklistItem[], columnIndex: number) => (
              <View key={columnIndex} style={titleWorkScopeColumns.length > 1 ? styles.twoColGridItem : undefined}>
                {columnItems.map((item: TitlePageChecklistItem, itemIndex: number) => {
                  const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                  return (
                    <View key={absoluteIndex} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <View style={styles.checkboxContainer}>
                        {!useManualCheckboxes && item.isChecked ? (
                          <Text style={styles.checkboxChecked}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.dataValue, { fontSize: 8.5, fontWeight: "normal" }]}>{translateDefaultProjectText(item.text, t)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.twoColGridItem}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>{t("pdf.titlePage.attachments", "Załączniki do protokołu")}</Text>
          <View style={titleAttachmentColumns.length > 1 ? styles.flexRow : styles.flexCol}>
            {titleAttachmentColumns.map((columnItems: string[], columnIndex: number) => (
              <View key={columnIndex} style={titleAttachmentColumns.length > 1 ? styles.twoColGridItem : undefined}>
                {columnItems.map((item: string, itemIndex: number) => (
                  <View key={`${columnIndex}-${itemIndex}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <View style={styles.checkboxContainer}>
                      {!useManualCheckboxes ? (
                        <Text style={styles.checkboxChecked}>✓</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.dataValue, { fontSize: 8.5, fontWeight: "normal" }]}>{translateDefaultProjectText(item, t)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Section 03 — Wykonawca + Uprawnienia SEP (two-column, no cards) */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionNumber}>03</Text>
        <Text style={styles.sectionTitle}>{t("pdfDocumentationPage.editor.titlePage.parties", "Strony i uprawnienia")}</Text>
      </View>
      <View style={styles.twoColGrid}>
        <View style={styles.twoColGridItem}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>{t("pdf.titlePage.contractor", "Wykonawca")}</Text>
          <Text style={[styles.dataValue, { fontSize: 12, marginBottom: 2 }]}>{contractorName}</Text>
          <Text style={[styles.dataValueMuted, { fontSize: 8, marginBottom: 10 }]}>{t("pdf.titlePage.contractorSub", "Podmiot odpowiedzialny za montaż instalacji")}</Text>
          {metadata.contractorNip?.trim() || metadata.contractorRegon?.trim() || metadata.contractorPhone?.trim() || metadata.contractorEmail?.trim() ? (
            <View>
              {metadata.contractorNip?.trim() ? (
                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { width: 50 }]}>{t("pdf.titlePage.nip", "NIP")}</Text>
                  <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{metadata.contractorNip}</Text>
                </View>
              ) : null}
              {metadata.contractorRegon?.trim() ? (
                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { width: 50 }]}>{t("pdf.titlePage.regon", "REGON")}</Text>
                  <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{metadata.contractorRegon}</Text>
                </View>
              ) : null}
              {metadata.contractorPhone?.trim() ? (
                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { width: 50 }]}>{t("pdf.titlePage.tel", "Tel.")}</Text>
                  <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{metadata.contractorPhone}</Text>
                </View>
              ) : null}
              {metadata.contractorEmail?.trim() ? (
                <View style={styles.dataRowLast}>
                  <Text style={[styles.dataLabel, { width: 50 }]}>{t("pdf.titlePage.email", "E-mail")}</Text>
                  <Text style={[styles.dataValue, { flex: 1, fontSize: 9 }]}>{metadata.contractorEmail}</Text>
                </View>
              ) : (
                <View style={styles.dataRowLast} />
              )}
            </View>
          ) : null}
        </View>
        {isFormalDocumentationMode ? (
          <View style={styles.twoColGridItem}>
            <Text style={[styles.eyebrow, { marginBottom: 10 }]}>{t("pdfDocumentationPage.editor.titlePage.contractorLicense", "Uprawnienia SEP")}</Text>
            <View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { width: 110 }]}>{i18next.language?.startsWith("de") ? t("pdfDocumentationPage.editor.titlePage.sepE_DE", "Register-Nr:") : t("pdfDocumentationPage.editor.titlePage.sepE", "Eksploatacja (E)")}</Text>
                <Text style={[styles.dataValue, { flex: 1 }]}>{sepE}</Text>
              </View>
              {!i18next.language?.startsWith("de") && (
                <>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.sepD", "Dozór (D)")}</Text>
                    <Text style={[styles.dataValue, { flex: 1 }]}>{sepD}</Text>
                  </View>
                  <View style={styles.dataRowLast}>
                    <Text style={[styles.dataLabel, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.validUntil", "Ważne do")}</Text>
                    <Text style={[styles.dataValue, { flex: 1 }]}>{sepValidUntil}</Text>
                  </View>
                </>
              )}
              {i18next.language?.startsWith("de") ? <View style={styles.dataRowLast} /> : null}
            </View>
          </View>
        ) : (
          <View style={styles.twoColGridItem} />
        )}
      </View>

      {/* Statement — accent bar + body text */}
      {isFormalDocumentationMode ? (
        <View style={styles.statementBlock}>
          <Text style={styles.statementTitle}>{t("pdf.titlePage.statementFull", "Pełna treść oświadczenia wykonawcy")}</Text>
          <Text style={styles.statementBody}>
            {t("pdf.titlePage.statementBody")}
          </Text>
        </View>
      ) : null}

      {/* Signatures — minimal: stamp box + thin line + label */}
      {isFormalDocumentationMode ? (
        <View style={styles.signatureRow}>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureStampSlot}>
              <Text style={[styles.dataValueMuted, { fontSize: 7, textAlign: "center", paddingHorizontal: 4 }]}>{stampText}</Text>
            </View>
            <Text style={styles.signatureLabel}>{t("pdf.titlePage.signContractor", "Pieczęć wykonawcy")}</Text>
          </View>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureLine}>
              {designerSignatureText ? (
                <Text style={[styles.dataValue, { fontSize: 9 }]}>{designerSignatureText}</Text>
              ) : (
                <Text style={[styles.dataValueMuted, { fontSize: 7 }]}>{t("pdf.footer.signatureSlot", "miejsce na podpis")}</Text>
              )}
            </View>
            <Text style={styles.signatureLabel}>{t("pdf.titlePage.signAuthor", "Projektant / pomiarowiec")}</Text>
            <Text style={styles.signatureSubLabel}>{t("pdf.titlePage.signAuthorSub", "Osoba uprawniona (SEP)")}</Text>
          </View>
          <View style={styles.signatureSlot}>
            <View style={styles.signatureLine}>
              {investorSignatureText ? (
                <Text style={[styles.dataValue, { fontSize: 9 }]}>{investorSignatureText}</Text>
              ) : (
                <Text style={[styles.dataValueMuted, { fontSize: 7 }]}>{t("pdf.footer.signatureSlot", "miejsce na podpis")}</Text>
              )}
            </View>
            <Text style={styles.signatureLabel}>{t("pdf.titlePage.signInvestor", "Inwestor")}</Text>
            <Text style={styles.signatureSubLabel}>{t("pdf.titlePage.signInvestorSub", "Właściciel / zarządca obiektu")}</Text>
          </View>
        </View>
      ) : null}

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