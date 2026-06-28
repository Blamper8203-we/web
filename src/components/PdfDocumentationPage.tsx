import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  getProtocolLabel,
  getSelectedProtocolHeader,
  parseChecklistItems,
  type PdfDocumentationPreviewTab,
  updateSelectedProtocolHeader,
} from "../lib/pdfDocumentation";
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

function pickProtocolHeading(selectedPreviewTab: PdfDocumentationPreviewTab) {
  if (selectedPreviewTab === "title-page") {
    return {
      title: "Pierwsza strona dokumentacji",
      description:
        "Po lewej edytujesz stronę tytułową. Szablony pomiarowe uzupełniasz z poziomu odpowiednich zakładek dokumentacji.",
    };
  }

  if (selectedPreviewTab === "circuit-list") {
    return {
      title: "Lista obwodów",
      description:
        "Ta zakładka pokazuje obwody bezpośrednio z aktualnej rozdzielnicy. Edycja nazw, faz, zabezpieczeń i przewodów odbywa się w danych obwodu.",
    };
  }

  if (selectedPreviewTab === "din-rail") {
    return {
      title: "Rozdzielnica elektryczna",
      description:
        "Ta zakładka pokazuje widok rozdzielnicy z aktualnej szyny DIN i synchronizuje się po zmianach w modułach.",
    };
  }

  if (selectedPreviewTab === "din-rail-connections") {
    return {
      title: "Połączenia",
      description:
        "Ta zakładka pokazuje widok rozdzielnicy razem z połączeniami — przewody i tulejki naniesione na podstawie aktualnego projektu.",
    };
  }

  if (selectedPreviewTab === "schematic") {
    return {
      title: "Schemat obwodów",
      description:
        "Ta zakładka pokazuje schemat wygenerowany z dodanych obwodów. Schemat odświeża się po modyfikacjach parametrów modułów.",
    };
  }

  const protocolLabel = getProtocolLabel(selectedPreviewTab);
  return {
    title: `Nagłówek protokołu: ${protocolLabel}`,
    description:
      "Każda zakładka pomiarowa ma własny nagłówek. Zmiany z tego panelu trafiają tylko do aktualnie wybranego protokołu.",
  };
}

function serializeChecklistItems(items: TitlePageChecklistItem[]) {
  return items
    .filter((item) => item.text.trim().length > 0)
    .map((item) => (item.isChecked ? item.text.trim() : `[ ] ${item.text.trim()}`))
    .join("\n");
}


