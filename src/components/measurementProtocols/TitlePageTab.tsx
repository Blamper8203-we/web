import { useRef } from "react";
import type { ProjectMetadata } from "../../types/projectMetadata";
import { DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems, translateDefaultProjectText } from "../../lib/projectMetadata";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "../../lib/export/pdfPages/pdfHelpers";
import { chunkRows } from "../../lib/measurementProtocolHelpers";
import { PageFooter } from "./ProtocolShared";
import { useTranslation } from "react-i18next";

interface TitlePageTabProps {
  metadata: ProjectMetadata;
  onChange: (patch: ProjectMetadata) => void;
  displayDate: string;
  protocolNumber: string;
  stampText: string;
  titlePageIndex: number;
  totalUiPages: number;
}

export function TitlePageTab({
  metadata,
  onChange,
  displayDate,
  protocolNumber,
  stampText,
  titlePageIndex,
  totalUiPages,
}: TitlePageTabProps) {
  const { t, i18n } = useTranslation();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error(t("app.ui.logoError", "Nie udało się odczytać pliku logo.")));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (dataUrl) {
      onChange({
        ...metadata,
        titlePageCompanyLogoFileName: file.name,
        titlePageCompanyLogoDataUrl: dataUrl,
      });
    }
    event.target.value = "";
  };

  const workScopeItems = metadata.titlePageWorkScopeItems.length > 0
    ? metadata.titlePageWorkScopeItems
    : DEFAULT_WORK_SCOPE_ITEMS.map((text) => ({ text, isChecked: true }));
  const titleWorkScopeItems = workScopeItems.slice(0, TITLE_WORK_SCOPE_MAX_ITEMS);
  const titleWorkScopeColumns = chunkRows(titleWorkScopeItems, TITLE_WORK_SCOPE_COLUMN_SIZE);

  const attachmentItems = mergeDefaultAttachmentItems(metadata.titlePageAttachmentItems);
  const titleAttachmentItems = attachmentItems;
  const titleAttachmentColumns = titleAttachmentItems.length > 3
    ? chunkRows(titleAttachmentItems, Math.ceil(titleAttachmentItems.length / 2))
    : [titleAttachmentItems];

  return (
    <div className="a4-page">
      <div className="pd-page-top-bar" />

      {/* Page header */}
      <div className="pd-page-header">
        <div className="pd-page-header-left">
          <div
            className="mp-title-logo-frame cursor-pointer relative group"
            onClick={() => logoInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/bmp"
              className="hidden"
              ref={logoInputRef}
              onChange={handleLogoUpload}
            />
            {metadata.titlePageCompanyLogoDataUrl ? (
              <>
                <img src={metadata.titlePageCompanyLogoDataUrl} alt="Logo firmy" />
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-[9px] font-bold text-white tracking-widest uppercase text-center leading-tight">
                  {t("app.ui.changeLogo", "Zmień logo")}
                </div>
              </>
            ) : (
              <span className="mp-logo-placeholder">{t("app.ui.addLogo", "DODAJ LOGO")}</span>
            )}
          </div>
          <div>
            <div className="pd-eyebrow">{t("pdf.titlePage.mainHeader", "Dokumentacja powykonawcza")}</div>
            <div className="pd-page-subtitle">{t("pdf.titlePage.electricalInstallation", "ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)")}</div>
          </div>
        </div>
        <div className="pd-page-header-right">
          <div className="pd-meta-label">{t("app.pdfDocumentationPage.editor.titlePage.protocolNr", "Numer protokołu")}</div>
          <div className="pd-protocol-pill">{protocolNumber}</div>
          <div className="pd-meta-label" style={{ marginTop: 10 }}>{t("app.pdfDocumentationPage.editor.titlePage.docDate", "Data dokumentacji")}</div>
          <div className="pd-meta-value">{displayDate}</div>
          {metadata.statementDate?.trim() && metadata.statementDate !== metadata.drawingDate && (
            <>
              <div className="pd-meta-label" style={{ marginTop: 4 }}>{t("app.pdfDocumentationPage.editor.titlePage.statementDate", "Data oświadczenia")}</div>
              <div className="pd-meta-value-subtle">{metadata.statementDate}</div>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="pd-hero">
        <div className="pd-hero-title">{t("pdf.titlePage.statement", "Oświadczenie Wykonawcy")}</div>
        <div className="pd-hero-subtitle">{t("pdf.titlePage.statementSubtitle", "instalacji elektrycznej wykonanej zgodnie z przepisami i normami")}</div>
      </div>

      {/* Section 01 — Informacje o obiekcie */}
      <div className="pd-section-heading">
        <span className="pd-section-number">01</span>
        <span className="pd-section-title">{t("app.pdfDocumentationPage.editor.titlePage.objectInfo", "Informacje o obiekcie")}</span>
      </div>
      <div className="pd-data-row">
        <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.objectType", "Rodzaj obiektu:")}</span>
        <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.titlePageObjectType || ""} placeholder={t("app.pdfDocumentationPage.editor.titlePage.objectTypePlaceholder", "Budynek jednorodzinny / Lokal mieszkalny")} onChange={(e) => onChange({ ...metadata, titlePageObjectType: e.target.value })} />
      </div>
      <div className="pd-data-row">
        <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.address", "Adres:")}</span>
        <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.address || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, address: e.target.value })} />
      </div>
      <div className="pd-data-row">
        <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.investor", "Inwestor:")}</span>
        <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.investor || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, investor: e.target.value })} />
      </div>
      <div className="pd-data-row">
        <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.investorAddress", "Adres inw.:")}</span>
        <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.investorAddress || ""} placeholder={t("app.pdfDocumentationPage.editor.titlePage.investorAddressPlaceholder", "(opcjonalnie)")} onChange={(e) => onChange({ ...metadata, investorAddress: e.target.value })} />
      </div>

      {/* Section 02 — Zakres prac + Załączniki (two-col, no cards) */}
      <div className="pd-section-heading">
        <span className="pd-section-number">02</span>
        <span className="pd-section-title">{t("pdf.titlePage.scope", "Zakres prac i załączniki")}</span>
      </div>
      <div className="pd-two-col-grid">
        {/* Zakres prac */}
        <div className="pd-two-col-item">
          <div className="pd-eyebrow" style={{ marginBottom: 10 }}>{t("pdf.titlePage.scope", "Zakres prac")}</div>
          <div className="absolute top-3 right-4 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity z-10 bg-white pl-2" style={{ position: "relative", top: "auto", right: "auto", marginBottom: 8, justifyContent: "flex-end" }}>
            <input
              type="checkbox"
              id="manual-checkbox-toggle"
              className="w-3 h-3 cursor-pointer"
              checked={metadata.titlePageUseManualWorkScopeCheckboxes || false}
              onChange={(e) => onChange({ ...metadata, titlePageUseManualWorkScopeCheckboxes: e.target.checked })}
            />
            <label htmlFor="manual-checkbox-toggle" className="text-[8px] text-gray-600 uppercase cursor-pointer select-none">{t("app.pdfDocumentationPage.editor.titlePage.manualCheckboxes", "Puste do druku")}</label>
          </div>
          <div className={titleWorkScopeColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
            {titleWorkScopeColumns.map((columnItems, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-3">
                {columnItems.map((item, itemIndex) => {
                  const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                  return (
                    <label key={absoluteIndex} className="flex items-start gap-2 cursor-pointer relative group" style={{ borderBottom: "0.5px solid var(--pd-hairline)", paddingBottom: 8 }}>
                      <input
                        type="checkbox"
                        style={{ display: "none" }}
                        checked={item.isChecked}
                        onChange={(e) => {
                          const nextItems = [...workScopeItems];
                          nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], isChecked: e.target.checked };
                          onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                        }}
                      />
                      <div className="pd-checkbox">
                        {!metadata.titlePageUseManualWorkScopeCheckboxes && item.isChecked ? <span className="pd-checkbox-check">✓</span> : null}
                      </div>
                      <span
                        className="mp-editable text-[10px] font-medium text-gray-900 leading-tight flex-1 outline-none break-words"
                        style={{ minHeight: 16, fontWeight: 500 }}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const nextItems = [...workScopeItems];
                          nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], text: e.currentTarget.innerText };
                          onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                        }}
                        dangerouslySetInnerHTML={{ __html: translateDefaultProjectText(item.text, t) || "..." }}
                      />
                      <button
                        type="button"
                        className="mp-delete-btn"
                        title={t("auto.usupunkt_986", "Usuń punkt")}
                        onClick={(e) => {
                          e.preventDefault();
                          const nextItems = [...workScopeItems];
                          nextItems.splice(absoluteIndex, 1);
                          onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                        }}
                      >
                        ✕
                      </button>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          {workScopeItems.length < TITLE_WORK_SCOPE_MAX_ITEMS && (
            <button
              type="button"
              className="mt-3 text-[10px] text-brand font-semibold text-left opacity-70 hover:opacity-100 flex items-center gap-1"
              onClick={() => {
                onChange({ ...metadata, titlePageWorkScopeItems: [...workScopeItems, { text: "", isChecked: true }] });
              }}
            >
              + {t("app.ui.addScopePoint", "Dodaj kolejny punkt")}
            </button>
          )}
        </div>

        {/* Załączniki */}
        <div className="pd-two-col-item">
          <div className="pd-eyebrow" style={{ marginBottom: 10 }}>{t("pdf.titlePage.attachments", "Załączniki do protokołu")}</div>
          <div className={titleAttachmentColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
            {titleAttachmentColumns.map((columnItems, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-3">
                {columnItems.map((item, itemIndex) => (
                  <div key={`${columnIndex}-${itemIndex}`} className="flex items-start gap-2" style={{ borderBottom: "0.5px solid var(--pd-hairline)", paddingBottom: 8 }}>
                    <div className="pd-checkbox">
                      {!metadata.titlePageUseManualWorkScopeCheckboxes ? <span className="pd-checkbox-check">✓</span> : null}
                    </div>
                    <span className="text-[10px] font-medium text-gray-900 leading-tight flex-1 break-words" style={{ fontWeight: 500 }}>
                      {translateDefaultProjectText(item, t)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 03 — Wykonawca + Uprawnienia */}
      <div className="pd-section-heading">
        <span className="pd-section-number">03</span>
        <span className="pd-section-title">{t("pdf.titlePage.parties", "Strony i uprawnienia")}</span>
      </div>
      <div className="pd-two-col-grid">
        <div className="pd-two-col-item">
          <div className="pd-eyebrow" style={{ marginBottom: 10 }}>{t("pdf.titlePage.contractor", "Wykonawca")}</div>
          <input className="mp-editable text-gray-950 font-bold" style={{ fontSize: 12, marginBottom: 2, fontWeight: 700 }} value={metadata.contractor || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, contractor: e.target.value })} />
          <div className="pd-data-value-muted" style={{ fontSize: 8, marginBottom: 10 }}>{t("pdf.titlePage.contractorSubtitle", "Podmiot odpowiedzialny za montaż instalacji")}</div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 50 }}>{t("auto.nip_637", "NIP:")}</span>
            <input className="mp-editable flex-1" style={{ fontSize: 9, fontWeight: 600 }} value={metadata.contractorNip || ""} placeholder=".............." onChange={(e) => onChange({ ...metadata, contractorNip: e.target.value })} />
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 50 }}>{t("auto.regon_491", "REGON:")}</span>
            <input className="mp-editable flex-1" style={{ fontSize: 9, fontWeight: 600 }} value={metadata.contractorRegon || ""} placeholder=".............." onChange={(e) => onChange({ ...metadata, contractorRegon: e.target.value })} />
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 50 }}>{t("auto.tel_141", "Tel:")}</span>
            <input className="mp-editable flex-1" style={{ fontSize: 9, fontWeight: 600 }} value={metadata.contractorPhone || ""} placeholder={t("auto.48600_359", "+48 600 ...")} onChange={(e) => onChange({ ...metadata, contractorPhone: e.target.value })} />
          </div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 50 }}>{t("auto.email_506", "E-mail:")}</span>
            <input className="mp-editable flex-1" style={{ fontSize: 9, fontWeight: 600 }} value={metadata.contractorEmail || ""} placeholder={t("auto.biurofirmapl_281", "biuro@firma.pl")} onChange={(e) => onChange({ ...metadata, contractorEmail: e.target.value })} />
          </div>
        </div>

        <div className="pd-two-col-item">
          <div className="pd-eyebrow" style={{ marginBottom: 10 }}>{t("app.pdfDocumentationPage.editor.titlePage.sepLicenses", "Uprawnienia SEP (Kwalifikacyjne)")}</div>
          <div className="pd-data-row">
            <span className="pd-data-label" style={{ width: 110 }}>{i18n.language.startsWith("de") ? t("app.pdfDocumentationPage.editor.titlePage.sepE_DE", "Register-Nr:") : t("app.pdfDocumentationPage.editor.titlePage.sepE", "Eksploatacja (E):")}</span>
            <input className="mp-editable text-gray-950 font-bold flex-grow" value={metadata.designerId || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, designerId: e.target.value })} />
          </div>
          {!i18n.language.startsWith("de") && (
            <>
              <div className="pd-data-row">
                <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.sepD", "Dozór (D):")}</span>
                <input className="mp-editable text-gray-950 font-bold flex-grow" value={metadata.authorLicense || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, authorLicense: e.target.value })} />
              </div>
              <div className="pd-data-row">
                <span className="pd-data-label" style={{ width: 110 }}>{t("app.pdfDocumentationPage.editor.titlePage.sepValidUntil", "Ważne do:")}</span>
                <input className="mp-editable text-gray-950 font-bold flex-grow" value={metadata.titlePageSepValidUntil || ""} placeholder="........................" onChange={(e) => onChange({ ...metadata, titlePageSepValidUntil: e.target.value })} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Statement — accent bar + body text */}
      <div className="pd-statement-block">
        <div className="pd-statement-title">{t("app.pdfDocumentationPage.editor.titlePage.statementFull", "Pełna treść oświadczenia wykonawcy")}</div>
        <div className="pd-statement-body" dangerouslySetInnerHTML={{ __html: t("pdf.titlePage.statementText", "Oświadczam, że instalacja elektryczna w wyżej wymienionym obiekcie została wykonana zgodnie z przepisami ustawy Prawo Budowlane, obowiązującymi normami technicznymi (w tym <span style=\"font-weight:700;color:#0F172A\">PN-HD 60364-6</span>) oraz sztuką budowlaną. Przeprowadzone pomiary odbiorcze wykazały skuteczność zastosowanych środków ochrony przeciwporażeniowej.") }} />
      </div>

      {/* Signatures */}
      <div className="pd-signature-row">
        <div className="pd-signature-slot">
          <div className="pd-signature-stamp-slot">
            <span className="pd-data-value-muted" style={{ fontSize: 7, textAlign: "center", padding: "0 4px" }}>{stampText || t("pdf.titlePage.contractorStamp", "Pieczęć wykonawcy")}</span>
          </div>
          <div className="pd-signature-label">{t("pdf.titlePage.contractorStamp", "Pieczęć wykonawcy")}</div>
        </div>
        <div className="pd-signature-slot">
          <div className="pd-signature-line">
            <input
              className="mp-editable text-center w-full"
              style={{ fontSize: 9, fontWeight: 600, color: "#334155" }}
              value={metadata.designerSignature || ""}
              placeholder={t("app.pdfDocumentationPage.editor.titlePage.signaturePlaceholder", "miejsce na podpis")}
              onChange={(e) => onChange({ ...metadata, designerSignature: e.target.value })}
            />
          </div>
          <div className="pd-signature-label">{t("pdf.titlePage.electricianSignature", "Projektant / pomiarowiec")}</div>
          <div className="pd-signature-sub-label">{t("pdf.titlePage.electricianSubtitle", "Osoba uprawniona (SEP)")}</div>
        </div>
        <div className="pd-signature-slot">
          <div className="pd-signature-line">
            <input
              className="mp-editable text-center w-full"
              style={{ fontSize: 9, fontWeight: 600, color: "#334155" }}
              value={metadata.investorSignature || ""}
              placeholder={t("app.pdfDocumentationPage.editor.titlePage.signaturePlaceholder", "miejsce na podpis")}
              onChange={(e) => onChange({ ...metadata, investorSignature: e.target.value })}
            />
          </div>
          <div className="pd-signature-label">{t("pdf.titlePage.investorSignature", "Inwestor")}</div>
          <div className="pd-signature-sub-label">{t("pdf.titlePage.investorSubtitle", "Właściciel / zarządca obiektu")}</div>
        </div>
      </div>

      <PageFooter pageNumber={titlePageIndex} totalUiPages={totalUiPages} noBorder />
    </div>
  );
}