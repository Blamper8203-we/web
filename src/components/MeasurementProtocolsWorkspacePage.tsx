import type { CircuitRow } from "../types/circuitRow";
import type {
  MeasurementContinuityProtocolRow,
  MeasurementInsulationProtocolRow,
  MeasurementLoopProtocolRow,
  MeasurementProtocolsData,
  MeasurementRcdProtocolRow,
  ProjectMetadata,
} from "../types/projectMetadata";
import "./MeasurementProtocolsWorkspacePage.css";

const CONTINUITY_ROWS_PER_PAGE = 18;
const LOOP_ROWS_PER_PAGE = 18;
const INSULATION_ROWS_PER_PAGE = 18;

type WorkspaceTab = "overview" | "continuity" | "loop" | "insulation" | "rcd-ground" | "title-page";

type MeasurementProtocolsWorkspacePageProps = {
  metadata: ProjectMetadata;
  circuitRows: CircuitRow[];
  onChange: (next: ProjectMetadata) => void;
  activeTab: WorkspaceTab;
};

type InlineFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  width?: string;
};

type ProtocolTableRowsMap = Pick<
  MeasurementProtocolsData,
  "continuityRows" | "loopImpedanceRows" | "insulationRows" | "rcdRows"
>;
type ProtocolTableKey = keyof ProtocolTableRowsMap;
type ProtocolTableRowByKey = {
  continuityRows: MeasurementContinuityProtocolRow;
  loopImpedanceRows: MeasurementLoopProtocolRow;
  insulationRows: MeasurementInsulationProtocolRow;
  rcdRows: MeasurementRcdProtocolRow;
};
type StringFieldKeys<T> = {
  [K in keyof T]-?: T[K] extends string ? K : never;
}[keyof T];

function InlineField({
  label,
  value,
  placeholder,
  onChange,
  width
}: InlineFieldProps) {
  return (
    <label className="mp-inline-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={width ? { width } : undefined}
      />
    </label>
  );
}