export function PdfDocumentationPage() {
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
  const heading = pickProtocolHeading(selectedPreviewTab);
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
      setExportError("Nie udało się wczytać logo. Użyj pliku PNG, JPG, JPEG lub BMP.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku logo."));
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
        error instanceof Error ? error.message : "Nie udało się przygotować eksportu PDF.";
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
                  <h3 className="pd-card-title">Nagłówek dokumentu</h3>
                  <div className="pd-stack">

                    <Field
                      label="Nr protokołu"
                      value={metadata.projectNumber ?? ""}
                      placeholder="12"
                      onChange={(value) => updateMetadata({ projectNumber: value })}
                    />
                    <Field
                      label="Data dokumentacji"
                      value={metadata.drawingDate ?? ""}
                      placeholder="2026-03-31"
                      onChange={(value) => updateMetadata({ drawingDate: value })}
                    />
                    <Field
                      label="Data oświadczenia"
                      value={metadata.statementDate ?? ""}
                      placeholder="2026-03-31"
                      onChange={(value) => updateMetadata({ statementDate: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Informacje o obiekcie</h3>
                  <div className="pd-stack">
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
                      label="Adres inwestora"
                      value={metadata.investorAddress ?? ""}
                      placeholder="(opcjonalnie, jeśli inny niż adres obiektu)"
                      onChange={(value) => updateMetadata({ investorAddress: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Wykonawca i uprawnienia</h3>
                  <div className="pd-stack">
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
                      label="Uprawnienie SEP — Eksploatacja (E)"
                      value={metadata.designerId ?? ""}
                      placeholder="E / 123/2026"
                      onChange={(value) =>
                        updateMetadata({ designerId: value })
                      }
                    />
                    <Field
                      label="Uprawnienie SEP — Dozór (D)"
                      value={metadata.authorLicense ?? ""}
                      placeholder="D / 456/2026"
                      onChange={(value) =>
                        updateMetadata({ authorLicense: value })
                      }
                    />
                    <Field
                      label="Ważne do"
                      value={metadata.titlePageSepValidUntil ?? ""}
                      placeholder="31.12.2026"
                      onChange={(value) => updateMetadata({ titlePageSepValidUntil: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Dane identyfikacyjne firmy</h3>
                  <p className="pd-help-text">
                    Pola opcjonalne — wypełnij je, jeśli chcesz umieścić pełne dane firmy wykonawcy na stronie tytułowej PDF.
                  </p>
                  <div className="pd-stack">
                    <Field
                      label="NIP"
                      value={metadata.contractorNip ?? ""}
                      placeholder="1234567890"
                      onChange={(value) => updateMetadata({ contractorNip: value })}
                    />
                    <Field
                      label="REGON"
                      value={metadata.contractorRegon ?? ""}
                      placeholder="012345678"
                      onChange={(value) => updateMetadata({ contractorRegon: value })}
                    />
                    <Field
                      label="Telefon kontaktowy"
                      value={metadata.contractorPhone ?? ""}
                      placeholder="+48 600 100 200"
                      onChange={(value) => updateMetadata({ contractorPhone: value })}
                    />
                    <Field
                      label="E-mail"
                      value={metadata.contractorEmail ?? ""}
                      placeholder="biuro@firma.pl"
                      onChange={(value) => updateMetadata({ contractorEmail: value })}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Logo firmy elektrycznej</h3>
                  <p className="pd-help-text">
                    Dodane logo zostanie zapisane w zleceniu i pokazane na pierwszej stronie dokumentacji PDF.
                  </p>
                  <p className="pd-logo-info">
                    {metadata.titlePageCompanyLogoFileName
                      ? `Wybrane logo: ${metadata.titlePageCompanyLogoFileName}`
                      : "Brak wybranego logo."}
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
                      Wybierz logo
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
                      Usuń logo
                    </button>
                  </div>
                  <p className="pd-help-text">Obsługiwane formaty: PNG, JPG, JPEG, BMP.</p>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Zakres prac</h3>
                  <p className="pd-help-text">
                    Każdą pozycję wpisz w osobnej linii. W PDF możesz zostawić puste pola do ręcznego odhaczania albo użyć cyfrowych zaznaczeń.
                  </p>
                  <label className="pd-checkbox">
                    <input
                      type="checkbox"
                      checked={metadata.titlePageUseManualWorkScopeCheckboxes}
                      onChange={(event) =>
                        updateMetadata({ titlePageUseManualWorkScopeCheckboxes: event.currentTarget.checked })
                      }
                    />
                    <span>Puste pola do ręcznego odhaczania na wydruku</span>
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
                  <h3 className="pd-card-title">Załączniki</h3>
                  <p className="pd-help-text">Ta sekcja zawiera z góry zdefiniowane, stałe załączniki.</p>
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
                  <h3 className="pd-card-title">Podpisy</h3>
                  <div className="pd-stack">
                    <Field
                      label="Podpis inwestora"
                      value={metadata.investorSignature ?? ""}
                      placeholder="........................"
                      onChange={(value) => updateMetadata({ investorSignature: value })}
                    />
                    <Field
                      label="Podpis elektryka"
                      value={metadata.designerSignature ?? ""}
                      placeholder="........................"
                      onChange={(value) => updateMetadata({ designerSignature: value })}
                    />
                    <Field
                      label="Pieczątka / podpis wykonawcy"
                      value={metadata.contractorSignature ?? ""}
                      placeholder="PIECZĄTKA WYKONAWCY"
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
                  <h3 className="pd-card-title">Źródło danych listy</h3>
                  <p className="pd-help-text">
                    Lista obwodów jest generowana z aktualnych symboli rozdzielnicy i synchronizuje się po zmianach w modułach.
                  </p>
                  <p className="pd-help-text">
                    RCD, kontrolki faz, listwy, złącza i bloki rozdzielcze nie są pokazywane jako osobne obwody.
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "din-rail" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Źródło widoku rozdzielnicy</h3>
                  <p className="pd-help-text">
                    Widok jest generowany z aktualnej szyny DIN, modułów i oznaczeń widocznych w projekcie.
                  </p>
                  <p className="pd-help-text">
                    Po dodaniu, usunięciu albo przesunięciu modułu podgląd odświeża się z tych samych danych, które trafiają do eksportu PDF.
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "din-rail-connections" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Źródło widoku rozdzielnicy z połączeniami</h3>
                  <p className="pd-help-text">
                    Warstwa przewodów i tulejek nanoszona jest z aktualnych połączeń projektu. Podgląd odświeża się po każdej zmianie połączenia.
                  </p>
                  <p className="pd-help-text">
                    Eksport PDF zawiera obie strony: czystą rozdzielnicę i rozdzielnicę z połączeniami.
                  </p>
                </div>
              </article>
            </div>
          ) : selectedPreviewTab === "schematic" ? (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Źródło schematu</h3>
                  <p className="pd-help-text">
                    Schemat jest generowany automatycznie na podstawie dodanych obwodów, faz i wartości zabezpieczeń.
                  </p>
                </div>
              </article>
            </div>
          ) : (
            <div className="pd-editor-body">
              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Nagłówek protokołu</h3>
                  <p className="pd-help-text">Ten panel edytuje nagłówek aktywnej zakładki pomiarowej.</p>
                  <div className="pd-stack">
                    <Field
                      label="Tytuł główny"
                      value={selectedHeader?.headerTitle ?? ""}
                      placeholder="Protokół Nr 02 / 2026"
                      onChange={(value) => updateHeader("headerTitle", value)}
                    />
                    <Field
                      label="Podtytuł"
                      value={selectedHeader?.headerSubtitle ?? ""}
                      placeholder="Badanie skuteczności ochrony przeciwporażeniowej"
                      onChange={(value) => updateHeader("headerSubtitle", value)}
                    />
                  </div>
                </div>
              </article>

              <article className="pd-card">
                <div className="pd-card__body">
                  <h3 className="pd-card-title">Dane po prawej stronie nagłówka</h3>
                  <div className="pd-stack">
                    <Field
                      label="Data pomiarów"
                      value={selectedHeader?.measurementDate ?? ""}
                      placeholder="2026-03-22"
                      onChange={(value) => updateHeader("measurementDate", value)}
                    />
                    <Field
                      label="Obiekt"
                      value={selectedHeader?.objectName ?? ""}
                      placeholder="Nowe zlecenie"
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
          <span>{isExportingPdf ? "Przygotowanie..." : "Eksportuj PDF"}</span>
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
            Spróbuj ponownie
          </button>
        </p>
      ) : null}
    </section>
  );
}
