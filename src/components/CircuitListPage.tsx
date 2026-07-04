import { useTranslation } from "react-i18next";
import type { CircuitRow } from "../types/circuitRow";
import {
  buildVisibleCircuitGroups,
  countHiddenCircuitRows,
} from "../lib/circuitRows";
import { EmptyState } from "./EmptyState";
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
  const { t } = useTranslation();
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
          <span className="cl-eyebrow">{t("auto.obwody_804", "Obwody")}</span>
          <h2>{t("auto.listaobwodw_363", "Lista obwodów")}</h2>
          <p>
            Zestawienie obwodów z grupowaniem po lokalizacji, sortowaniem po pozycji
            oraz filtrowaniem elementów pomocniczych poza główną tabelą.
          </p>
        </div>
      </header>

      <div className="cl-summary">
        <article className="cl-summary-card cl-summary-card--visible">
          <span>{t("auto.widocznepofiltr_118", "Widoczne po filtracji")}</span>
          <strong>{visibleCount}</strong>
        </article>
        <article className="cl-summary-card cl-summary-card--hidden">
          <span>{t("auto.ukryteelementyp_979", "Ukryte elementy pomocnicze")}</span>
          <strong>{hiddenCount}</strong>
        </article>
        <article className="cl-summary-card cl-summary-card--power">
          <span>{t("auto.sumamocyobwodw_598", "Suma mocy obwodów")}</span>
          <strong>{formatNumber(totalPower)} W</strong>
        </article>
      </div>

      <div className="cl-grid">
        <section className="cl-table-area">
          <div className="cl-toolbar">
            <strong>{t("auto.listaobwodwdinb_136", "Lista obwodów DINBoard")}</strong>
            <span>{t("auto.filtrbezrcdkont_590", "Filtr: bez RCD, kontrolek faz i elementów pomocniczych.")}</span>
          </div>

          <div className="cl-table-shell">
            <div className="cl-table">
              <div className="cl-head">
                <span>{t("auto.oznaczenie_317", "Oznaczenie")}</span>
                <span>{t("auto.etykieta_547", "Etykieta")}</span>
                <span>{t("auto.faza_126", "Faza")}</span>
                <span>{t("auto.zabezpieczenie_39", "Zabezpieczenie")}</span>
                <span>{t("auto.obwd_43", "Obwód")}</span>
                <span>{t("auto.mocw_533", "Moc [W]")}</span>
                <span>{t("auto.dugkablam_983", "Dług. kabla [m]")}</span>
                <span>{t("auto.przekrjmm2_436", "Przekrój [mm2]")}</span>
              </div>

              {visibleCount === 0 ? (
                <EmptyState
                  icon="list"
                  title={t("app.circuitList.emptyState.title", "Lista obwodów jest pusta")}
                  description={t("app.circuitList.emptyState.desc", "Dodaj moduły z zabezpieczeniami (jak wyłączniki nadprądowe) na szynie DIN w pierwszej zakładce, aby automatycznie utworzyć listę obwodów.")}
                  style={{ minHeight: "400px" }}
                />
              ) : (
                groups.map((group) => (
                  <section key={group.location} className="cl-group">
                    {group.location && (
                      <h3 className="cl-location-header">{group.location}</h3>
                    )}

                    {group.rcdGroups.map((rcdGroup) => (
                      <div key={rcdGroup.id} className="cl-rcd-group">
                        {rcdGroup.rcd && (
                          <div className="cl-rcd-header">
                            <span className="cl-designation">{rcdGroup.rcd.referenceDesignation}</span>
                            <span className="cl-label">{rcdGroup.rcd.label}</span>
                            <span className="cl-phase cl-phase--group">
                              {t("auto.grupa_576", "Grupa")}
                            </span>
                            <span className="cl-protection">
                              {rcdGroup.rcd.displayProtection}
                            </span>
                            <span className="cl-circuit-name" style={{ color: "#FF5E5E" }}>
                              {rcdGroup.rcd.circuitName}
                            </span>
                            <span>—</span>
                            <span>—</span>
                            <span>—</span>
                          </div>
                        )}

                        <div className="cl-rows">
                          {rcdGroup.rows.map((row) => (
                            <div key={row.id} className="cl-row">
                              <span className="cl-designation">{row.referenceDesignation}</span>
                              <span className="cl-label">{row.label}</span>
                              <span className={`cl-phase cl-phase--${row.phase}`}>
                                {row.phase}
                              </span>
                              <span className="cl-protection">{row.displayProtection}</span>
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
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="cl-side">
          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">{t("auto.kolumny_141", "Kolumny")}</span>
              <strong>{t("auto.zakreswidoku_548", "Zakres widoku")}</strong>
            </div>
            <ul>
              <li>ReferenceDesignation</li>
              <li>Label</li>
              <li>{t("auto.phase_30", "Phase")}</li>
              <li>{t("auto.displayprotecti_378", "DisplayProtection")}</li>
              <li>{t("auto.circuitname_313", "CircuitName")}</li>
              <li>{t("auto.powerw_474", "PowerW")}</li>
              <li>{t("auto.cablelength_270", "CableLength")}</li>
              <li>{t("auto.cablecrosssecti_829", "CableCrossSection")}</li>
            </ul>
          </article>

          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">{t("auto.reguy_33", "Reguły")}</span>
              <strong>{t("auto.elementypozatab_757", "Elementy poza tabelą")}</strong>
            </div>
            <ul>
              <li>{t("auto.rcdjakozabezpie_155", "RCD jako zabezpieczenia grupowe")}</li>
              <li>{t("auto.kontrolkifaz_905", "Kontrolki faz")}</li>
              <li>{t("auto.listwyzczkiiele_347", "Listwy, złączki i elementy pomocnicze")}</li>
            </ul>
          </article>

          <article className="cl-panel">
            <div className="cl-panel__header">
              <span className="cl-eyebrow">{t("auto.stan_373", "Stan")}</span>
              <strong>{t("auto.daneaktualnegoz_178", "Dane aktualnego zlecenia")}</strong>
            </div>
            <p>{t("auto.listaczytadaneb_90", "Lista czyta dane bezpośrednio z aktualnych symboli rozdzielnicy.")}</p>
            <p>Aktualny zestaw danych: {rows.length} rekordów.</p>
          </article>
        </aside>
      </div>
    </section>
  );
}