function SheetHeader({
  header,
  note,
  protocolName,
}: {
  header: any;
  note: string;
  protocolName?: string;
}) {
  return (
    <header className="mp-sheet-header">
      <div className="mp-header-left">
        {protocolName ? <div className="mp-header-protocol-name">{protocolName}</div> : null}
        <h1>{header.headerTitle || "Protokół Nr 01 / 2026"}</h1>
        <p>{header.headerSubtitle || note}</p>
      </div>

      <div className="mp-header-right">
        <div>Data pomiarów: {header.measurementDate || "11.04.2026"}</div>
        <div>Obiekt: {header.objectName || "Nowy projekt"}</div>
      </div>
    </header>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mp-section-heading">
      {title}
    </div>
  );
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function buildSheetTitle(pageIndex: number, totalPages: number): string {
  const current = String(pageIndex + 1).padStart(2, "0");
  const total = String(totalPages).padStart(2, "0");
  return `Protokół Nr ${current}/${total}`;
}

function createHeaderForPage<T extends { headerTitle?: string }>(
  header: T,
  pageIndex: number,
  totalPages: number,
): T {
  return {
    ...header,
    headerTitle: buildSheetTitle(pageIndex, totalPages),
  };
}

const DEFAULT_WORK_SCOPE_ITEMS = [
  { text: "Montaż rozdzielnicy głównej", isChecked: true },
  { text: "Układanie przewodów i osprzętu", isChecked: true },
  { text: "Pomiary ochrony przeciwporażeniowej", isChecked: true },
];

const DEFAULT_ATTACHMENT_ITEMS = [
  "Protokoły z pomiarów",
  "Schemat rozdzielnicy",
  "Uprawnienia wykonawcy",
];

export function MeasurementProtocolsWorkspacePage({
  metadata,
  circuitRows: _circuitRows,
  onChange,
  activeTab,
}: MeasurementProtocolsWorkspacePageProps) {
  const protocols = metadata.measurementProtocols;
  const continuityPages = chunkRows(protocols.continuityRows, CONTINUITY_ROWS_PER_PAGE);
  const loopPages = chunkRows(protocols.loopImpedanceRows, LOOP_ROWS_PER_PAGE);
  const insulationPages = chunkRows(protocols.insulationRows, INSULATION_ROWS_PER_PAGE);

  const updateProtocols = (patch: Partial<MeasurementProtocolsData>) => {
    onChange({
      ...metadata,
      measurementProtocols: {
        ...protocols,
        ...patch,
      },
      dateModified: new Date().toISOString(),
    });
  };



  const updateTableRows = <K extends ProtocolTableKey>(
    key: K,
    rows: ProtocolTableRowsMap[K],
  ) => {
    updateProtocols({ [key]: rows } as Pick<MeasurementProtocolsData, K>);
  };

  const updateTableRow = <
    K extends ProtocolTableKey,
    F extends StringFieldKeys<ProtocolTableRowByKey[K]>
  >(
    key: K,
    index: number,
    field: F,
    value: ProtocolTableRowByKey[K][F],
  ) => {
    const rows = protocols[key] as ProtocolTableRowByKey[K][];
    const nextRows = rows.map((row, i) => (
      i === index ? { ...row, [field]: value } : row
    )) as ProtocolTableRowsMap[K];
    updateTableRows(key, nextRows);
  };

  const displayDate = metadata.drawingDate || new Date().toLocaleDateString("pl-PL");
  const protocolYear = new Date(displayDate).getFullYear() || new Date().getFullYear();
  const protocolNumber = metadata.projectNumber?.trim()
    ? `${metadata.projectNumber.trim()} / ${protocolYear}`
    : `....... / ${protocolYear}`;
  const workScopeItems = metadata.titlePageWorkScopeItems.length > 0
    ? metadata.titlePageWorkScopeItems
    : DEFAULT_WORK_SCOPE_ITEMS;
  const attachmentItems = metadata.titlePageAttachmentItems.length > 0
    ? metadata.titlePageAttachmentItems
    : DEFAULT_ATTACHMENT_ITEMS;
  const leftWorkScopeItems = workScopeItems.slice(0, 5);
  const rightWorkScopeItems = workScopeItems.slice(5, 10);
  const leftAttachmentItems = attachmentItems.slice(0, 5);
  const rightAttachmentItems = attachmentItems.slice(5, 10);
  const contractorName = metadata.contractor || metadata.author || "................................";
  const installerName = metadata.author || metadata.contractor || "................................";
  const objectType = metadata.titlePageObjectType || metadata.company || "Budynek jednorodzinny / Lokal mieszkalny";
  const sepNumber = metadata.designerId || metadata.authorLicense || "................................";
  const sepValidUntil = metadata.titlePageSepValidUntil || "................................";
  const investorSignature = metadata.isFormalDocumentationMode
    ? metadata.investorSignature || ""
    : "nie dotyczy";
  const installerSignature = metadata.isFormalDocumentationMode
    ? metadata.designerSignature || ""
    : "nie dotyczy";
  const stampText = metadata.isFormalDocumentationMode
    ? metadata.contractorSignature || "PIECZĄTKA WYKONAWCY"
    : "NIE DOTYCZY";

  return (
    <div className="mp-page">
      <div className="mp-stage">
        {activeTab === "title-page" && (
          <article className="mp-sheet mp-sheet--portrait">
            <div className="tp-container">
              <header className="tp-header">
                <div className="tp-logo-box">
                  {metadata.titlePageCompanyLogoDataUrl ? (
                    <img
                      src={metadata.titlePageCompanyLogoDataUrl}
                      alt="Logo firmy"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    "LOGO"
                  )}
                </div>
                <div className="tp-header-title">
                  <h2>DOKUMENTACJA POWYKONAWCZA</h2>
                  <p>ZGODNOŚĆ Z NORMĄ PN-HD 60364</p>
                </div>
                <div className="tp-header-meta">
                  <div>NR PROTOKOŁU: {protocolNumber}</div>
                  <div>Data: {displayDate}</div>
                </div>
              </header>

              <div className="tp-main-title">
                <h1>OŚWIADCZENIE WYKONAWCY</h1>
                <p>instalacji elektrycznej wykonanej zgodnie z przepisami</p>
              </div>

              <section className="tp-info-box tp-info-box--light">
                <h3>INFORMACJE O OBIEKCIE</h3>
                <div className="tp-info-grid">
                  <span className="tp-info-label">Rodzaj:</span>
                  <span className="tp-info-value">{objectType}</span>
                  <span className="tp-info-label">Adres:</span>
                  <span className="tp-info-value">{metadata.address || "................................................................"}</span>
                  <span className="tp-info-label">Inwestor:</span>
                  <span className="tp-info-value">{metadata.investor || "................................................................"}</span>
                </div>
              </section>

              <div className="tp-grid-2">
                <section className="tp-info-box">
                  <h3>ZAKRES PRAC</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <ul className="tp-check-list">
                      {leftWorkScopeItems.map((item, index) => (
                        <li className="tp-check-item" key={`work-left-${index}`}>
                          <span className="tp-checkbox">
                            {metadata.titlePageUseManualWorkScopeCheckboxes ? "" : item.isChecked ? "✓" : ""}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="tp-check-list">
                      {rightWorkScopeItems.map((item, index) => (
                        <li className="tp-check-item" key={`work-right-${index}`}>
                          <span className="tp-checkbox">
                            {metadata.titlePageUseManualWorkScopeCheckboxes ? "" : item.isChecked ? "✓" : ""}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="tp-info-box">
                  <h3>ZAŁĄCZNIKI</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <ul className="tp-attachment-list">
                      {leftAttachmentItems.map((item, index) => (
                        <li key={`attach-left-${index}`}>- {item}</li>
                      ))}
                    </ul>
                    <ul className="tp-attachment-list">
                      {rightAttachmentItems.map((item, index) => (
                        <li key={`attach-right-${index}`}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <div className="tp-grid-2" style={{ marginTop: "12px" }}>
                <section className="tp-info-box tp-info-box--light">
                  <h3>WYKONAWCA / INSTALATOR</h3>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{contractorName}</div>
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#0f172a" }}>{installerName}</div>
                  <div style={{ marginTop: "8px", fontSize: "8.2px", color: "#64748b" }}>
                    Dokumentacja odbiorowa instalacji elektrycznej
                  </div>
                </section>
                <section className="tp-info-box tp-info-box--light">
                  <h3>UPRAWNIENIA SEP</h3>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Kwalifikacje: E + D</div>
                  <div style={{ marginTop: "4px", fontSize: "10px", color: "#0f172a" }}>Nr: {sepNumber}</div>
                  <div style={{ marginTop: "4px", fontSize: "8.6px", color: "#64748b" }}>Ważne do: {sepValidUntil}</div>
                </section>
              </div>

              <div className="tp-signatures">
                <div className="tp-sig-line">
                  <div style={{ minHeight: "20px", color: "#0f172a" }}>{investorSignature}</div>
                  <div style={{ height: "1px", backgroundColor: "#cbd5e1", margin: "4px 0" }} />
                  <div>PODPIS INWESTORA</div>
                </div>
                <div className="tp-stamp-box">{stampText}</div>
                <div className="tp-sig-line">
                  <div style={{ minHeight: "20px", color: "#0f172a" }}>{installerSignature}</div>
                  <div style={{ height: "1px", backgroundColor: "#cbd5e1", margin: "4px 0" }} />
                  <div>PODPIS ELEKTRYKA</div>
                </div>
              </div>

              <div className="tp-bottom-note">
                Instalacja została wykonana zgodnie z projektem (jeśli dotyczy), przepisami oraz normą PN-HD 60364.
                Pomiary wykazały skuteczność zastosowanych środków ochrony.
              </div>
            </div>
          </article>
        )}

        {activeTab === "continuity" && continuityPages.map((rowsPage, pageIndex) => {
          const pageOffset = pageIndex * CONTINUITY_ROWS_PER_PAGE;
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === continuityPages.length - 1;
          const pageHeader = createHeaderForPage(protocols.continuityHeader, pageIndex, continuityPages.length);

          return (
            <article className="mp-sheet" key={`continuity-page-${pageIndex}`}>
              <SheetHeader protocolName="Ciągłość PE" header={pageHeader} note="Badanie ciągłości przewodów PE i połączeń wyrównawczych" />
              <div className="mp-header-divider" />
              {isFirstPage ? (
                <>
                  <SectionHeading title="1. Dane techniczne i narzędzia" />
                  <div className="mp-form-row">
                    <InlineField label="Miernik:" value={protocols.continuityMeterName} placeholder=".........................................." onChange={(v) => updateProtocols({ continuityMeterName: v })} />
                    <InlineField label="Nr fabryczny:" value={protocols.continuityMeterSerialNumber} placeholder=".........................................." onChange={(v) => updateProtocols({ continuityMeterSerialNumber: v })} />
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-inline-field"><span>Prąd pomiarowy:</span><strong>{">= 200 mA"}</strong></div>
                  </div>
                  <SectionHeading title="2. Wyniki badania ciągłości" />
                </>
              ) : (
                <SectionHeading title={`2. Wyniki badania ciągłości (ciąg dalszy ${pageIndex + 1})`} />
              )}
              <table className="mp-table">
                <thead><tr><th style={{ width: "40px" }}>Lp.</th><th>Nazwa obwodu / element</th><th>Lokalizacja</th><th>Badany przewód / połączenie</th><th>Wynik [Ω]</th><th>Ocena</th></tr></thead>
                <tbody>
                  {rowsPage.map((row, localIndex) => {
                    const absoluteIndex = pageOffset + localIndex;
                    return (
                      <tr key={absoluteIndex}>
                        <td className="mp-index-cell">{row.index}</td>
                        <td><input className="mp-table-input" value={row.circuitName} onChange={(e) => updateTableRow("continuityRows", absoluteIndex, "circuitName", e.target.value)} /></td>
                        <td><input className="mp-table-input" value={row.location} onChange={(e) => updateTableRow("continuityRows", absoluteIndex, "location", e.target.value)} /></td>
                        <td><input className="mp-table-input" value={row.connectionType} onChange={(e) => updateTableRow("continuityRows", absoluteIndex, "connectionType", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.measuredResistance} onChange={(e) => updateTableRow("continuityRows", absoluteIndex, "measuredResistance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("continuityRows", absoluteIndex, "assessment", e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isLastPage && <div className="mp-legend">Legenda: PE - przewód ochronny, połączenie wyrównawcze - połączenie ochronne między częściami przewodzącymi.</div>}
            </article>
          );
        })}

        {activeTab === "loop" && loopPages.map((rowsPage, pageIndex) => {
          const pageOffset = pageIndex * LOOP_ROWS_PER_PAGE;
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === loopPages.length - 1;
          const pageHeader = createHeaderForPage(protocols.loopHeader, pageIndex, loopPages.length);

          return (
            <article className="mp-sheet" key={`loop-page-${pageIndex}`}>
              <SheetHeader protocolName="Pętla zwarcia" header={pageHeader} note="Badanie skuteczności ochrony przeciwporażeniowej" />
              <div className="mp-header-divider" />
              {isFirstPage ? (
                <>
                  <SectionHeading title="1. Dane techniczne i narzędzia" />
                  <div className="mp-form-row">
                    <InlineField label="Miernik:" value={protocols.loopMeterName} placeholder=".........................................." onChange={(v) => updateProtocols({ loopMeterName: v })} />
                    <InlineField label="Nr fabryczny:" value={protocols.loopMeterSerialNumber} placeholder=".........................................." onChange={(v) => updateProtocols({ loopMeterSerialNumber: v })} />
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-inline-field"><span>Napięcie sieci:</span><strong>230/400V</strong></div>
                    <div className="mp-inline-field"><span>Układ sieci:</span><strong>TN-S / TN-C-S</strong></div>
                  </div>
                  <SectionHeading title="2. Wyniki pomiarów impedancji pętli zwarcia" />
                </>
              ) : (
                <SectionHeading title={`2. Wyniki pomiarów impedancji pętli zwarcia (ciąg dalszy ${pageIndex + 1})`} />
              )}
              <table className="mp-table">
                <thead><tr><th>Lp.</th><th>Nazwa obwodu / punkt pomiarowy</th><th>Lokalizacja</th><th>Typ zabezp.</th><th>In [A]</th><th>Ia [A]</th><th>Zs [Ω] zmierzona</th><th>Zadm [Ω] dopuszcz.</th><th>Ocena</th></tr></thead>
                <tbody>
                  {rowsPage.map((row, localIndex) => {
                    const absoluteIndex = pageOffset + localIndex;
                    return (
                      <tr key={absoluteIndex}>
                        <td className="mp-index-cell">{row.index}</td>
                        <td><input className="mp-table-input" value={row.circuitName} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "circuitName", e.target.value)} /></td>
                        <td><input className="mp-table-input" value={row.location} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "location", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.protectionType} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "protectionType", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.ratedCurrent} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "ratedCurrent", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.tripCurrent} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "tripCurrent", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.measuredImpedance} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "measuredImpedance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.allowedImpedance} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "allowedImpedance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("loopImpedanceRows", absoluteIndex, "assessment", e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isLastPage && <div className="mp-legend">Legenda: In - prąd znamionowy zabezpieczenia, Ia - prąd wyłączenia, Zs - zmierzona impedancja pętli zwarcia, Zadm - dopuszczalna impedancja pętli zwarcia.</div>}
            </article>
          );
        })}

        {activeTab === "insulation" && insulationPages.map((rowsPage, pageIndex) => {
          const pageOffset = pageIndex * INSULATION_ROWS_PER_PAGE;
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === insulationPages.length - 1;
          const pageHeader = createHeaderForPage(protocols.insulationHeader, pageIndex, insulationPages.length);

          return (
            <article className="mp-sheet" key={`insulation-page-${pageIndex}`}>
              <SheetHeader protocolName="Rezystancja izolacji" header={pageHeader} note="Badanie rezystancji izolacji obwodów" />
              <div className="mp-header-divider" />
              {isFirstPage ? (
                <>
                  <SectionHeading title="1. Dane techniczne i narzędzia" />
                  <div className="mp-form-row">
                    <InlineField label="Miernik:" value={protocols.insulationMeterName} placeholder=".........................................." onChange={(v) => updateProtocols({ insulationMeterName: v })} />
                    <InlineField label="Nr fabryczny:" value={protocols.insulationMeterSerialNumber} placeholder=".........................................." onChange={(v) => updateProtocols({ insulationMeterSerialNumber: v })} />
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-inline-field"><span>Napięcie próby:</span><strong>{protocols.insulationTestVoltage || "500V"}</strong></div>
                  </div>
                  <SectionHeading title={`2. Wyniki pomiarów rezystancji izolacji (napięcie próby ${protocols.insulationTestVoltage || "500V"})`} />
                </>
              ) : (
                <SectionHeading title={`2. Wyniki pomiarów rezystancji izolacji (ciąg dalszy ${pageIndex + 1})`} />
              )}
              <table className="mp-table">
                <thead><tr><th>Lp.</th><th>Nazwa obwodu / punkt pomiarowy</th><th>Lokalizacja</th><th>L-N [MΩ]</th><th>L-PE [MΩ]</th><th>N-PE [MΩ]</th><th>Wymagana [MΩ]</th><th>Ocena</th></tr></thead>
                <tbody>
                  {rowsPage.map((row, localIndex) => {
                    const absoluteIndex = pageOffset + localIndex;
                    return (
                      <tr key={absoluteIndex}>
                        <td className="mp-index-cell">{row.index}</td>
                        <td><input className="mp-table-input" value={row.circuitName} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "circuitName", e.target.value)} /></td>
                        <td><input className="mp-table-input" value={row.location} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "location", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.lnResistance} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "lnResistance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.lpeResistance} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "lpeResistance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.npeResistance} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "npeResistance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.requiredResistance} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "requiredResistance", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("insulationRows", absoluteIndex, "assessment", e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isLastPage && (
                <>
                  <p style={{ fontSize: "10px", fontStyle: "italic", color: "#666", margin: "10px 0" }}>Uwaga: Wszystkie odbiorniki na czas pomiaru zostały odłączone.</p>
                  <div className="mp-legend">Legenda: L-N - przewód fazowy do neutralnego, L-PE - przewód fazowy do ochronnego, N-PE - przewód neutralny do ochronnego.</div>
                </>
              )}
            </article>
          );
        })}

        {activeTab === "rcd-ground" && (() => {
          const pageHeader = createHeaderForPage(protocols.rcdGroundHeader, 0, 1);
          const isFirstPage = true;
          const isLastPage = true;
          const pageIndex = 0;
          const pageOffset = 0;
          const rowsPage = protocols.rcdRows;

          return (
            <article className="mp-sheet" key="rcd-ground-page-single">
              <SheetHeader protocolName="RCD i uziemienie" header={pageHeader} note="Test wyłączników RCD i rezystancja uziemienia" />
              <div className="mp-header-divider" />
              {isFirstPage ? (
                <>
                  <SectionHeading title="1. Dane techniczne i narzędzia" />
                  <div className="mp-form-row">
                    <InlineField label="Miernik:" value={protocols.rcdGroundMeterName} placeholder=".........................................." onChange={(v) => updateProtocols({ rcdGroundMeterName: v })} />
                    <InlineField label="Nr fabryczny:" value={protocols.rcdGroundMeterSerialNumber} placeholder=".........................................." onChange={(v) => updateProtocols({ rcdGroundMeterSerialNumber: v })} />
                  </div>
                  <SectionHeading title="2. Badanie wyłączników różnicowoprądowych (RCD)" />
                </>
              ) : (
                <SectionHeading title={`2. Badanie wyłączników różnicowoprądowych (ciąg dalszy ${pageIndex + 1})`} />
              )}
              <table className="mp-table">
                <thead><tr><th>Lp.</th><th>Typ RCD</th><th>IΔn [mA]</th><th>Prąd wyzw. [mA]</th><th>Czas wyzw. [ms]</th><th>Przycisk TEST</th><th>Ocena</th></tr></thead>
                <tbody>
                  {rowsPage.map((row, localIndex) => {
                    const absoluteIndex = pageOffset + localIndex;
                    return (
                      <tr key={absoluteIndex}>
                        <td className="mp-index-cell">{row.index}</td>
                        <td><input className="mp-table-input" value={row.deviceType} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "deviceType", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.residualCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "residualCurrent", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.tripCurrent} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripCurrent", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.tripTimeMs} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "tripTimeMs", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.testButtonResult} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "testButtonResult", e.target.value)} /></td>
                        <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("rcdRows", absoluteIndex, "assessment", e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isLastPage && (
                <>
                  <div className="mp-legend">Legenda: IΔn - znamionowy prąd różnicowy, TEST - wynik działania przycisku testowego.</div>
                  <SectionHeading title="3. Pomiar rezystancji uziemienia (GSU)" />
                  <div className="mp-conclusion-box" style={{ marginBottom: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", gap: "8px" }}><span>Metoda pomiaru:</span><input style={{ border: 0, borderBottom: "1px dotted #000", flex: 1 }} value={protocols.groundMeasurementMethod} onChange={(e) => updateProtocols({ groundMeasurementMethod: e.target.value })} /></div>
                      <div style={{ display: "flex", gap: "8px" }}><span>Rodzaj uziomu:</span><input style={{ border: 0, borderBottom: "1px dotted #000", flex: 1 }} value={protocols.groundElectrodeType} onChange={(e) => updateProtocols({ groundElectrodeType: e.target.value })} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}><span>Zmierzona wartość Ru:</span><input style={{ border: 0, borderBottom: "1px dotted #000", width: "80px" }} value={protocols.groundMeasuredResistance} onChange={(e) => updateProtocols({ groundMeasuredResistance: e.target.value })} /><span>Ω</span></div>
                      <div style={{ display: "flex", gap: "8px" }}><span>Wartość wymagana:</span><input style={{ border: 0, borderBottom: "1px dotted #000", width: "80px" }} value={protocols.groundRequiredResistance} onChange={(e) => updateProtocols({ groundRequiredResistance: e.target.value })} /><span>Ω</span></div>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <strong>ORZECZENIE:</strong>
                      <textarea rows={2} value={protocols.groundConclusionText} onChange={(e) => updateProtocols({ groundConclusionText: e.target.value })} />
                    </div>
                  </div>
                  <div className="mp-legend" style={{ marginTop: "5px" }}>Legenda: GSU - główna szyna uziemiająca, Ru - zmierzona rezystancja uziemienia.</div>
                </>
              )}
            </article>
          );
        })()}
      </div>
    </div>
  );
}
