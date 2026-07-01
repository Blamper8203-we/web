import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata, TitlePageChecklistItem } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "./pdfHelpers";
import { chunkRows } from "../../measurementProtocolHelpers";
import { DEFAULT_ATTACHMENT_ITEMS, DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems } from "../../projectMetadata";
import { t } from "i18next";

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

  const objectType = metadata.titlePageObjectType || t("pdfDocumentationPage.editor.titlePage.objectTypePlaceholder");
  const contractorName = metadata.contractor || metadata.author || "................................";
  const sepE = metadata.designerId || "................................";
  const sepD = metadata.authorLicense || "................................";
  const sepValidUntil = metadata.titlePageSepValidUntil?.trim() || "........................";
  const stampText = metadata.contractorSignature || t("pdf.titlePage.signContractor", "PIECZĘĆ WYKONAWCY");
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
      <View style={[styles.flexRow, styles.justifyBetween, styles.borderB2Dark, styles.pb3]}>
        <View style={[styles.flexRow, styles.itemsCenter]}>
          {metadata.titlePageCompanyLogoDataUrl ? (
            <View style={[styles.logoBox, styles.mr3]}>
              <Image src={metadata.titlePageCompanyLogoDataUrl} style={styles.logoImage} />
            </View>
          ) : null}
          <View>
            <Text style={[styles.textLg, styles.fontBold, styles.textGray900, styles.uppercase]}>{t("pdf.titlePage.mainHeader")}</Text>
            <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>{t("pdf.titlePage.subHeader", "ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)")}</Text>
          </View>
        </View>
        <View style={styles.textRight}>
          <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500, styles.uppercase]}>{t("pdfDocumentationPage.editor.titlePage.protocolNr")}</Text>
          <View style={[styles.bgBrand, styles.px2, styles.py1, styles.rounded, styles.mt1, { alignSelf: 'flex-end' }]}>
            <Text style={[styles.textBase, styles.fontBold, styles.textWhite]}>{resolvedProtocolNumber}</Text>
          </View>
          <Text style={[styles.textXs, styles.textGray400, styles.mt2]}>{t("pdfDocumentationPage.editor.titlePage.docDate")}: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
          {metadata.statementDate?.trim() && metadata.statementDate !== metadata.drawingDate ? (
            <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>{t("pdfDocumentationPage.editor.titlePage.statementDate")}: <Text style={[styles.fontMedium, styles.textGray700]}>{metadata.statementDate}</Text></Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.itemsCenter, { marginTop: 14, marginBottom: 14 }]}>
        <Text style={[styles.text2xl, styles.fontBlack, styles.textGray900, styles.uppercase]}>{t("pdf.titlePage.statement")}</Text>
        <Text style={[styles.textSm, styles.textGray700, styles.italic, styles.mt1]}>{t("pdf.titlePage.statementSub", "instalacji elektrycznej wykonanej zgodnie z przepisami i normami")}</Text>
      </View>

      <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p3, styles.mb2]}>
        <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>{t("pdfDocumentationPage.editor.titlePage.objectInfo")}</Text>
        <View style={styles.flexCol}>
          <View style={[styles.flexRow, styles.mb1]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>{t("pdfDocumentationPage.editor.titlePage.objectType")}:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{objectType}</Text>
          </View>
          <View style={[styles.flexRow, styles.mb1]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>{t("pdf.titlePage.address")}:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.address || "................................................................"}</Text>
          </View>
          <View style={[styles.flexRow, styles.mb1]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>{t("pdf.titlePage.investor")}:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.investor || "................................................................"}</Text>
          </View>
          {metadata.investorAddress?.trim() ? (
            <View style={[styles.flexRow]}>
              <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>{t("pdf.titlePage.investorAddress")}:</Text>
              <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.investorAddress}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.grid2, styles.mb2]}>
        <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>{t("pdf.titlePage.scope")}</Text>
          <View style={titleWorkScopeColumns.length > 1 ? styles.grid2 : styles.flexCol}>
            {titleWorkScopeColumns.map((columnItems: TitlePageChecklistItem[], columnIndex: number) => (
              <View key={columnIndex} style={titleWorkScopeColumns.length > 1 ? styles.grid2Col : undefined}>
                {columnItems.map((item: TitlePageChecklistItem, itemIndex: number) => {
                  const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                  return (
                    <View key={absoluteIndex} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                      <View style={styles.checkboxContainer}>
                        {!useManualCheckboxes && item.isChecked ? (
                          <Text style={styles.checkboxChecked}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.textXs, styles.fontMedium, styles.textGray700, { flex: 1 }]}>{item.text}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>{t("pdf.titlePage.attachments")}</Text>
          <View style={titleAttachmentColumns.length > 1 ? styles.grid2 : styles.flexCol}>
            {titleAttachmentColumns.map((columnItems: string[], columnIndex: number) => (
              <View key={columnIndex} style={titleAttachmentColumns.length > 1 ? styles.grid2Col : undefined}>
                {columnItems.map((item: string, itemIndex: number) => (
                  <View key={`${columnIndex}-${itemIndex}`} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                    <View style={styles.checkboxContainer}>
                      {!useManualCheckboxes ? (
                        <Text style={styles.checkboxChecked}>✓</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.textXs, styles.fontMedium, styles.textGray700, { flex: 1 }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.grid2, styles.mb2]}>
        <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col, styles.justifyCenter]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>{t("pdf.titlePage.contractor")}</Text>
          <Text style={[styles.textSm, styles.fontBold, styles.textGray950, styles.mt2]}>{contractorName}</Text>
          <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>{t("pdf.titlePage.contractorSub", "Podmiot odpowiedzialny za montaż instalacji")}</Text>
          {metadata.contractorNip?.trim() || metadata.contractorRegon?.trim() || metadata.contractorPhone?.trim() || metadata.contractorEmail?.trim() ? (
            <View style={[styles.flexCol, { marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: "#E5E7EB", borderTopStyle: "solid" }]}>
              {metadata.contractorNip?.trim() ? (
                <View style={[styles.flexRow, styles.mb1]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textXs, { width: 55 }]}>{t("pdf.titlePage.nip")}</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textXs, styles.flex1]}>{metadata.contractorNip}</Text>
                </View>
              ) : null}
              {metadata.contractorRegon?.trim() ? (
                <View style={[styles.flexRow, styles.mb1]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textXs, { width: 55 }]}>{t("pdf.titlePage.regon")}</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textXs, styles.flex1]}>{metadata.contractorRegon}</Text>
                </View>
              ) : null}
              {metadata.contractorPhone?.trim() ? (
                <View style={[styles.flexRow, styles.mb1]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textXs, { width: 55 }]}>{t("pdf.titlePage.tel")}</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textXs, styles.flex1]}>{metadata.contractorPhone}</Text>
                </View>
              ) : null}
              {metadata.contractorEmail?.trim() ? (
                <View style={[styles.flexRow]}>
                  <Text style={[styles.fontSemiBold, styles.textGray700, styles.textXs, { width: 55 }]}>{t("pdf.titlePage.email")}</Text>
                  <Text style={[styles.fontBold, styles.textGray950, styles.textXs, styles.flex1]}>{metadata.contractorEmail}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        {isFormalDocumentationMode ? (
          <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col, styles.justifyCenter]}>
            <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>{t("pdfDocumentationPage.editor.titlePage.contractorLicense")}</Text>
            <View style={[styles.flexCol, styles.mt1]}>
              <View style={[styles.flexRow, styles.mb1]}>
                <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.sepE")}</Text>
                <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepE}</Text>
              </View>
              <View style={[styles.flexRow]}>
                <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.sepD")}</Text>
                <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepD}</Text>
              </View>
              <View style={[styles.flexRow, styles.mt1]}>
                <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>{t("pdfDocumentationPage.editor.titlePage.validUntil")}:</Text>
                <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepValidUntil}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {isFormalDocumentationMode ? (
        <View style={[styles.bgWhite, styles.border, { borderColor: "#1e3a5f" }, styles.roundedXl, styles.p3, styles.mb3, styles.textCenter]}>
          <Text style={[styles.textSm, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>{t("pdf.titlePage.statementFull", "Pełna treść oświadczenia wykonawcy")}</Text>
          <Text style={[styles.textSm, styles.fontNormal, styles.textGray800, { lineHeight: 1.5 }]}>
            {t("pdf.titlePage.statementBody")}
          </Text>
        </View>
      ) : null}

      <View style={[styles.mtAuto]}>
        {isFormalDocumentationMode ? (
          <View style={[styles.flexRow, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'space-between' }]}>
            <View style={[styles.textCenter, styles.itemsCenter, { width: 165 }]}>
              <View style={[styles.borderDashed, styles.roundedLg, styles.bgGray50, styles.titleStampSlot, styles.mb1]}>
                <Text style={[styles.textXs, styles.textGray400, styles.fontSemiBold, styles.uppercase]}>{stampText}</Text>
              </View>
              <Text style={[styles.textXs, styles.textGray500]}>{t("pdf.titlePage.signContractor", "Pieczęć wykonawcy")}</Text>
            </View>
            <View style={[styles.textCenter, { width: 165 }]}>
              <View style={styles.signatureSlot}>
                {designerSignatureText ? (
                  <Text style={[styles.textSm, styles.fontSemiBold, styles.textGray700]}>{designerSignatureText}</Text>
                ) : (
                  <Text style={[styles.textXs, styles.textGray300, styles.italic]}>{t("pdf.footer.signatureSlot")}</Text>
                )}
              </View>
              <View style={[styles.borderT, styles.pt2]}>
                <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>{t("pdf.titlePage.signAuthor")}</Text>
                <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>{t("pdf.titlePage.signAuthorSub", "Osoba uprawniona (pomiarowiec)")}</Text>
              </View>
            </View>
            <View style={[styles.textCenter, { width: 165 }]}>
              <View style={styles.signatureSlot}>
                {investorSignatureText ? (
                  <Text style={[styles.textSm, styles.fontSemiBold, styles.textGray700]}>{investorSignatureText}</Text>
                ) : (
                  <Text style={[styles.textXs, styles.textGray300, styles.italic]}>{t("pdf.footer.signatureSlot")}</Text>
                )}
              </View>
              <View style={[styles.borderT, styles.pt2]}>
                <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>{t("pdf.titlePage.signInvestor")}</Text>
                <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>{t("pdf.titlePage.signInvestorSub", "Właściciel / zarządca obiektu")}</Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={[styles.textCenter, styles.mt6]} fixed>
          <Text
            style={[styles.textXs, styles.textGray400, styles.uppercase]}
            render={({ pageNumber, totalPages }) => t("pdf.footer.pageInfo", { pageNumber, totalPages, defaultValue: `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364` })}
          />
        </View>
      </View>
    </Page>
  );
}
