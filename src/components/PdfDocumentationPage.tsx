import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  getProtocolLabel,
  getSelectedProtocolHeader,
  parseChecklistItems,
  type PdfDocumentationPreviewTab,
  updateSelectedProtocolHeader,
} from "../lib/pdfDocumentation";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { MeasurementProtocolHeaderSettings, ProjectMetadata, TitlePageChecklistItem } from "../types/projectMetadata";
import { AppIcon } from "./AppIcon";
import { exportToPdf } from "../lib/export/pdfExportService";
import {
  DEFAULT_ATTACHMENT_ITEMS,
  DEFAULT_WORK_SCOPE_ITEMS,
} from "../lib/projectMetadata";
import { usePdfWorkspace } from "./PdfWorkspaceShell";
import "./PdfDocumentationPage.css";

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function Field({ label, value, placeholder, onChange }: FieldProps) {
  return (
    <label className="pd-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function pickProtocolHeading(selectedPreviewTab: PdfDocumentationPreviewTab, t: TFunction) {
  if (selectedPreviewTab === "title-page") {
    return {
      title: t("app.pdfDocumentationPage.heading.titlePage.title"),
      description: t("app.pdfDocumentationPage.heading.titlePage.description"),
    };
  }

  if (selectedPreviewTab === "circuit-list") {
    return {
      title: t("app.pdfDocumentationPage.heading.circuitList.title"),
      description: t("app.pdfDocumentationPage.heading.circuitList.description"),
    };
  }

  if (selectedPreviewTab === "din-rail") {
    return {
      title: t("app.pdfDocumentationPage.heading.dinRail.title"),
      description: t("app.pdfDocumentationPage.heading.dinRail.description"),
    };
  }

  if (selectedPreviewTab === "din-rail-connections") {
    return {
      title: t("app.pdfDocumentationPage.heading.dinRailConnections.title"),
      description: t("app.pdfDocumentationPage.heading.dinRailConnections.description"),
    };
  }

  if (selectedPreviewTab === "schematic") {
    return {
      title: t("app.pdfDocumentationPage.heading.schematic.title"),
      description: t("app.pdfDocumentationPage.heading.schematic.description"),
    };
  }

  const protocolLabel = getProtocolLabel(selectedPreviewTab);
  return {
    title: t("app.pdfDocumentationPage.heading.protocol.title", { label: protocolLabel }),
    description: t("app.pdfDocumentationPage.heading.protocol.description"),
  };
}

function serializeChecklistItems(items: TitlePageChecklistItem[]) {
  return items
    .filter((item) => item.text.trim().length > 0)
    .map((item) => (item.isChecked ? item.text.trim() : `[ ] ${item.text.trim()}`))
    .join("\n");
}


export function PdfDocumentationPage() {
  const { t } = useTranslation();
  const {
    metadata,
    symbols,
    dinRail: rail,
    connections,
    handleMetadataChange: onChange,
    handleResetDocumentation: _onResetDocumentation,
    pdfPreviewTab: selectedPreviewTab,
  } = usePdfWorkspace();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const selectedHeader = getSelectedProtocolHeader(metadata, selectedPreviewTab);
  const heading = pickProtocolHeading(selectedPreviewTab, t);
  const workScopeText = useMemo(
    () => serializeChecklistItems(metadata.titlePageWorkScopeItems),
    [metadata.titlePageWorkScopeItems],
  );


  const updateMetadata = (patch: Partial<ProjectMetadata>) => {
    onChange({
      ...metadata,
      ...patch,
      dateModified: new Date().toISOString(),
    });
  };

  const updateHeader = (field: keyof MeasurementProtocolHeaderSettings, value: string) => {
    if (!selectedHeader) {
      return;
    }

    const nextHeader: MeasurementProtocolHeaderSettings = {
      ...selectedHeader,
      [field]: value,
    };

    onChange({
      ...updateSelectedProtocolHeader(metadata, selectedPreviewTab, nextHeader),
      dateModified: new Date().toISOString(),
    });
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const supportedTypes = ["image/png", "image/jpeg", "image/bmp"];
    if (!supportedTypes.includes(file.type)) {
      setExportError(t("app.pdfDocumentationPage.error.unsupportedLogo", "Nie udało się wczytać logo. Użyj pliku PNG, JPG, JPEG lub BMP."));
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error(t("app.pdfDocumentationPage.error.readLogo", "Nie udało się odczytać pliku logo.")));
      reader.readAsDataURL(file);
    }).catch((error: Error) => {
      setExportError(error.message);
      return "";
    });

    if (!dataUrl) {
      return;
    }

    setExportError(null);
    updateMetadata({
      titlePageCompanyLogoFileName: file.name,
      titlePageCompanyLogoDataUrl: dataUrl,
    });
    event.currentTarget.value = "";
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);
    setExportError(null);

    try {
      await exportToPdf(metadata, symbols, rail, connections);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("app.pdfDocumentationPage.error.exportFailed", "Nie udało się przygotować eksportu PDF.");
      setExportError(message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <section className="pd-page">
      <header className="pd-hero pd-hero--avalonia">
        <AppIcon className="pd-hero-icon" name="pdf" size={18} />
        <div>
          <h2>{heading.title}</h2>
          <p>{heading.description}</p>
        </div>
      </header>

      <div className="pd-grid pd-grid--single">
        <section className="pd-editor pd-editor--avalonia">
          {selectedPreviewTab === "title-page" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.headerDoc")}</h3>
                  <div className="pd-stack">

                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.protocolNr")}
                      value={metadata.projectNumber ?? ""}
                      placeholder={t("app.pdfDocumentationPage.editor.titlePage.protocolNrPlaceholder")}
                      onChange={(value) => updateMetadata({ projectNumber: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.docDate")}
                      value={metadata.drawingDate ?? ""}
                      placeholder="2026-03-31"
                      onChange={(value) => updateMetadata({ drawingDate: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.statementDate")}
                      value={metadata.statementDate ?? ""}
                      placeholder="2026-03-31"
                      onChange={(value) => updateMetadata({ statementDate: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.objectInfo")}</h3>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.objectType")}
                      value={metadata.titlePageObjectType ?? ""}
                      placeholder={t("app.pdfDocumentationPage.editor.titlePage.objectTypePlaceholder")}
                      onChange={(value) => updateMetadata({ titlePageObjectType: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.address")}
                      value={metadata.address ?? ""}
                      placeholder={t("auto.ulbudowlana1259_332", "ul. Budowlana 12, 59-300 Lubin")}
                      onChange={(value) => updateMetadata({ address: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.investor")}
                      value={metadata.investor ?? ""}
                      placeholder={t("auto.jankowalski_60", "Jan Kowalski")}
                      onChange={(value) => updateMetadata({ investor: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.investorAddress")}
                      value={metadata.investorAddress ?? ""}
                      placeholder={t("auto.opcjonalniejeli_731", "(opcjonalnie, jeśli inny niż adres obiektu)")}
                      onChange={(value) => updateMetadata({ investorAddress: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.contractorLicense")}</h3>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.contractor")}
                      value={metadata.contractor ?? ""}
                      placeholder={t("auto.usugielektryczn_609", "Usługi Elektryczne PRO-EL")}
                      onChange={(value) => updateMetadata({ contractor: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.electrician")}
                      value={metadata.author ?? ""}
                      placeholder={t("auto.jankowalski_432", "Jan Kowalski")}
                      onChange={(value) => updateMetadata({ author: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.sepE")}
                      value={metadata.designerId ?? ""}
                      placeholder={t("auto.e1232026_109", "E / 123/2026")}
                      onChange={(value) =>
                        updateMetadata({ designerId: value })
                      }
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.sepD")}
                      value={metadata.authorLicense ?? ""}
                      placeholder={t("auto.d4562026_685", "D / 456/2026")}
                      onChange={(value) =>
                        updateMetadata({ authorLicense: value })
                      }
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.validUntil")}
                      value={metadata.titlePageSepValidUntil ?? ""}
                      placeholder="31.12.2026"
                      onChange={(value) => updateMetadata({ titlePageSepValidUntil: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.companyData")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.titlePage.companyDataHelp")}
                  </p>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.nip")}
                      value={metadata.contractorNip ?? ""}
                      placeholder="1234567890"
                      onChange={(value) => updateMetadata({ contractorNip: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.regon")}
                      value={metadata.contractorRegon ?? ""}
                      placeholder="012345678"
                      onChange={(value) => updateMetadata({ contractorRegon: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.phone")}
                      value={metadata.contractorPhone ?? ""}
                      placeholder={t("auto.48600100200_289", "+48 600 100 200")}
                      onChange={(value) => updateMetadata({ contractorPhone: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.email")}
                      value={metadata.contractorEmail ?? ""}
                      placeholder={t("auto.biurofirmapl_729", "biuro@firma.pl")}
                      onChange={(value) => updateMetadata({ contractorEmail: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.logo")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.titlePage.logoHelp1")}
                  </p>
                  <p className="pd-logo-info">
                    {metadata.titlePageCompanyLogoFileName
                      ? t("app.pdfDocumentationPage.editor.titlePage.logoInfoSelected", { name: metadata.titlePageCompanyLogoFileName })
                      : t("app.pdfDocumentationPage.editor.titlePage.logoInfoNone")}
                  </p>
                  <div className="pd-logo-actions">
                    <input
                      ref={logoInputRef}
                      className="pd-hidden-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.bmp"
                      onChange={handleLogoSelected}
                    />
                    <button
                      type="button"
                      className="pd-secondary-action"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {t("app.pdfDocumentationPage.editor.titlePage.btnSelectLogo")}
                    </button>
                    <button
                      type="button"
                      className="pd-secondary-action"
                      onClick={() =>
                        updateMetadata({
                          titlePageCompanyLogoFileName: "",
                          titlePageCompanyLogoDataUrl: "",
                        })
                      }
                    >
                      {t("app.pdfDocumentationPage.editor.titlePage.btnRemoveLogo")}
                    </button>
                  </div>
                  <p className="pd-help-text">{t("app.pdfDocumentationPage.editor.titlePage.logoHelp2")}</p>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.workScope")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.titlePage.workScopeHelp")}
                  </p>
                  <label className="pd-checkbox">
                    <input
                      type="checkbox"
                      checked={metadata.titlePageUseManualWorkScopeCheckboxes}
                      onChange={(event) =>
                        updateMetadata({ titlePageUseManualWorkScopeCheckboxes: event.currentTarget.checked })
                      }
                    />
                    <span>{t("app.pdfDocumentationPage.editor.titlePage.manualCheckboxes")}</span>
                  </label>
                  <textarea
                    className="pd-textarea pd-textarea--large"
                    value={workScopeText}
                    placeholder={DEFAULT_WORK_SCOPE_ITEMS.join("\n")}
                    onChange={(event) =>
                      updateMetadata({
                        titlePageWorkScopeItems: parseChecklistItems(event.currentTarget.value),
                      })
                    }
                  />
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.attachments")}</h3>
                  <p className="pd-help-text">{t("app.pdfDocumentationPage.editor.titlePage.attachmentsHelp")}</p>
                  <textarea
                    className="pd-textarea pd-textarea--large opacity-60 cursor-not-allowed"
                    value={DEFAULT_ATTACHMENT_ITEMS.join("\n")}
                    readOnly
                    disabled
                  />
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.titlePage.signatures")}</h3>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.signInvestor")}
                      value={metadata.investorSignature ?? ""}
                      placeholder="........................"
                      onChange={(value) => updateMetadata({ investorSignature: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.signElectrician")}
                      value={metadata.designerSignature ?? ""}
                      placeholder="........................"
                      onChange={(value) => updateMetadata({ designerSignature: value })}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.titlePage.signContractor")}
                      value={metadata.contractorSignature ?? ""}
                      placeholder={t("auto.piecztkawykonaw_384", "PIECZĄTKA WYKONAWCY")}
                      onChange={(value) => updateMetadata({ contractorSignature: value })}
                    />
                  </div>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "circuit-list" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.circuitList.title")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.circuitList.desc1")}
                  </p>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.circuitList.desc2")}
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "din-rail" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.dinRail.title")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.dinRail.desc1")}
                  </p>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.dinRail.desc2")}
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "din-rail-connections" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.dinRailConnections.title")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.dinRailConnections.desc1")}
                  </p>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.dinRailConnections.desc2")}
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "schematic" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.schematic.title")}</h3>
                  <p className="pd-help-text">
                    {t("app.pdfDocumentationPage.editor.schematic.desc1")}
                  </p>
                </div>
              </article>
            </div>
          ) : (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.protocol.title")}</h3>
                  <p className="pd-help-text">{t("app.pdfDocumentationPage.editor.protocol.desc")}</p>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.protocol.mainTitle")}
                      value={selectedHeader?.headerTitle ?? ""}
                      placeholder={t("auto.protoknr022026_453", "Protokół Nr 02 / 2026")}
                      onChange={(value) => updateHeader("headerTitle", value)}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.protocol.subtitle")}
                      value={selectedHeader?.headerSubtitle ?? ""}
                      placeholder={t("auto.badanieskuteczn_236", "Badanie skuteczności ochrony przeciwporażeniowej")}
                      onChange={(value) => updateHeader("headerSubtitle", value)}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">{t("app.pdfDocumentationPage.editor.protocol.rightData")}</h3>
                  <div className="pd-stack">
                    <Field
                      label={t("app.pdfDocumentationPage.editor.protocol.measureDate")}
                      value={selectedHeader?.measurementDate ?? ""}
                      placeholder="2026-03-22"
                      onChange={(value) => updateHeader("measurementDate", value)}
                    />
                    <Field
                      label={t("app.pdfDocumentationPage.editor.protocol.objectName")}
                      value={selectedHeader?.objectName ?? ""}
                      placeholder={t("auto.nowezlecenie_724", "Nowe zlecenie")}
                      onChange={(value) => updateHeader("objectName", value)}
                    />
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>
      </div>

      <footer className="pd-footer pd-footer--single">
        <button
          type="button"
          className="accent-btn pd-export-action"
          onClick={() => {
            void handleExportPdf();
          }}
          disabled={isExportingPdf}
        >
          <AppIcon name="pdf" size={18} />
          <span>{isExportingPdf ? t("app.pdfDocumentationPage.footer.exportBtnLoading") : t("app.pdfDocumentationPage.footer.exportBtn")}</span>
        </button>
      </footer>
      {exportError ? (
        <p className="pd-export-error" role="alert">
          {exportError}{" "}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-primary)",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              font: "inherit",
            }}
          >
            {t("app.pdfDocumentationPage.footer.errorRetry")}
          </button>
        </p>
      ) : null}
    </section>
  );
}
