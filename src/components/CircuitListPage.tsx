import type { CircuitRow } from "../types/circuitRow";
import {
  buildVisibleCircuitGroups,
  countHiddenCircuitRows,
} from "../lib/circuitRows";
import "./CircuitListPage.css";

type CircuitListPageProps = {
  rows: CircuitRow[];
};

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("pl-PL");
  }

  return value.toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function CircuitListPage({ rows }: CircuitListPageProps) {
  const groups = buildVisibleCircuitGroups(rows);
  const hiddenCount = countHiddenCircuitRows(rows);
  const visibleCount = rows.length - hiddenCount;
  const totalPower = groups
    .flatMap((group) => group.rcdGroups.flatMap((rg) => rg.rows))
    .reduce((sum, row) => sum + row.powerW, 0);

  return (
    <section className="cl-page">
      <header className="cl-hero">
        <div>
          <span className="cl-eyebrow">Obwody</span>
          <h2>Lista obwodów</h2>
          <p>
            Zestawienie obwodów z grupowaniem po lokalizacji, sortowaniem po pozycji
            oraz filtrowaniem elementów pomocniczych poza główną tabelą.
          </p>
        </div>
      </header>

      <div className="cl-summary">
        <article className="cl-summary-card cl-summary-card--visible">
          <span>Widoczne po filtracji</span>
          <strong>{visibleCount}</strong>
        </article>
        <article className="cl-summary-card cl-summary-card--hidden">
          <span>Ukryte elementy pomocnicze</span>
          <strong>{hiddenCount}</strong>
        </article>
        <article className="cl-summary-card cl-summary-card--power">
          <span>Suma mocy obwodów</span>
          <strong>{formatNumber(totalPower)} W</strong>
        </article>
      </div>

      <div className="cl-grid">
        <section className="cl-table-area">
          <div className="cl-toolbar">
            <strong>Lista obwodów DINBoard</strong>
            <span>Filtr: bez RCD, kontrolek faz i elementów pomocniczych.</span>
          </div>

          <div className="cl-table-shell">
            <div className="cl-table">
              <div className="cl-head">
                <span>Oznaczenie</span>
                <span>Etykieta</span>
                <span>Faza</span>
                <span>Zabezpieczenie</span>
                <span>Obwód</span>
                <span>Moc [W]</span>
                <span>Dług. kabla [m]</span>
                <span>Przekrój [mm2]</span>
              </div>

              {groups.map((group) => (
                <section key={group.location} className="cl-group">
                  <header className="cl-group__header">{group.location}</header>
                  {group.rcdGroups.map((rcdGroup) => (
                    <div key={rcdGroup.id} className="cl-rcd-group">
                      {rcdGroup.rcd && (
                        <div className="cl-rcd-header">
                          <span className="cl-rcd-badge">{rcdGroup.rcd.displayProtection || rcdGroup.rcd.protectionType || "RCD"}</span>
                          <span className="cl-rcd-label">{rcdGroup.rcd.label || "Zabezpieczenie grupowe"}</span>
                          <span className="cl-rcd-phase">({rcdGroup.rcd.phase || "-"})</span>
                        </div>
                      )}
                      <div className="cl-rcd-children">
                        {rcdGroup.rows.map((row) => (
                          <div key={row.id} className={`cl-row ${rcdGroup.rcd ? "cl-row--nested" : ""}`}>
                            <span>{row.referenceDesignation || "-"}</span>
                            <span>{row.label || "-"}</span>
                            <span className="cl-cell-center"><span className="cl-chip cl-chip--phase">{row.phase || "-"}</span></span>
                            <span className="cl-cell-center"><span className="cl-chip cl-chip--protection">{row.displayProtection || row.protectionType || "-"}</span></span>
                            <span className="cl-circuit-name">{row.circuitName || "-"}</span>
                            <span>{formatNumber(row.powerW)}</span>
                            <span>{formatNumber(row.cableLength)}</span>
                            <span>{formatNumber(row.cableCrossSection)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>

        <aside className="cl-side">
          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">Kolumny</span>
              <strong>Zakres widoku</strong>
            </div>
            <ul>
              <li>ReferenceDesignation</li>
              <li>Label</li>
              <li>Phase</li>
              <li>DisplayProtection</li>
              <li>CircuitName</li>
              <li>PowerW</li>
              <li>CableLength</li>
              <li>CableCrossSection</li>
            </ul>
          </article>

          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">Reguły</span>
              <strong>Elementy poza tabelą</strong>
            </div>
            <ul>
              <li>RCD jako zabezpieczenia grupowe</li>
              <li>Kontrolki faz</li>
              <li>Listwy, złączki i elementy pomocnicze</li>
            </ul>
          </article>

          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">Stan</span>
              <strong>Dane aktualnego zlecenia</strong>
            </div>
            <p>Lista czyta dane bezpośrednio z aktualnych symboli rozdzielnicy.</p>
            <p>Aktualny zestaw danych: {rows.length} rekordów.</p>
          </article>
        </aside>
      </div>
    </section>
  );
}
