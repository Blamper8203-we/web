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
  const { t } = useTranslation();
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

  const EMPTY = "—";

  const objectTypeRaw = metadata.titlePageObjectType ?? "";
  const addressRaw = (metadata.address ?? "").trim();
  let subtitle: string;
  if (objectTypeRaw.trim() && addressRaw) {
    subtitle = `${objectTypeRaw.trim()} · ${addressRaw}`;
  } else if (objectTypeRaw.trim()) {
    subtitle = objectTypeRaw.trim();
  } else if (addressRaw) {
    subtitle = addressRaw;
  } else {
    subtitle = EMPTY;
  }

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
    <>
      {/* PAGE 1: COVER PAGE */}
      <div className="a4-page">
        <div className="pd-page-top-bar" />

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
              <div className="pd-page-brand">{t("pdf.titlePage.brand", "DINBOARD · Dokumentacja odbiorcza")}</div>
              <div className="pd-page-brand-sub">{t("pdf.titlePage.brandSub", "PN-HD 60364-6 · Arkusz 6")}</div>
            </div>
          </div>
          <div className="pd-page-header-right">
            <div className="pd-page-header-right-line">
              <span className="pd-page-header-right-label">PROTOKÓŁ</span>{" "}
              <span className="pd-page-header-right-value">{protocolNumber}</span>
              <span className="pd-page-header-right-sep">  ·  </span>
              <span className="pd-page-header-right-value">{displayDate}</span>
            </div>
            {metadata.statementDate?.trim() && metadata.statementDate !== metadata.drawingDate && (
              <div className="pd-page-header-right-line" style={{ marginTop: 4, fontSize: "8pt" }}>
                <span className="pd-page-header-right-label">Data oświadczenia:</span>{" "}
                <span className="pd-page-header-right-value">{metadata.statementDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pd-hero">
          <div className="pd-hero-eyebrow">{t("pdf.titlePage.statementEyebrow", "DOKUMENT")}</div>
          <div className="pd-hero-title" style={{ fontSize: "26pt", marginTop: "6px", lineHeight: 1.1 }}>
            {t("pdf.titlePage.statement", "Oświadczenie Wykonawcy")}
          </div>
          <div className="pd-hero-subtitle" style={{ marginTop: 6 }}>{subtitle}</div>
        </div>

        <div className="pd-section-heading">
          <span className="pd-section-number">01</span>
          <span className="pd-section-title">{t("app.pdfDocumentationPage.editor.titlePage.objectInfo", "Informacje o obiekcie")}</span>
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("app.pdfDocumentationPage.editor.titlePage.objectType", "Rodzaj obiektu:")}</span>
          <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.titlePageObjectType || ""} placeholder={t("app.pdfDocumentationPage.editor.titlePage.objectTypePlaceholder", "Budynek jednorodzinny / Lokal mieszkalny")} onChange={(e) => onChange({ ...metadata, titlePageObjectType: e.target.value })} />
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("app.pdfDocumentationPage.editor.titlePage.address", "Adres obiektu:")}</span>
          <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.address || ""} placeholder={EMPTY} onChange={(e) => onChange({ ...metadata, address: e.target.value })} />
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("app.pdfDocumentationPage.editor.titlePage.investor", "Inwestor:")}</span>
          <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.investor || ""} placeholder={EMPTY} onChange={(e) => onChange({ ...metadata, investor: e.target.value })} />
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("pdf.titlePage.contractor", "Wykonawca:")}</span>
          <input className="mp-editable text-gray-950 font-bold flex-grow" value={metadata.contractor || ""} placeholder={EMPTY} onChange={(e) => onChange({ ...metadata, contractor: e.target.value })} />
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("pdf.titlePage.sep", "Nr uprawnień SEP:")}</span>
          <input className="mp-editable text-gray-950 font-bold flex-grow" value={metadata.designerId || ""} placeholder={EMPTY} onChange={(e) => onChange({ ...metadata, designerId: e.target.value })} />
        </div>
        <div className="pd-data-row">
          <span className="pd-data-label" style={{ width: 140 }}>{t("app.pdfDocumentationPage.editor.titlePage.docDate", "Data dokumentacji:")}</span>
          <span className="mp-editable flex-grow text-gray-900 font-semibold">{displayDate}</span>
        </div>



        {/* Section 02 — Załączniki */}
        <div className="pd-section-heading mt-6">
          <span className="pd-section-number">02</span>
          <span className="pd-section-title">{t("pdf.titlePage.attachments", "Załączniki do protokołu")}</span>
        </div>
        <div className="pd-two-col-grid" style={{ marginBottom: 20 }}>
          <div className="pd-two-col-item" style={{ flex: 1, width: "100%" }}>
            <div className={titleAttachmentColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-2" : "flex flex-col gap-2"}>
              {titleAttachmentColumns.map((columnItems, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-2">
                  {columnItems.map((item, itemIndex) => (
                    <div key={`${columnIndex}-${itemIndex}`} className="flex items-start gap-2" style={{ borderBottom: "0.5px solid var(--pd-hairline)", paddingBottom: 6 }}>
                      <div className="pd-checkbox">
                        <span className="pd-checkbox-check">✓</span>
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

        {/* Section 03 — Podpisy */}
        {metadata.isFormalDocumentationMode !== false && (
          <div className="pd-section-heading">
            <span className="pd-section-number">03</span>
            <span className="pd-section-title">{t("pdf.titlePage.signatures", "Podpisy")}</span>
          </div>
        )}

        {metadata.isFormalDocumentationMode !== false && (
          <div className="pd-signature-row">
            <div className="pd-signature-slot">
              <div className="pd-signature-stamp-slot">
                <span className="pd-data-value-muted" style={{ fontSize: 7, textAlign: "center", padding: "0 4px" }}>{stampText || t("pdf.titlePage.contractorStamp", "Pieczęć wykonawcy")}</span>
              </div>
              <div className="pd-signature-label">{t("pdf.titlePage.signContractorShort", "Wykonawca — uprawnienia SEP")}</div>
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
        )}

        <PageFooter pageNumber={titlePageIndex} totalUiPages={totalUiPages} noBorder />
      </div>

      {/* PAGE 2: WORK SCOPE PAGE */}
      <div className="a4-page">
        <div className="pd-page-top-bar" />

        <div className="pd-page-header">
          <div className="pd-page-header-left">
            {metadata.titlePageCompanyLogoDataUrl && (
              <div className="mp-title-logo-frame">
                <img src={metadata.titlePageCompanyLogoDataUrl} alt="Logo firmy" />
              </div>
            )}
            <div>
              <div className="pd-page-brand">{t("pdf.titlePage.brand", "DINBOARD · Dokumentacja odbiorcza")}</div>
              <div className="pd-page-brand-sub">{t("pdf.titlePage.brandSub", "PN-HD 60364-6 · Arkusz 6")}</div>
            </div>
          </div>
          <div className="pd-page-header-right">
            <div className="pd-page-header-right-line">
              <span className="pd-page-header-right-label">PROTOKÓŁ</span>{" "}
              <span className="pd-page-header-right-value">{protocolNumber}</span>
              <span className="pd-page-header-right-sep">  ·  </span>
              <span className="pd-page-header-right-value">{displayDate}</span>
            </div>
            {metadata.statementDate?.trim() && metadata.statementDate !== metadata.drawingDate && (
              <div className="pd-page-header-right-line" style={{ marginTop: 4, fontSize: "8pt" }}>
                <span className="pd-page-header-right-label">Data oświadczenia:</span>{" "}
                <span className="pd-page-header-right-value">{metadata.statementDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="pd-section-heading">
          <span className="pd-section-number">01</span>
          <span className="pd-section-title">{t("pdf.titlePage.scope", "Zakres prac")}</span>
        </div>
        <div className="pd-two-col-grid">
          {/* Zakres prac */}
          <div className="pd-two-col-item" style={{ flex: 1, width: "100%" }}>
            <div className={titleWorkScopeColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-2" : "flex flex-col gap-2"}>
              {titleWorkScopeColumns.map((columnItems, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-2">
                  {columnItems.map((item, itemIndex) => {
                    const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                    return (
                      <label key={absoluteIndex} className="flex items-start gap-2 cursor-pointer relative group" style={{ borderBottom: "0.5px solid var(--pd-hairline)", paddingBottom: 6 }}>
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
                className="mt-2 text-[10px] text-brand font-semibold text-left opacity-70 hover:opacity-100 flex items-center gap-1"
                onClick={() => {
                  onChange({ ...metadata, titlePageWorkScopeItems: [...workScopeItems, { text: "", isChecked: true }] });
                }}
              >
                + {t("app.ui.addScopePoint", "Dodaj kolejny punkt")}
              </button>
            )}
          </div>
        </div>



        <PageFooter pageNumber={titlePageIndex + 1} totalUiPages={totalUiPages} />
      </div>
    </>
  );
}
