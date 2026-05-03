import type { CircuitRow } from "../types/circuitRow";
import {
  buildVisibleCircuitGroups,
  countHiddenCircuitRows,
} from "../lib/circuitRows";
import "./CircuitListPage.css";

type CircuitListPageProps = {
  rows: CircuitRow[];
  onResetDemo: () => void;
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

export function CircuitListPage({ rows, onResetDemo }: CircuitListPageProps) {
  const groups = buildVisibleCircuitGroups(rows);
  const hiddenCount = countHiddenCircuitRows(rows);
  const visibleCount = rows.length - hiddenCount;
  const totalPower = groups
    .flatMap((group) => group.rows)
    .reduce((sum, row) => sum + row.powerW, 0);

  return (
    <section className="cl-page">
      <header className="cl-hero">
        <div>
          <span className="cl-eyebrow">Obwody</span>
          <h2>Lista obwodów</h2>
          <p>
            Zestawienie obwodów z grupowaniem po lokalizacji, sortowaniem po pozycji oraz
            filtrowaniem elementów pomocniczych poza główną tabelą.
          </p>
        </div>

        <div className="cl-hero-actions">
          <button type="button" onClick={onResetDemo}>
            Przywróć dane przykładowe
          </button>
        </div>
      </header>

      <div className="cl-summary">
        <article className="cl-summary-card">
          <span>Widoczne po filtracji</span>
          <strong>{visibleCount}</strong>
        </article>
        <article className="cl-summary-card">
          <span>Ukryte elementy pomocnicze</span>
          <strong>{hiddenCount}</strong>
        </article>
        <article className="cl-summary-card">
          <span>Suma mocy obwodów</span>
          <strong>{formatNumber(totalPower)} W</strong>
        </article>
      </div>

      <div className="cl-grid">
        <section className="cl-table-area">
          <div className="cl-toolbar">
            <strong>Lista obwodów DINBoard</strong>
            <span>Filtr: bez RCD, kontrolek faz i listew / złączek / bloków pomocniczych.</span>
          </div>

          <div className="cl-table-shell">
            <div className="cl-table">
              <div className="cl-head">
                <span>Oznaczenie</span>
                <span>Etykieta</span>
                <span>Faza</span>
                <span>Zabezpieczenie</span>
                <span>Obwod</span>
                <span>Moc [W]</span>
                <span>Dlug. kabla [m]</span>
                <span>Przekroj [mm2]</span>
              </div>

              {groups.map((group) => (
                <section key={group.location} className="cl-group">
                  <header className="cl-group__header">{group.location}</header>
                  {group.rows.map((row) => (
                    <div key={row.id} className="cl-row">
                      <span>{row.referenceDesignation || "-"}</span>
                      <span>{row.label || "-"}</span>
                      <span>{row.phase || "-"}</span>
                      <span>{row.displayProtection || row.protectionType || "-"}</span>
                      <span className="cl-circuit-name">{row.circuitName || "-"}</span>
                      <span>{formatNumber(row.powerW)}</span>
                      <span>{formatNumber(row.cableLength)}</span>
                      <span>{formatNumber(row.cableCrossSection)}</span>
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
              <span className="cl-eyebrow">Reguly</span>
              <strong>Elementy poza tabela</strong>
            </div>
            <ul>
              <li>RCD jako zabezpieczenia grupowe</li>
              <li>Kontrolki faz</li>
              <li>Listwy, zlaczki, bloki i inne elementy pomocnicze</li>
            </ul>
          </article>

          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">Stan</span>
              <strong>Dane aktualnego projektu</strong>
            </div>
            <p>
              Lista czyta teraz bezposrednio dane wynikajace z aktualnych symboli projektu.
            </p>
            <p>Aktualny zestaw danych: {rows.length} rekordow.</p>
          </article>
        </aside>
      </div>
    </section>
  );
}
