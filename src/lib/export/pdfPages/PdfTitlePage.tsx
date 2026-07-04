import type { ProjectMetadata } from "../../../types/projectMetadata";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "./pdfHelpers";
import { chunkRows } from "../../measurementProtocolHelpers";
import { DEFAULT_ATTACHMENT_ITEMS, DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems, translateDefaultProjectText } from "../../projectMetadata";
import i18next from "i18next";
import { Text } from "@react-pdf/renderer";
import { palette } from "./pdfStyles";
import {
  PdfPage, PdfHeader, PdfFooter, PdfHero, PdfSection, PdfDataRow, PdfGrid, PdfGridColumn, PdfCheckbox, PdfSignatureRow, PdfSignatureSlot
} from "../pdfComponents";

const t = i18next.t.bind(i18next);

interface PdfTitlePageProps {
  metadata: ProjectMetadata;
  displayDate: string;
}

export function PdfTitlePage({ metadata, displayDate }: PdfTitlePageProps) {
  const isFormalDocumentationMode = metadata.isFormalDocumentationMode !== false;

  const drawingDateStr = metadata.drawingDate?.trim() || "";
  let resolvedYear = new Date().getFullYear();
  if (drawingDateStr) {
    const parsedDate = new Date(drawingDateStr);
    if (!isNaN(parsedDate.getTime())) resolvedYear = parsedDate.getFullYear();
  }

  const EMPTY = "—";

  const rawProjectNum = metadata.projectNumber?.trim() || "";
  const resolvedProtocolNumber = rawProjectNum
    ? (rawProjectNum.includes('/') ? rawProjectNum : `${rawProjectNum} / ${resolvedYear}`)
    : `— / ${resolvedYear}`;

  const objectType = metadata.titlePageObjectType
    ? translateDefaultProjectText(metadata.titlePageObjectType, t)
    : "";
  const addressText = (metadata.address ?? "").trim();
  let subtitle: string;
  if (objectType && addressText) {
    subtitle = `${objectType} · ${addressText}`;
  } else if (objectType) {
    subtitle = objectType;
  } else if (addressText) {
    subtitle = addressText;
  } else {
    subtitle = EMPTY;
  }

  const contractorName = metadata.contractor || metadata.author || EMPTY;
  const sepCombined = metadata.designerId?.trim()
    ? metadata.designerId
    : EMPTY;
  const stampText = metadata.contractorSignature
    ? translateDefaultProjectText(metadata.contractorSignature, t)
    : t("pdf.titlePage.signContractor", "PIECZĘĆ WYKONAWCY");
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

  const statementDateStr = metadata.statementDate?.trim();
  const hasDistinctStatementDate = statementDateStr && statementDateStr !== metadata.drawingDate;

  return (
    <>
      {/* PAGE 1: COVER PAGE (OŚWIADCZENIE WYKONAWCY) */}
      <PdfPage variant="title">
        <PdfHeader
          logoDataUrl={metadata.titlePageCompanyLogoDataUrl}
          rightLineText={
            <Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2 }}>PROTOKÓŁ </Text>
              <Text style={{ color: palette.ink }}>{resolvedProtocolNumber}</Text>
              <Text style={{ color: palette.inkTertiary, fontWeight: "normal" }}>  ·  </Text>
              <Text style={{ color: palette.ink }}>{displayDate}</Text>
            </Text>
          }
          rightSubText={
            hasDistinctStatementDate ? (
              <Text>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2 }}>Data oświadczenia: </Text>
                <Text style={{ fontSize: 10, color: palette.ink }}>{statementDateStr}</Text>
              </Text>
            ) : undefined
          }
        />

        <PdfHero
          eyebrow={t("pdf.titlePage.statementEyebrow", "DOKUMENT")}
          title={t("pdf.titlePage.statement", "Oświadczenie Wykonawcy")}
          subtitle={subtitle}
        />

        <PdfSection
          number="01"
          title={t("pdfDocumentationPage.editor.titlePage.objectInfo", "Informacje o obiekcie")}
        >
          <PdfDataRow label={t("pdfDocumentationPage.editor.titlePage.objectType", "Rodzaj obiektu")} value={objectType || EMPTY} />
          <PdfDataRow label={t("pdf.titlePage.address", "Adres obiektu")} value={addressText || EMPTY} />
          <PdfDataRow label={t("pdf.titlePage.investor", "Inwestor")} value={metadata.investor?.trim() || EMPTY} />
          <PdfDataRow label={t("pdf.titlePage.contractor", "Wykonawca")} value={contractorName} />
          {isFormalDocumentationMode && (
            <PdfDataRow label={t("pdf.titlePage.sep", "Nr uprawnień SEP")} value={sepCombined} />
          )}
          <PdfDataRow label={t("pdf.titlePage.docDate", "Data dokumentacji")} value={displayDate} isLast />
        </PdfSection>

        <PdfSection
          number="02"
          title={t("pdf.titlePage.attachments", "Załączniki do protokołu")}
        >
          <PdfGrid columns={titleAttachmentColumns.length > 1 ? 2 : undefined} style={titleAttachmentColumns.length <= 1 ? { flexDirection: "column" } : {}}>
            {titleAttachmentColumns.map((columnItems, columnIndex) => (
              <PdfGridColumn key={columnIndex} columns={titleAttachmentColumns.length > 1 ? 2 : undefined} style={titleAttachmentColumns.length <= 1 ? { width: "100%" } : {}}>
                {columnItems.map((item, itemIndex) => (
                  <PdfCheckbox
                    key={`${columnIndex}-${itemIndex}`}
                    isChecked={!useManualCheckboxes}
                    label={translateDefaultProjectText(item, t)}
                  />
                ))}
              </PdfGridColumn>
            ))}
          </PdfGrid>
        </PdfSection>

        {isFormalDocumentationMode && (
          <PdfSection
            number="03"
            title={t("pdf.titlePage.signatures", "Podpisy")}
          >
            <PdfSignatureRow>
              <PdfSignatureSlot
                isStamp
                value={stampText}
                label={t("pdf.titlePage.signContractorShort", "Wykonawca — uprawnienia SEP")}
              />
              <PdfSignatureSlot
                value={designerSignatureText}
                label={t("pdf.titlePage.signAuthor", "Projektant / pomiarowiec")}
                subLabel={t("pdf.titlePage.signAuthorSub", "Osoba uprawniona (SEP)")}
              />
              <PdfSignatureSlot
                value={investorSignatureText}
                label={t("pdf.titlePage.signInvestor", "Inwestor")}
                subLabel={t("pdf.titlePage.signInvestorSub", "Właściciel / zarządca obiektu")}
              />
            </PdfSignatureRow>
          </PdfSection>
        )}

        <PdfFooter />
      </PdfPage>

      {/* PAGE 2: WORK SCOPE PAGE */}
      <PdfPage variant="preview">
        <PdfHeader
          logoDataUrl={metadata.titlePageCompanyLogoDataUrl}
          rightLineText={
            <Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2 }}>PROTOKÓŁ </Text>
              <Text style={{ color: palette.ink }}>{resolvedProtocolNumber}</Text>
              <Text style={{ color: palette.inkTertiary, fontWeight: "normal" }}>  ·  </Text>
              <Text style={{ color: palette.ink }}>{displayDate}</Text>
            </Text>
          }
          rightSubText={
            hasDistinctStatementDate ? (
              <Text>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: palette.inkTertiary, textTransform: "uppercase", letterSpacing: 1.2 }}>Data oświadczenia: </Text>
                <Text style={{ fontSize: 10, color: palette.ink }}>{statementDateStr}</Text>
              </Text>
            ) : undefined
          }
        />

        <PdfSection
          number="01"
          title={t("pdf.titlePage.scope", "Zakres prac")}
        >
          <PdfGrid columns={titleWorkScopeColumns.length > 1 ? 2 : undefined} style={titleWorkScopeColumns.length <= 1 ? { flexDirection: "column" } : {}}>
            {titleWorkScopeColumns.map((columnItems, columnIndex) => (
              <PdfGridColumn key={columnIndex} columns={titleWorkScopeColumns.length > 1 ? 2 : undefined} style={titleWorkScopeColumns.length <= 1 ? { width: "100%" } : {}}>
                {columnItems.map((item, itemIndex) => {
                  const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                  return (
                    <PdfCheckbox
                      key={absoluteIndex}
                      isChecked={!useManualCheckboxes && item.isChecked}
                      label={translateDefaultProjectText(item.text, t)}
                    />
                  );
                })}
              </PdfGridColumn>
            ))}
          </PdfGrid>
        </PdfSection>

        <PdfFooter />
      </PdfPage>
    </>
  );
}
