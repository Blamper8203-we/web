import type { ChangeEvent } from "react";
import type { ProjectMetadata } from "../types/projectMetadata";
import { formatDateForField, parseStandards, standardsToText } from "../lib/projectMetadata";
import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./ProjectPropertiesPage.css";

type ProjectPropertiesPageProps = {
  metadata: ProjectMetadata;
  onChange: (next: ProjectMetadata) => void;
  onExportPdf: () => void;
  onClose?: () => void;
};

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
};

function Field({ label, placeholder, value, multiline = false, onChange }: FieldProps) {
  return (
    <label className="pp-field">
      <span className="pp-field-label">
        <AppIcon className="pp-field-icon" name="check" size={12} />
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
    </label>
  );
}

export function ProjectPropertiesPage({
  metadata,
  onChange,
  onExportPdf,
  onClose,
}: ProjectPropertiesPageProps) {
  const { t } = useTranslation();

  const updateField = <K extends keyof ProjectMetadata>(field: K, value: ProjectMetadata[K]) => {
    onChange({
      ...metadata,
      [field]: value,
      dateModified: new Date().toISOString(),
    });
  };

  const handleTextField =
    (field: keyof ProjectMetadata) =>
    (value: string) => {
      updateField(field, value as ProjectMetadata[keyof ProjectMetadata]);
    };

  const handleFormalModeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateField("isFormalDocumentationMode", event.currentTarget.checked);
  };

  const standardsText = standardsToText(metadata.standards);

  return (
    <section className="pp-page">
      <header className="pp-hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AppIcon className="pp-hero-icon" name="fileEdit" size={18} />
          <div>
            <span className="pp-eyebrow">{t("app.projectProps.heroEyebrow", "Powykonawcza")}</span>
            <h2>{t("app.projectProps.heroTitle", "Dokumentacja wykonania instalacji")}</h2>
            <p>
              {t("app.projectProps.heroDesc", "Dane obiektu, wykonawcy, elektryka i dokumentacji odbiorczej dla mieszkania lub domu.")}
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" className="win-close-btn mobile-only-tab" onClick={onClose} aria-label={t("app.appLeftPanel.close", "Zamknij")}>
            <AppIcon name="close" size={16} />
          </button>
        )}
      </header>

      <div className="pp-grid">
        <section className="pp-form-area">
          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">{t("app.projectProps.objectEyebrow", "Obiekt")}</span>
                <h3>{t("app.projectProps.objectTitle", "Dane obiektu i zlecenia")}</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <label className="pp-toggle">
                <span className="pp-field-label">
                  <AppIcon className="pp-field-icon" name="check" size={12} />
                  {t("app.projectProps.formalMode", "Dokumentacja z podpisami i pieczątką")}
                </span>
                <input
                  type="checkbox"
                  checked={metadata.isFormalDocumentationMode}
                  onChange={handleFormalModeChange}
                />
              </label>

              <div className="pp-fields">
                <Field
                  label={t("app.projectProps.fieldCompany", "Zakres / nazwa dokumentacji")}
                  placeholder={t("app.projectProps.fieldCompanyPlaceholder", "Dokumentacja powykonawcza instalacji elektrycznej")}
                  value={metadata.company}
                  onChange={handleTextField("company")}
                />
                <Field
                  label={t("app.projectProps.fieldInvestor", "Inwestor")}
                  placeholder={t("app.projectProps.fieldInvestorPlaceholder", "Jan Kowalski")}
                  value={metadata.investor}
                  onChange={handleTextField("investor")}
                />
                <Field
                  label={t("app.projectProps.fieldInvestorAddress", "Adres inwestora (opcjonalnie)")}
                  placeholder={t("app.projectProps.fieldInvestorAddressPlaceholder", "(jeśli inny niż adres obiektu)")}
                  value={metadata.investorAddress}
                  onChange={handleTextField("investorAddress")}
                />
                <Field
                  label={t("app.projectProps.fieldAddress", "Adres obiektu")}
                  placeholder={t("app.projectProps.fieldAddressPlaceholder", "ul. Budowlana 12")}
                  value={metadata.address}
                  onChange={handleTextField("address")}
                />
                <Field
                  label={t("app.projectProps.fieldContractor", "Wykonawca")}
                  placeholder={t("app.projectProps.fieldContractorPlaceholder", "FHU Elektro Jan Kowalski")}
                  value={metadata.contractor}
                  onChange={handleTextField("contractor")}
                />
                <Field
                  label={t("app.projectProps.fieldContractorNip", "NIP firmy wykonawcy")}
                  placeholder={t("app.projectProps.fieldContractorNipPlaceholder", "1234567890")}
                  value={metadata.contractorNip}
                  onChange={handleTextField("contractorNip")}
                />
                <Field
                  label={t("app.projectProps.fieldContractorRegon", "REGON firmy wykonawcy")}
                  placeholder={t("app.projectProps.fieldContractorRegonPlaceholder", "012345678")}
                  value={metadata.contractorRegon}
                  onChange={handleTextField("contractorRegon")}
                />
                <Field
                  label={t("app.projectProps.fieldContractorPhone", "Telefon kontaktowy")}
                  placeholder={t("app.projectProps.fieldContractorPhonePlaceholder", "+48 600 100 200")}
                  value={metadata.contractorPhone}
                  onChange={handleTextField("contractorPhone")}
                />
                <Field
                  label={t("app.projectProps.fieldContractorEmail", "E-mail firmy")}
                  placeholder={t("app.projectProps.fieldContractorEmailPlaceholder", "biuro@firma.pl")}
                  value={metadata.contractorEmail}
                  onChange={handleTextField("contractorEmail")}
                />
              </div>
            </div>
          </article>

          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">{t("app.projectProps.docEyebrow", "Dokument")}</span>
                <h3>{t("app.projectProps.docTitle", "Dane protokołu i schematu")}</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <div className="pp-fields">
                {metadata.isFormalDocumentationMode && (
                  <>
                    <Field
                      label={t("app.projectProps.fieldAuthor", "Elektryk / osoba wykonująca")}
                      placeholder={t("app.projectProps.fieldAuthorPlaceholder", "Jan Kowalski")}
                      value={metadata.author}
                      onChange={(value) => {
                        updateField("author", value);
                      }}
                    />
                    <Field
                      label={t("app.projectProps.fieldDesignerId", "Uprawnienia SEP")}
                      placeholder={t("app.projectProps.fieldDesignerIdPlaceholder", "E + D / 123/2026")}
                      value={metadata.designerId}
                      onChange={(value) => {
                        onChange({
                          ...metadata,
                          designerId: value,
                          authorLicense: value,
                          dateModified: new Date().toISOString(),
                        });
                      }}
                    />
                  </>
                )}

                <Field
                  label={t("app.projectProps.fieldProjectNumber", "Nr dokumentacji / protokołu")}
                  placeholder={t("app.projectProps.fieldProjectNumberPlaceholder", "PW-01/2026")}
                  value={metadata.projectNumber}
                  onChange={handleTextField("projectNumber")}
                />
                <Field
                  label={t("app.projectProps.fieldScale", "Skala")}
                  placeholder={t("app.projectProps.fieldScalePlaceholder", "bez skali")}
                  value={metadata.drawingScale}
                  onChange={handleTextField("drawingScale")}
                />
                <Field
                  label={t("app.projectProps.fieldDate", "Data wykonania / odbioru")}
                  placeholder="2026-03-29"
                  value={formatDateForField(metadata.drawingDate)}
                  onChange={handleTextField("drawingDate")}
                />
                <Field
                  label={t("app.projectProps.fieldRevision", "Rewizja / zmiana")}
                  placeholder={t("app.projectProps.fieldRevisionPlaceholder", "Rev. 0 - wydanie pierwotne")}
                  value={metadata.revision}
                  onChange={handleTextField("revision")}
                />
                <Field
                  label={t("app.projectProps.fieldStandards", "Normy")}
                  placeholder={t("auto.pnhd60364pnen60_631", "PN-HD 60364; PN-EN 60617")}
                  value={standardsText}
                  multiline
                  onChange={(value) => {
                    onChange({
                      ...metadata,
                      standards: parseStandards(value),
                      dateModified: new Date().toISOString(),
                    });
                  }}
                />
              </div>
            </div>
          </article>

          {metadata.isFormalDocumentationMode && (
            <div className="pp-signature-grid">
              <article className="pp-card">
                <div className="pp-card__header">
                  <div>
                    <span className="pp-eyebrow">{t("app.projectProps.signaturesEyebrow", "Podpisy")}</span>
                    <h3>{t("app.projectProps.signDesigner", "Podpis elektryka")}</h3>
                  </div>
                </div>
                <div className="pp-card__body">
                  <Field
                    label={t("app.projectProps.signDesigner", "Podpis elektryka")}
                    placeholder="........................."
                    value={metadata.designerSignature}
                    onChange={handleTextField("designerSignature")}
                  />
                </div>
              </article>

              <article className="pp-card">
                <div className="pp-card__header">
                  <div>
                    <span className="pp-eyebrow">{t("app.projectProps.signaturesEyebrow", "Podpisy")}</span>
                    <h3>{t("app.projectProps.signContractor", "Podpis wykonawcy")}</h3>
                  </div>
                </div>
                <div className="pp-card__body">
                  <Field
                    label={t("app.projectProps.signContractor", "Podpis wykonawcy")}
                    placeholder="........................."
                    value={metadata.contractorSignature}
                    onChange={handleTextField("contractorSignature")}
                  />
                </div>
              </article>
            </div>
          )}
        </section>

        <aside className="pp-preview-area">
          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">{t("app.projectProps.statusEyebrow", "Status")}</span>
                <h3>{t("app.projectProps.statusTitle", "Status dokumentacji")}</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <dl className="pp-summary">
                <div>
                  <dt>{t("app.projectProps.statusMode", "Tryb")}</dt>
                  <dd>
                    {metadata.isFormalDocumentationMode ? t("app.projectProps.modeFormal", "Powykonawcza z podpisami") : t("app.projectProps.modeDraft", "Robocza / uproszczona")}
                  </dd>
                </div>
                <div>
                  <dt>{t("app.projectProps.statusDesigner", "Elektryk")}</dt>
                  <dd>{metadata.author || t("app.projectProps.noData", "Brak danych")}</dd>
                </div>
                <div>
                  <dt>{t("app.projectProps.statusProjectNumber", "Nr dokumentacji")}</dt>
                  <dd>{metadata.projectNumber || t("app.projectProps.noData", "Brak danych")}</dd>
                </div>
                <div>
                  <dt>{t("app.projectProps.statusLastModified", "Ostatnia modyfikacja")}</dt>
                  <dd>{formatDateForField(metadata.dateModified)}</dd>
                </div>
              </dl>
            </div>
          </article>

          <article className="pp-preview-sheet">
            <div className="pp-preview-sheet__header">
              <span className="pp-eyebrow">{t("app.projectProps.previewEyebrow", "Podgląd A4")}</span>
              <strong>{t("app.projectProps.previewTitle", "Fragment danych tytułowych")}</strong>
            </div>

            <div className="pp-sheet">
              <div className="pp-sheet__title">{metadata.company || t("app.projectProps.defaultCompany", "Dokumentacja powykonawcza")}</div>
              <div className="pp-sheet__divider" />
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetInvestor", "Inwestor")}</span>
                <strong>{metadata.investor || "................................"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetAddress", "Adres")}</span>
                <strong>{metadata.address || "................................"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetContractor", "Wykonawca")}</span>
                <strong>{metadata.contractor || "................................"}</strong>
              </div>
              {metadata.isFormalDocumentationMode && (
                <>
                  <div className="pp-sheet__row">
                    <span>{t("app.projectProps.sheetDesigner", "Elektryk")}</span>
                    <strong>{metadata.author || "................................"}</strong>
                  </div>
                  <div className="pp-sheet__row">
                    <span>{t("app.projectProps.sheetDesignerId", "Uprawnienia SEP")}</span>
                    <strong>{metadata.designerId || "................................"}</strong>
                  </div>
                </>
              )}
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetProjectNumber", "Nr dokumentacji")}</span>
                <strong>{metadata.projectNumber || "PW-01/2026"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetDate", "Data")}</span>
                <strong>{formatDateForField(metadata.drawingDate)}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetScale", "Skala")}</span>
                <strong>{metadata.drawingScale || t("app.projectProps.sheetScaleNone", "bez skali")}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>{t("app.projectProps.sheetRevision", "Rewizja")}</span>
                <strong>{metadata.revision || "1.0"}</strong>
              </div>
              <div className="pp-sheet__standards">
                <span>{t("app.projectProps.sheetStandards", "Normy")}</span>
                <strong>{standardsText}</strong>
              </div>

              {metadata.isFormalDocumentationMode && (
                <div className="pp-sheet__signatures">
                  <div>
                    <span>{t("app.projectProps.signDesigner", "Podpis elektryka")}</span>
                    <strong>{metadata.designerSignature || "................................"}</strong>
                  </div>
                  <div>
                    <span>{t("app.projectProps.signContractor", "Podpis wykonawcy")}</span>
                    <strong>{metadata.contractorSignature || "................................"}</strong>
                  </div>
                </div>
              )}
            </div>
          </article>
        </aside>
      </div>

      <footer className="pp-footer">
        <button type="button" className="accent-btn pp-export-action" onClick={onExportPdf}>
          <AppIcon name="pdf" size={18} />
          <span>{t("app.projectProps.exportPdf", "Eksportuj PDF")}</span>
        </button>
      </footer>
    </section>
  );
}
