import type { ChangeEvent } from "react";
import type { ProjectMetadata } from "../types/projectMetadata";
import { formatDateForField, parseStandards, standardsToText } from "../lib/projectMetadata";
import { AppIcon } from "./AppIcon";
import "./ProjectPropertiesPage.css";

type ProjectPropertiesPageProps = {
  metadata: ProjectMetadata;
  onChange: (next: ProjectMetadata) => void;
  onExportPdf: () => void;
  onResetDemo: () => void;
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
  onResetDemo,
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
          <span className="pp-eyebrow">Projekt</span>
          <h2>Właściwości projektu</h2>
          <p>
            Dane projektu, inwestycji i metadane dokumentacji dla bieżącego projektu.
          </p>
        </div>
      </header>

      <div className="pp-grid">
        <section className="pp-form-area">
          <article className="pp-card">
            <div className="pp-card__header">
              <div>
                <span className="pp-eyebrow">Podstawy</span>
                <h3>Dane projektu i inwestycji</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <label className="pp-toggle">
                <span className="pp-field-label">
                  <AppIcon className="pp-field-icon" name="check" size={12} />
                  Tryb formalny (podpisy)
                </span>
                <input
                  type="checkbox"
                  checked={metadata.isFormalDocumentationMode}
                  onChange={handleFormalModeChange}
                />
              </label>

              <div className="pp-fields">
                <Field
                  label="Nazwa projektu / inwestycja"
                  placeholder="Instalacja elektryczna - dom jednorodzinny"
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
                <span className="pp-eyebrow">Rysunek</span>
                <h3>Metadane dokumentacji</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <div className="pp-fields">
                {metadata.isFormalDocumentationMode && (
                  <>
                    <Field
                      label="Projektant"
                      placeholder="inż. Adam Wiśniewski"
                      value={metadata.author}
                      onChange={(value) => {
                        updateField("author", value);
                      }}
                    />
                    <Field
                      label="Uprawnienia projektanta"
                      placeholder="upr. bud. nr 67890"
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
                  label="Nr rysunku"
                  placeholder="E-01"
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
                  label="Data"
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
                    <h3>Podpis projektanta</h3>
                  </div>
                </div>
                <div className="pp-card__body">
                  <Field
                    label="Podpis projektanta"
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
                <h3>Powiązanie z dokumentacją</h3>
              </div>
            </div>

            <div className="pp-card__body">
              <dl className="pp-summary">
                <div>
                  <dt>Tryb</dt>
                  <dd>
                    {metadata.isFormalDocumentationMode ? "Formalny / z podpisami" : "Uproszczony"}
                  </dd>
                </div>
                <div>
                  <dt>Projektant</dt>
                  <dd>{metadata.author || "Brak danych"}</dd>
                </div>
                <div>
                  <dt>Nr rysunku</dt>
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
              <div className="pp-sheet__title">{metadata.company || "Nazwa projektu"}</div>
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
                    <span>Projektant</span>
                    <strong>{metadata.author || "................................"}</strong>
                  </div>
                  <div className="pp-sheet__row">
                    <span>Uprawnienia</span>
                    <strong>{metadata.designerId || "................................"}</strong>
                  </div>
                </>
              )}
              <div className="pp-sheet__row">
                <span>Nr rysunku</span>
                <strong>{metadata.projectNumber || "E-01"}</strong>
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
                    <span>Podpis projektanta</span>
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
        <button type="button" className="pp-secondary-action" onClick={onResetDemo}>
          Dane demo
        </button>
        <button type="button" className="accent-btn pp-export-action" onClick={onExportPdf}>
          <AppIcon name="pdf" size={18} />
          <span>Eksportuj PDF</span>
        </button>
      </footer>
    </section>
  );
}
