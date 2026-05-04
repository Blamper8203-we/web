import {
  buildEditableMeasurementProtocols,
} from "../lib/measurementProtocols";
import type { CircuitRow } from "../types/circuitRow";
import type {
  MeasurementProtocolHeaderSettings,
  MeasurementProtocolsData,
  ProjectMetadata,
} from "../types/projectMetadata";
import "./MeasurementProtocolsWorkspacePage.css";

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
}: {
  header: MeasurementProtocolHeaderSettings;
  note: string;
}) {
  return (
    <header className="mp-sheet-header">
      <div className="mp-header-left">
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

export function MeasurementProtocolsWorkspacePage({
  metadata,
  circuitRows,
  onChange,
  activeTab,
}: MeasurementProtocolsWorkspacePageProps) {
  const protocols = buildEditableMeasurementProtocols(metadata, circuitRows);

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

  const updateMetadata = (patch: Partial<ProjectMetadata>) => {
    onChange({
      ...metadata,
      ...patch,
      dateModified: new Date().toISOString(),
    });
  };

  const updateTableRow = <K extends keyof MeasurementProtocolsData>(
    key: K,
    index: number,
    field: string,
    value: string,
  ) => {
    const rows = protocols[key] as any[];
    const nextRows = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    updateProtocols({ [key]: nextRows } as any);
  };

  return (
    <div className="mp-page" style={{ 
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: '#1a1a1a',
      lineHeight: 1.4
    }}>
      <div className="mp-stage">
        <article className="mp-sheet">
          {activeTab === "title-page" ? (
            <>
              <div className="tp-header">
                <div className="tp-logo-box">LOGO</div>
                <div className="tp-header-title">
                  <h2>Dokumentacja Powykonawcza</h2>
                  <p>ZGODNOŚĆ Z NORMĄ PN-HD 60364</p>
                </div>
                <div className="tp-header-meta">
                  <div>NR PROTOKOŁU: {metadata.projectNumber || "...."} / 2026</div>
                  <div>Data: {metadata.drawingDate || "2026-04-11"}</div>
                </div>
              </div>

              <div className="tp-main-title">
                <h1>Oświadczenie Wykonawcy</h1>
                <p>instalacji elektrycznej wykonanej zgodnie z przepisami</p>
              </div>

              <div className="tp-info-box">
                <h3>Informacje o obiekcie</h3>
                <div className="tp-info-grid">
                  <span className="tp-info-label">Rodzaj:</span>
                  <div className="tp-info-value">{metadata.titlePageObjectType || "Nowy projekt"}</div>
                  
                  <span className="tp-info-label">Adres:</span>
                  <input 
                    className="tp-info-value" 
                    value={metadata.address || ""} 
                    placeholder="...................................................................................................."
                    onChange={(e) => updateMetadata({ address: e.target.value })}
                    style={{ border: 0, padding: 0, background: 'transparent', width: '100%' }}
                  />
                  
                  <span className="tp-info-label">Inwestor:</span>
                  <input 
                    className="tp-info-value" 
                    value={metadata.investor || ""} 
                    placeholder="...................................................................................................."
                    onChange={(e) => updateMetadata({ investor: e.target.value })}
                    style={{ border: 0, padding: 0, background: 'transparent', width: '100%' }}
                  />
                </div>
              </div>

              <div className="tp-grid-2">
                <div className="tp-info-box">
                  <h3>Zakres prac</h3>
                  <div className="tp-check-list">
                    <div className="tp-check-item">
                      <div className="tp-checkbox">X</div>
                      <span>Montaż rozdzielnicy głównej</span>
                    </div>
                    <div className="tp-check-item">
                      <div className="tp-checkbox">X</div>
                      <span>Układanie przewodów i osprzętu</span>
                    </div>
                    <div className="tp-check-item">
                      <div className="tp-checkbox">X</div>
                      <span>Pomiary ochrony przeciwporażeniowej</span>
                    </div>
                  </div>
                </div>

                <div className="tp-info-box">
                  <h3>Załączniki</h3>
                  <ul className="tp-attachment-list">
                    <li>- Protokoły z pomiarów</li>
                    <li>- Schemat rozdzielnicy</li>
                    <li>- Uprawnienia wykonawcy</li>
                  </ul>
                </div>
              </div>

              <div className="tp-grid-2">
                <div className="tp-info-box">
                  <h3>Wykonawca / Instalator</h3>
                  <div style={{ marginTop: '10px', fontFamily: 'inherit' }}>
                    <input 
                      className="tp-info-value" 
                      value={metadata.contractor || ""} 
                      placeholder="..................................................."
                      onChange={(e) => updateMetadata({ contractor: e.target.value })}
                      style={{ border: 0, padding: 0, background: 'transparent', width: '100%', fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}
                    />
                    <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Dokumentacja odbiorowa instalacji elektrycznej</p>
                  </div>
                </div>

                <div className="tp-info-box">
                  <h3>Uprawnienia SEP</h3>
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 5px', color: '#1e40af', fontWeight: 700 }}>Kwalifikacje: E + D</p>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11px' }}>Nr:</span>
                      <input 
                        className="tp-info-value" 
                        value={metadata.authorLicense || ""} 
                        placeholder="................................"
                        onChange={(e) => updateMetadata({ authorLicense: e.target.value })}
                        style={{ border: 0, padding: 0, background: 'transparent', flex: 1 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline', marginTop: '5px' }}>
                      <span style={{ fontSize: '11px' }}>Ważne do:</span>
                      <input 
                        className="tp-info-value" 
                        value={metadata.titlePageSepValidUntil || ""} 
                        placeholder="........................"
                        onChange={(e) => updateMetadata({ titlePageSepValidUntil: e.target.value })}
                        style={{ border: 0, padding: 0, background: 'transparent', flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="tp-signatures" style={{ marginTop: '40px' }}>
                <div className="tp-sig-line">Podpis Inwestora</div>
                <div className="tp-stamp-box">Pieczątka wykonawcy</div>
                <div className="tp-sig-line">Podpis Elektryka</div>
              </div>

              <div className="tp-bottom-note">
                Instalacja została wykonana zgodnie z projektem (jeśli dotyczy), przepisami oraz normą PN-HD 60364. Pomiary wykazały skuteczność zastosowanych środków ochrony.
              </div>
            </>
          ) : null}

          {activeTab === "continuity" ? (
            <>
              <SheetHeader
                header={protocols.continuityHeader}
                note="Badanie ciągłości przewodów PE i połączeń wyrównawczych"
              />
              <div className="mp-header-divider" />

              <SectionHeading title="1. Dane techniczne i narzędzia" />
              <div className="mp-form-row">
                <InlineField
                  label="Miernik:"
                  value={protocols.continuityMeterName}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ continuityMeterName: v })}
                />
                <InlineField
                  label="Nr fabryczny:"
                  value={protocols.continuityMeterSerialNumber}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ continuityMeterSerialNumber: v })}
                />
              </div>
              <div className="mp-form-row">
                <div className="mp-inline-field">
                  <span>Prąd pomiarowy:</span>
                  <strong>{">= 200 mA"}</strong>
                </div>
              </div>

              <SectionHeading title="2. Wyniki badania ciągłości" />
              <table className="mp-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>Lp.</th>
                    <th>Nazwa obwodu / element</th>
                    <th>Lokalizacja</th>
                    <th>Badany przewód / połączenie</th>
                    <th>Wynik [Ω]</th>
                    <th>Ocena</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.continuityRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="mp-index-cell">{row.index}</td>
                      <td>
                        <input
                          className="mp-table-input"
                          value={row.circuitName}
                          onChange={(e) => updateTableRow("continuityRows", idx, "circuitName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="mp-table-input"
                          value={row.location}
                          onChange={(e) => updateTableRow("continuityRows", idx, "location", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="mp-table-input"
                          value={row.connectionType}
                          onChange={(e) => updateTableRow("continuityRows", idx, "connectionType", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="mp-table-input mp-table-input--center"
                          value={row.measuredResistance}
                          onChange={(e) => updateTableRow("continuityRows", idx, "measuredResistance", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="mp-table-input mp-table-input--center"
                          value={row.assessment}
                          onChange={(e) => updateTableRow("continuityRows", idx, "assessment", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mp-legend">
                Legenda: PE - przewód ochronny, połączenie wyrównawcze - połączenie ochronne między częściami przewodzącymi.
              </div>
            </>
          ) : null}

          {activeTab === "loop" ? (
            <>
              <SheetHeader
                header={protocols.loopHeader}
                note="Badanie skuteczności ochrony przeciwporażeniowej"
              />
              <div className="mp-header-divider" />

              <SectionHeading title="1. Dane techniczne i narzędzia" />
              <div className="mp-form-row">
                <InlineField
                  label="Miernik:"
                  value={protocols.loopMeterName}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ loopMeterName: v })}
                />
                <InlineField
                  label="Nr fabryczny:"
                  value={protocols.loopMeterSerialNumber}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ loopMeterSerialNumber: v })}
                />
              </div>
              <div className="mp-form-row">
                <div className="mp-inline-field">
                  <span>Napięcie sieci:</span>
                  <strong>230/400V</strong>
                </div>
                <div className="mp-inline-field">
                  <span>Układ sieci:</span>
                  <strong>TN-S / TN-C-S</strong>
                </div>
              </div>

              <SectionHeading title="2. Wyniki pomiarów impedancji pętli zwarcia" />
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>Nazwa obwodu / punkt pomiarowy</th>
                    <th>Lokalizacja</th>
                    <th>Typ zabezp.</th>
                    <th>In [A]</th>
                    <th>Ia [A]</th>
                    <th>Zs [Ω] zmierzona</th>
                    <th>Zadm [Ω] dopuszcz.</th>
                    <th>Ocena</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.loopImpedanceRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="mp-index-cell">{row.index}</td>
                      <td><input className="mp-table-input" value={row.circuitName} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "circuitName", e.target.value)} /></td>
                      <td><input className="mp-table-input" value={row.location} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "location", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.protectionType} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "protectionType", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.ratedCurrent} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "ratedCurrent", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.tripCurrent} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "tripCurrent", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.measuredImpedance} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "measuredImpedance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.allowedImpedance} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "allowedImpedance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("loopImpedanceRows", idx, "assessment", e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mp-legend">
                Legenda: In - prąd znamionowy zabezpieczenia, Ia - prąd wyłączenia, Zs - zmierzona impedancja pętli zwarcia, Zadm - dopuszczalna impedancja pętli zwarcia.
              </div>
            </>
          ) : null}

          {activeTab === "insulation" ? (
            <>
              <SheetHeader
                header={protocols.insulationHeader}
                note="Badanie rezystancji izolacji obwodów"
              />
              <div className="mp-header-divider" />

              <SectionHeading title="1. Dane techniczne i narzędzia" />
              <div className="mp-form-row">
                <InlineField
                  label="Miernik:"
                  value={protocols.insulationMeterName}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ insulationMeterName: v })}
                />
                <InlineField
                  label="Nr fabryczny:"
                  value={protocols.insulationMeterSerialNumber}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ insulationMeterSerialNumber: v })}
                />
              </div>
              <div className="mp-form-row">
                <div className="mp-inline-field">
                  <span>Napięcie próby:</span>
                  <strong>{protocols.insulationTestVoltage || "500V"}</strong>
                </div>
              </div>

              <SectionHeading title={`2. Wyniki pomiarów rezystancji izolacji (napięcie próby ${protocols.insulationTestVoltage || "500V"})`} />
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>Nazwa obwodu / punkt pomiarowy</th>
                    <th>Lokalizacja</th>
                    <th>L-N [MΩ]</th>
                    <th>L-PE [MΩ]</th>
                    <th>N-PE [MΩ]</th>
                    <th>Wymagana [MΩ]</th>
                    <th>Ocena</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.insulationRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="mp-index-cell">{row.index}</td>
                      <td><input className="mp-table-input" value={row.circuitName} onChange={(e) => updateTableRow("insulationRows", idx, "circuitName", e.target.value)} /></td>
                      <td><input className="mp-table-input" value={row.location} onChange={(e) => updateTableRow("insulationRows", idx, "location", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.lnResistance} onChange={(e) => updateTableRow("insulationRows", idx, "lnResistance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.lpeResistance} onChange={(e) => updateTableRow("insulationRows", idx, "lpeResistance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.npeResistance} onChange={(e) => updateTableRow("insulationRows", idx, "npeResistance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.requiredResistance} onChange={(e) => updateTableRow("insulationRows", idx, "requiredResistance", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("insulationRows", idx, "assessment", e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '10px', fontStyle: 'italic', color: '#666', margin: '10px 0' }}>
                Uwaga: Wszystkie odbiorniki na czas pomiaru zostały odłączone.
              </p>
              <div className="mp-legend">
                Legenda: L-N - przewód fazowy do neutralnego, L-PE - przewód fazowy do ochronnego, N-PE - przewód neutralny do ochronnego.
              </div>
            </>
          ) : null}

          {activeTab === "rcd-ground" ? (
            <>
              <SheetHeader
                header={protocols.rcdGroundHeader}
                note="Test wyłączników RCD i rezystancja uziemienia"
              />
              <div className="mp-header-divider" />

              <SectionHeading title="1. Dane techniczne i narzędzia" />
              <div className="mp-form-row">
                <InlineField
                  label="Miernik:"
                  value={protocols.rcdGroundMeterName}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ rcdGroundMeterName: v })}
                />
                <InlineField
                  label="Nr fabryczny:"
                  value={protocols.rcdGroundMeterSerialNumber}
                  placeholder=".........................................."
                  onChange={(v) => updateProtocols({ rcdGroundMeterSerialNumber: v })}
                />
              </div>

              <SectionHeading title="2. Badanie wyłączników różnicowoprądowych (RCD)" />
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>Typ RCD</th>
                    <th>IΔn [mA]</th>
                    <th>Prąd wyzw. [mA]</th>
                    <th>Czas wyzw. [ms]</th>
                    <th>Przycisk TEST</th>
                    <th>Ocena</th>
                  </tr>
                </thead>
                <tbody>
                  {protocols.rcdRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="mp-index-cell">{row.index}</td>
                      <td><input className="mp-table-input" value={row.deviceType} onChange={(e) => updateTableRow("rcdRows", idx, "deviceType", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.residualCurrent} onChange={(e) => updateTableRow("rcdRows", idx, "residualCurrent", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.tripCurrent} onChange={(e) => updateTableRow("rcdRows", idx, "tripCurrent", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.tripTimeMs} onChange={(e) => updateTableRow("rcdRows", idx, "tripTimeMs", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.testButtonResult} onChange={(e) => updateTableRow("rcdRows", idx, "testButtonResult", e.target.value)} /></td>
                      <td><input className="mp-table-input mp-table-input--center" value={row.assessment} onChange={(e) => updateTableRow("rcdRows", idx, "assessment", e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mp-legend">
                Legenda: IΔn - znamionowy prąd różnicowy, TEST - wynik działania przycisku testowego.
              </div>

              <SectionHeading title="3. Pomiar rezystancji uziemienia (GSU)" />
              <div className="mp-conclusion-box" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>Metoda pomiaru:</span>
                    <input style={{ border: 0, borderBottom: '1px dotted #000', flex: 1 }} value={protocols.groundMeasurementMethod} onChange={(e) => updateProtocols({ groundMeasurementMethod: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>Rodzaj uziomu:</span>
                    <input style={{ border: 0, borderBottom: '1px dotted #000', flex: 1 }} value={protocols.groundElectrodeType} onChange={(e) => updateProtocols({ groundElectrodeType: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>Zmierzona wartość Ru:</span>
                    <input style={{ border: 0, borderBottom: '1px dotted #000', width: '80px' }} value={protocols.groundMeasuredResistance} onChange={(e) => updateProtocols({ groundMeasuredResistance: e.target.value })} />
                    <span>Ω</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>Wartość wymagana:</span>
                    <input style={{ border: 0, borderBottom: '1px dotted #000', width: '80px' }} value={protocols.groundRequiredResistance} onChange={(e) => updateProtocols({ groundRequiredResistance: e.target.value })} />
                    <span>Ω</span>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <strong>ORZECZENIE:</strong>
                  <textarea
                    rows={3}
                    value={protocols.groundConclusionText}
                    onChange={(e) => updateProtocols({ groundConclusionText: e.target.value })}
                  />
                </div>
              </div>

              <SectionHeading title="4. Zalecenia po pomiarach" />
              <div className="mp-conclusion-box">
                <textarea
                  rows={4}
                  value={protocols.recommendationsText}
                  onChange={(e) => updateProtocols({ recommendationsText: e.target.value })}
                />
              </div>
              <div className="mp-legend" style={{ marginTop: '5px' }}>
                Legenda: GSU - główna szyna uziemiająca, Ru - zmierzona rezystancja uziemienia.
              </div>
            </>
          ) : null}

          {activeTab !== "title-page" && (
            <div className="mp-footer-info">
              Strona 10 z 13
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
