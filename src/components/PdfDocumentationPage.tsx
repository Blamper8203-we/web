import { useState, useEffect } from "react";
import {
  getProtocolLabel,
  getSelectedProtocolHeader,
  type PdfDocumentationPreviewTab,
  updateSelectedProtocolHeader,
} from "../lib/pdfDocumentation";

import type { MeasurementProtocolHeaderSettings, ProjectMetadata, TitlePageChecklistItem } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import { AppIcon } from "./AppIcon";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PdfProtocolDocument } from "../lib/export/PdfProtocolDocument";
import { calculateTotalDistribution } from "../lib/phaseDistribution/phaseDistributionCalculator";
import { validateProject } from "../lib/validation/electricalValidationService";
import { exportSchematicToDataURL } from "../lib/export/schematicSnapshotService";
import { exportDinRailToDataURL } from "../lib/export/dinRailSnapshotService";
import type { DinRailCanvasRail } from "./DinRailCanvasPixi";
import "./PdfDocumentationPage.css";

type PdfDocumentationPageProps = {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  rail: DinRailCanvasRail;
  onChange: (next: ProjectMetadata) => void;
  onResetDocumentation: () => void;
  selectedPreviewTab: PdfDocumentationPreviewTab;
};

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChange: (value: string) => void;
};

