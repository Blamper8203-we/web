import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { ProjectMetadata } from "../../../types/projectMetadata";
import { pdfStyles as styles } from "./pdfStyles";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "./pdfHelpers";
import { chunkRows } from "../../measurementProtocolHelpers";
import { DEFAULT_ATTACHMENT_ITEMS, DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems } from "../../projectMetadata";

interface PdfTitlePageProps {
  metadata: ProjectMetadata;
  displayDate: string;
}

export function PdfTitlePage({ metadata, displayDate }: PdfTitlePageProps) {

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

  const objectType = metadata.titlePageObjectType || "Budynek jednorodzinny / Lokal mieszkalny";
  const contractorName = metadata.contractor || metadata.author || "................................";
  const sepE = metadata.designerId || metadata.authorLicense || "................................";
  const sepD = metadata.authorLicense || metadata.designerId || "................................";
  const stampText = metadata.contractorSignature || "PIECZĘĆ WYKONAWCY";

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
          <View style={[styles.logoBox, styles.mr3]}>
            {metadata.titlePageCompanyLogoDataUrl ? (
              <Image src={metadata.titlePageCompanyLogoDataUrl} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoPlaceholderText}>LOGO</Text>
            )}
          </View>
          <View>
            <Text style={[styles.textLg, styles.fontBold, styles.textGray900, styles.uppercase]}>Dokumentacja Powykonawcza</Text>
            <Text style={[styles.textXs, styles.textGray500, styles.mt1]}>ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)</Text>
          </View>
        </View>
        <View style={styles.textRight}>
          <Text style={[styles.textXs, styles.fontSemiBold, styles.textGray500, styles.uppercase]}>Protokół nr</Text>
          <View style={[styles.bgBrand, styles.px2, styles.py1, styles.rounded, styles.mt1, { alignSelf: 'flex-end' }]}>
            <Text style={[styles.textBase, styles.fontBold, styles.textWhite]}>{resolvedProtocolNumber}</Text>
          </View>
          <Text style={[styles.textXs, styles.textGray400, styles.mt2]}>Data: <Text style={[styles.fontMedium, styles.textGray700]}>{displayDate}</Text></Text>
        </View>
      </View>

      <View style={[styles.itemsCenter, { marginTop: 14, marginBottom: 14 }]}>
        <Text style={[styles.text2xl, styles.fontBlack, styles.textGray900, styles.uppercase]}>Oświadczenie Wykonawcy</Text>
        <Text style={[styles.textSm, styles.textGray500, styles.italic, styles.mt1]}>instalacji elektrycznej wykonanej zgodnie z przepisami i normami</Text>
      </View>

      <View style={[styles.bgGray50, styles.roundedXl, styles.border, styles.p3, styles.mb2]}>
        <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Informacje o obiekcie</Text>
        <View style={styles.flexCol}>
          <View style={[styles.flexRow, styles.mb1]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Rodzaj obiektu:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{objectType}</Text>
          </View>
          <View style={[styles.flexRow, styles.mb1]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Adres:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.address || "................................................................"}</Text>
          </View>
          <View style={[styles.flexRow]}>
            <Text style={[styles.fontBold, styles.textGray700, styles.textSm, { width: 100 }]}>Inwestor:</Text>
            <Text style={[styles.fontSemiBold, styles.textGray900, styles.textSm, styles.flex1]}>{metadata.investor || "................................................................"}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.grid2, styles.mb2]}>
        <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Zakres prac</Text>
          <View style={titleWorkScopeColumns.length > 1 ? styles.grid2 : styles.flexCol}>
            {titleWorkScopeColumns.map((columnItems: any[], columnIndex: number) => (
              <View key={columnIndex} style={titleWorkScopeColumns.length > 1 ? styles.grid2Col : undefined}>
                {columnItems.map((item: any, itemIndex: number) => {
                  const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                  return (
                    <View key={absoluteIndex} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                      <View style={styles.checkboxContainer}>
                        {item.isChecked ? <Text style={styles.checkboxChecked}>✓</Text> : null}
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
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Załączniki do protokołu</Text>
          <View style={titleAttachmentColumns.length > 1 ? styles.grid2 : styles.flexCol}>
            {titleAttachmentColumns.map((columnItems: any[], columnIndex: number) => (
              <View key={columnIndex} style={titleAttachmentColumns.length > 1 ? styles.grid2Col : undefined}>
                {columnItems.map((item: any, itemIndex: number) => (
                  <View key={`${columnIndex}-${itemIndex}`} style={[styles.flexRow, styles.itemsCenter, styles.mb2]}>
                    <View style={styles.checkboxContainer}>
                      <Text style={styles.checkboxChecked}>✓</Text>
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
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>Wykonawca / Instalator</Text>
          <Text style={[styles.textSm, styles.fontBold, styles.textGray950, styles.mt2]}>{contractorName}</Text>
          <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Podmiot odpowiedzialny za montaż instalacji</Text>
        </View>
        <View style={[styles.border, styles.roundedXl, styles.p3, styles.grid2Col, styles.justifyCenter]}>
          <Text style={[styles.textXs, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb1]}>Uprawnienia SEP (Kwalifikacyjne)</Text>
          <View style={[styles.flexCol, styles.mt1]}>
            <View style={[styles.flexRow, styles.mb1]}>
              <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>Eksploatacja (E):</Text>
              <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepE}</Text>
            </View>
            <View style={[styles.flexRow]}>
              <Text style={[styles.fontSemiBold, styles.textGray700, styles.textSm, { width: 110 }]}>Dozór (D):</Text>
              <Text style={[styles.fontBold, styles.textGray950, styles.textSm, styles.flex1]}>{sepD}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.bgWhite, styles.border, { borderColor: "#0D79F2" }, styles.roundedXl, styles.p3, styles.mb3, styles.textCenter]}>
        <Text style={[styles.textSm, styles.fontBold, styles.textBrand, styles.uppercase, styles.mb2]}>Pełna treść oświadczenia wykonawcy</Text>
        <Text style={[styles.textSm, styles.fontNormal, styles.textGray800, { lineHeight: 1.5 }]}>
          Oświadczam, że instalacja elektryczna w wyżej wymienionym obiekcie została wykonana zgodnie z przepisami ustawy Prawo Budowlane, obowiązującymi normami technicznymi (w tym PN-HD 60364-6) oraz sztuką budowlaną. Przeprowadzone pomiary odbiorcze wykazały skuteczność zastosowanych środków ochrony przeciwporażeniowej.
        </Text>
      </View>

      <View style={[styles.mtAuto]}>
        <View style={[styles.flexRow, styles.borderT, styles.pt4, { alignItems: 'flex-end', justifyContent: 'space-between' }]}>
          <View style={[styles.textCenter, styles.itemsCenter, { width: 200 }]}>
            <View style={[styles.borderDashed, styles.roundedLg, styles.bgGray50, styles.titleStampSlot, styles.mb1]}>
              <Text style={[styles.textXs, styles.textGray400, styles.fontSemiBold, styles.uppercase]}>{stampText}</Text>
            </View>
          </View>
          <View style={[styles.textCenter, { width: 200 }]}>
            <View style={styles.signatureSlot}><Text style={[styles.textXs, styles.textGray300, styles.italic]}>miejsce na podpis</Text></View>
            <View style={[styles.borderT, styles.pt2]}>
              <Text style={[styles.textSm, styles.fontBold, styles.textGray700, styles.uppercase]}>Podpis Elektryka</Text>
              <Text style={[styles.textXs, styles.textGray400, styles.mt1]}>Osoba uprawniona (pomiarowiec)</Text>
            </View>
          </View>
        </View>
        <View style={[styles.textCenter, styles.mt6]} fixed>
          <Text
            style={[styles.textXs, styles.textGray400, styles.uppercase]}
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364`}
          />
        </View>
      </View>
    </Page>
  );
}
