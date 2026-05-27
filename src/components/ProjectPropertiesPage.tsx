import type { ChangeEvent } from "react";
import type { ProjectMetadata } from "../types/projectMetadata";
import { formatDateForField, parseStandards, standardsToText } from "../lib/projectMetadata";
import { AppIcon } from "./AppIcon";
import "./ProjectPropertiesPage.css";

type ProjectPropertiesPageProps = {
  metadata: ProjectMetadata;
  onChange: (next: ProjectMetadata) => void;
  onExportPdf: () => void;
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
}: ProjectPropertiesPageProps) {
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
      <header className="pp-hero">
        <AppIcon className="pp-hero-icon" name="fileEdit" size={18} />
        <div>
          <span className="pp-eyebrow">Powykonawcza</span>
          <h2>Dokumentacja wykonania instalacji</h2>
          <p>
            Dane obiektu, wykonawcy, elektryka i dokumentacji odbiorczej dla mieszkania lub domu.
          </p>
        </div>
      </header>

      <div className="pp-grid">
        <section className="pp-form-area">
          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">Obiekt</span>
                <h3>Dane obiektu i zlecenia</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <label className="pp-toggle">
                <span className="pp-field-label">
                  <AppIcon className="pp-field-icon" name="check" size={12} />
                  Dokumentacja z podpisami i pieczątką
                </span>
                <input
                  type="checkbox"
                  checked={metadata.isFormalDocumentationMode}
                  onChange={handleFormalModeChange}
                />
              </label>

              <div className="pp-fields">
                <Field
                  label="Zakres / nazwa dokumentacji"
                  placeholder="Dokumentacja powykonawcza instalacji elektrycznej"
                  value={metadata.company}
                  onChange={handleTextField("company")}
                />
                <Field
                  label="Inwestor"
                  placeholder="Jan Kowalski"
                  value={metadata.investor}
                  onChange={handleTextField("investor")}
                />
                <Field
                  label="Adres obiektu"
                  placeholder="ul. Budowlana 12"
                  value={metadata.address}
                  onChange={handleTextField("address")}
                />
                <Field
                  label="Wykonawca"
                  placeholder="FHU Elektro Jan Kowalski"
                  value={metadata.contractor}
                  onChange={handleTextField("contractor")}
                />
              </div>
            </div>
          </article>

          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">Dokument</span>
                <h3>Dane protokołu i schematu</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <div className="pp-fields">
                {metadata.isFormalDocumentationMode && (
                  <>
                    <Field
                      label="Elektryk / osoba wykonująca"
                      placeholder="Jan Kowalski"
                      value={metadata.author}
                      onChange={(value) => {
                        updateField("author", value);
                      }}
                    />
                    <Field
                      label="Uprawnienia SEP"
                      placeholder="E + D / 123/2026"
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
                  label="Nr dokumentacji / protokołu"
                  placeholder="PW-01/2026"
                  value={metadata.projectNumber}
                  onChange={handleTextField("projectNumber")}
                />
                <Field
                  label="Skala"
                  placeholder="bez skali"
                  value={metadata.drawingScale}
                  onChange={handleTextField("drawingScale")}
                />
                <Field
                  label="Data wykonania / odbioru"
                  placeholder="2026-03-29"
                  value={formatDateForField(metadata.drawingDate)}
                  onChange={handleTextField("drawingDate")}
                />
                <Field
                  label="Rewizja / zmiana"
                  placeholder="Rev. 0 - wydanie pierwotne"
                  value={metadata.revision}
                  onChange={handleTextField("revision")}
                />
                <Field
                  label="Normy"
                  placeholder="PN-HD 60364; PN-EN 60617"
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
                    <span className="pp-eyebrow">Podpisy</span>
                    <h3>Podpis elektryka</h3>
                  </div>
                </div>
                <div className="pp-card__body">
                  <Field
                    label="Podpis elektryka"
                    placeholder="........................."
                    value={metadata.designerSignature}
                    onChange={handleTextField("designerSignature")}
                  />
                </div>
              </article>

              <article className="pp-card">
                <div className="pp-card__header">
                  <div>
                    <span className="pp-eyebrow">Podpisy</span>
                    <h3>Podpis wykonawcy</h3>
                  </div>
                </div>
                <div className="pp-card__body">
                  <Field
                    label="Podpis wykonawcy"
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
                <span className="pp-eyebrow">Status</span>
                <h3>Status dokumentacji</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <dl className="pp-summary">
                <div>
                  <dt>Tryb</dt>
                  <dd>
                    {metadata.isFormalDocumentationMode ? "Powykonawcza z podpisami" : "Robocza / uproszczona"}
                  </dd>
                </div>
                <div>
                  <dt>Elektryk</dt>
                  <dd>{metadata.author || "Brak danych"}</dd>
                </div>
                <div>
                  <dt>Nr dokumentacji</dt>
                  <dd>{metadata.projectNumber || "Brak danych"}</dd>
                </div>
                <div>
                  <dt>Ostatnia modyfikacja</dt>
                  <dd>{formatDateForField(metadata.dateModified)}</dd>
                </div>
              </dl>
            </div>
          </article>

          <article className="pp-preview-sheet">
            <div className="pp-preview-sheet__header">
              <span className="pp-eyebrow">Podgląd A4</span>
              <strong>Fragment danych tytułowych</strong>
            </div>

            <div className="pp-sheet">
              <div className="pp-sheet__title">{metadata.company || "Dokumentacja powykonawcza"}</div>
              <div className="pp-sheet__divider" />
              <div className="pp-sheet__row">
                <span>Inwestor</span>
                <strong>{metadata.investor || "................................"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>Adres</span>
                <strong>{metadata.address || "................................"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>Wykonawca</span>
                <strong>{metadata.contractor || "................................"}</strong>
              </div>
              {metadata.isFormalDocumentationMode && (
                <>
                  <div className="pp-sheet__row">
                    <span>Elektryk</span>
                    <strong>{metadata.author || "................................"}</strong>
                  </div>
                  <div className="pp-sheet__row">
                    <span>Uprawnienia SEP</span>
                    <strong>{metadata.designerId || "................................"}</strong>
                  </div>
                </>
              )}
              <div className="pp-sheet__row">
                <span>Nr dokumentacji</span>
                <strong>{metadata.projectNumber || "PW-01/2026"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>Data</span>
                <strong>{formatDateForField(metadata.drawingDate)}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>Skala</span>
                <strong>{metadata.drawingScale || "bez skali"}</strong>
              </div>
              <div className="pp-sheet__row">
                <span>Rewizja</span>
                <strong>{metadata.revision || "1.0"}</strong>
              </div>
              <div className="pp-sheet__standards">
                <span>Normy</span>
                <strong>{standardsText}</strong>
              </div>

              {metadata.isFormalDocumentationMode && (
                <div className="pp-sheet__signatures">
                  <div>
                    <span>Podpis elektryka</span>
                    <strong>{metadata.designerSignature || "................................"}</strong>
                  </div>
                  <div>
                    <span>Podpis wykonawcy</span>
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
          <span>Eksportuj PDF</span>
        </button>
      </footer>
    </section>
  );
}