function Field({ label, value, placeholder, multiline = false, onChange }: FieldProps) {
  return (
    <label className="pd-field">
      <span>{label}</span>
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

type WorkScopeItemProps = {
  item: TitlePageChecklistItem;
  index: number;
  onUpdate: (index: number, item: TitlePageChecklistItem) => void;
  onRemove: (index: number) => void;
};

function WorkScopeItem({ item, index, onUpdate, onRemove }: WorkScopeItemProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
      <input
        type="checkbox"
        checked={item.isChecked}
        onChange={(e) => onUpdate(index, { ...item, isChecked: e.currentTarget.checked })}
      />
      <input
        type="text"
        value={item.text}
        placeholder="Np. Montaż rozdzielnicy głównej"
        onChange={(e) => onUpdate(index, { ...item, text: e.currentTarget.value })}
        style={{ flex: 1, padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Usuń
      </button>
    </div>
  );
}

export function PdfDocumentationPage({
  metadata,
  symbols,
  rail,
  onChange,
  onResetDocumentation,
  selectedPreviewTab,
}: PdfDocumentationPageProps) {
  const [schematicImages, setSchematicImages] = useState<string[]>([]);
  const [dinRailImages, setDinRailImages] = useState<string[]>([]);


  useEffect(() => {
    exportSchematicToDataURL(symbols).then(setSchematicImages);
    exportDinRailToDataURL(symbols, rail).then(setDinRailImages);
  }, [symbols, rail]);

  const updateMetadata = (patch: Partial<ProjectMetadata>) => {
    onChange({
      ...metadata,
      ...patch,
      dateModified: new Date().toISOString(),
    });
  };

  const selectedHeader = getSelectedProtocolHeader(metadata, selectedPreviewTab);


  const updateHeader = (
    field: keyof MeasurementProtocolHeaderSettings,
    value: string,
  ) => {
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

  return (
    <section className="pd-page">
      <header className="pd-hero">
        <AppIcon className="pd-hero-icon" name="pdf" size={18} />
        <div>
          <span className="pd-eyebrow">Dokumentacja</span>
          <h2>Panel dokumentacji</h2>
          <p>
            Edycja strony tytułowej, logo, zakresu prac i nagłówków protokołów.
          </p>
        </div>
      </header>

      <div className="pd-grid">
        <section className="pd-editor">
          <div className="pd-editor-header">
            <div>
              <span className="pd-eyebrow">
                {selectedPreviewTab === "title-page"
                  ? "Strona tytułowa"
                  : `Nagłówek protokołu: ${getProtocolLabel(selectedPreviewTab)}`}
              </span>
              <h3>
                {selectedPreviewTab === "title-page"
                  ? "Pierwsza strona dokumentacji"
                  : `Nagłówek protokołu ${getProtocolLabel(selectedPreviewTab)}`}
              </h3>
            </div>
          </div>

          {selectedPreviewTab === "title-page" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__header">
                  <span className="pd-eyebrow">Strona tytułowa</span>
                  <strong>Dane ogólne dokumentu</strong>
                </div>
                <div className="pd-card__body pd-fields">
                  <Field
                    label="Nr protokołu"
                    value={metadata.projectNumber ?? ""}
                    placeholder="12"
                    onChange={(value) => updateMetadata({ projectNumber: value })}
                  />
                  <Field
                    label="Data"
                    value={metadata.drawingDate ?? ""}
                    placeholder="2026-03-31"
                    onChange={(value) => updateMetadata({ drawingDate: value })}
                  />
                  <Field
                    label="Rodzaj obiektu"
                    value={metadata.titlePageObjectType ?? ""}
                    placeholder="Budynek jednorodzinny / Lokal mieszkalny"
                    onChange={(value) => updateMetadata({ titlePageObjectType: value })}
                  />
                  <Field
                    label="Adres"
                    value={metadata.address ?? ""}
                    placeholder="ul. Budowlana 12, 59-300 Lubin"
                    onChange={(value) => updateMetadata({ address: value })}
                  />
                  <Field
                    label="Inwestor"
                    value={metadata.investor ?? ""}
                    placeholder="Jan Kowalski"
                    onChange={(value) => updateMetadata({ investor: value })}
                  />
                  <Field
                    label="Wykonawca / firma"
                    value={metadata.contractor ?? ""}
                    placeholder="Usługi Elektryczne PRO-EL"
                    onChange={(value) => updateMetadata({ contractor: value })}
                  />
                  <Field
                    label="Instalator / elektryk"
                    value={metadata.author ?? ""}
                    placeholder="Jan Kowalski"
                    onChange={(value) => updateMetadata({ author: value })}
                  />
                  <Field
                    label="Nr uprawnień SEP"
                    value={metadata.designerId ?? ""}
                    placeholder="SEP/D/12345"
                    onChange={(value) => updateMetadata({ designerId: value })}
                  />
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__header">
                  <span className="pd-eyebrow">Zakres prac</span>
                  <strong>Checklist zakresu wykonanych prac</strong>
                </div>
                <div className="pd-card__body">
                  <div style={{ marginBottom: '12px' }}>
                    {metadata.titlePageWorkScopeItems?.map((item, index) => (
                      <WorkScopeItem
                        key={index}
                        item={item}
                        index={index}
                        onUpdate={(idx, updatedItem) => {
                          const newItems = [...metadata.titlePageWorkScopeItems];
                          newItems[idx] = updatedItem;
                          updateMetadata({ titlePageWorkScopeItems: newItems });
                        }}
                        onRemove={(idx) => {
                          const newItems = metadata.titlePageWorkScopeItems.filter((_, i) => i !== idx);
                          updateMetadata({ titlePageWorkScopeItems: newItems });
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateMetadata({
                        titlePageWorkScopeItems: [
                          ...(metadata.titlePageWorkScopeItems ?? []),
                          { text: '', isChecked: true },
                        ],
                      });
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    + Dodaj pozycję
                  </button>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__header">
                  <span className="pd-eyebrow">Załączniki</span>
                  <strong>Lista załączników do dokumentacji</strong>
                </div>
                <div className="pd-card__body">
                  <div style={{ marginBottom: '12px' }}>
                    {metadata.titlePageAttachmentItems?.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '8px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <input
                          type="text"
                          value={item}
                          placeholder="Np. Protokoły z pomiarów"
                          onChange={(e) => {
                            const newItems = [...metadata.titlePageAttachmentItems];
                            newItems[index] = e.currentTarget.value;
                            updateMetadata({ titlePageAttachmentItems: newItems });
                          }}
                          style={{
                            flex: 1,
                            padding: '6px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = metadata.titlePageAttachmentItems.filter((_, i) => i !== index);
                            updateMetadata({ titlePageAttachmentItems: newItems });
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Usuń
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateMetadata({
                        titlePageAttachmentItems: [...(metadata.titlePageAttachmentItems ?? []), ''],
                      });
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    + Dodaj załącznik
                  </button>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__header">
                  <span className="pd-eyebrow">Podpisy</span>
                  <strong>Pola do uzupełnienia podpisów</strong>
                </div>
                <div className="pd-card__body pd-fields">
                  <Field
                    label="Podpis wykonawcy"
                    value={metadata.contractorSignature ?? ""}
                    placeholder="........................."
                    onChange={(value) => updateMetadata({ contractorSignature: value })}
                  />
                  <Field
                    label="Podpis inwestora"
                    value={metadata.investorSignature ?? ""}
                    placeholder="........................."
                    onChange={(value) => updateMetadata({ investorSignature: value })}
                  />
                  <Field
                    label="Podpis elektryka"
                    value={metadata.designerSignature ?? ""}
                    placeholder="........................."
                    onChange={(value) => updateMetadata({ designerSignature: value })}
                  />
                </div>
              </article>
            </div>
          ) : (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__header">
                  <span className="pd-eyebrow">Nagłówek protokołu</span>
                  <strong>{getProtocolLabel(selectedPreviewTab)}</strong>
                </div>
                <div className="pd-card__body pd-fields">
                  <Field
                    label="Tytuł główny"
                    value={selectedHeader?.headerTitle ?? ""}
                    placeholder="Protokol Nr 02 / 2026"
                    onChange={(value) => updateHeader("headerTitle", value)}
                  />
                  <Field
                    label="Podtytuł"
                    value={selectedHeader?.headerSubtitle ?? ""}
                    placeholder="Badanie skuteczności ochrony przeciwporażeniowej"
                    onChange={(value) => updateHeader("headerSubtitle", value)}
                  />
                  <Field
                    label="Data pomiarów"
                    value={selectedHeader?.measurementDate ?? ""}
                    placeholder="2026-03-22"
                    onChange={(value) => updateHeader("measurementDate", value)}
                  />
                  <Field
                    label="Obiekt"
                    value={selectedHeader?.objectName ?? ""}
                    placeholder="Nowy projekt"
                    onChange={(value) => updateHeader("objectName", value)}
                  />
                </div>
              </article>
            </div>
          )}
        </section>


      </div>

      <footer className="pd-footer">
        <button type="button" className="pd-secondary-action" onClick={onResetDocumentation}>
          Resetuj sekcję
        </button>

        <PDFDownloadLink
          document={
            <PdfProtocolDocument
              metadata={metadata}
              symbols={symbols}
              phaseDistribution={calculateTotalDistribution(symbols)}
              validationResult={validateProject(symbols)}
              schematicImages={schematicImages}
              dinRailImages={dinRailImages}
            />
          }
          fileName={`dokumentacja_${metadata.projectNumber || 'projekt'}.pdf`}
          className="accent-btn pd-export-action"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {({ loading }) => (
            <>
              <AppIcon name="pdf" size={18} />
              <span>{loading ? 'Przygotowanie...' : 'Eksportuj PDF'}</span>
            </>
          )}
        </PDFDownloadLink>
      </footer>
    </section>
  );
}
