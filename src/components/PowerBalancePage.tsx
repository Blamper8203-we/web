import "./PowerBalancePage.css";
import { useState } from "react";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import { buildPhaseBalanceRows, type PhaseBalanceRow } from "../lib/phaseDistribution/phaseBalanceRows";
import { buildPhaseMoveSuggestions, type PhaseMoveSuggestion } from "../lib/phaseDistribution/phaseBalanceSuggestions";
import { buildPhaseImbalanceInsights } from "../lib/phaseDistribution/phaseImbalanceInsights";
import {
  calculateTotalDistribution,
  type BalanceMode,
  type BalanceScope,
} from "../lib/phaseDistribution/phaseDistributionCalculator";
import { AppIcon } from "./AppIcon";

export type BalanceApplyResult = {
  message: string;
  details?: Array<{ id: string; label: string; fromPhase: string; toPhase: string }>;
  severity?: "improved" | "neutral" | "worse";
};

export type BalanceApplyHandler = (
  mode: BalanceMode,
  scope: BalanceScope,
  previewOnly?: boolean,
) => BalanceApplyResult;

export type PhaseMoveApplyHandler = (symbolId: string, toPhase: "L1" | "L2" | "L3") => void;

interface PowerBalancePageProps {
  symbols: SymbolItem[];
  onApplyBalance: BalanceApplyHandler;
  onApplyPhaseMove: PhaseMoveApplyHandler;
  metadata: ProjectMetadata;
}

export function PowerBalancePage({ symbols, onApplyBalance, onApplyPhaseMove, metadata }: PowerBalancePageProps) {
  const distribution = calculateTotalDistribution(symbols);
  const totalPower = distribution.l1PowerW + distribution.l2PowerW + distribution.l3PowerW;
  // WHY: phase-card fill bar must be scaled against the HEAVIEST phase, not
  // the sum of all three. With an ideal 10/10/10 A balance, scaling against
  // the sum (30 A) would show 33% fill on every card — visually identical to
  // a barely-loaded installation. Scaling against max(L1,L2,L3) makes a
  // perfect balance show 100% on every card and an asymmetric balance show
  // 100% on the heaviest phase with the others proportional.
  const maxPhaseCurrent = Math.max(
    distribution.l1CurrentA,
    distribution.l2CurrentA,
    distribution.l3CurrentA,
    1,
  );
  const simultaneityFactor = Math.max(0.1, Math.min(1, metadata.simultaneityFactor));
  const calculatedPower = totalPower * simultaneityFactor;
  const connectionPower = Math.max(0, metadata.contractedPowerKw) * 1000;
  const connectionUsage = connectionPower > 0 ? (calculatedPower / connectionPower) * 100 : 0;
  const reservePower = connectionPower - calculatedPower;
  const imbalance = distribution.imbalancePercent;
  const imbalanceClass = imbalance > 30 ? "critical" : imbalance > 15 ? "warning" : "ok";
  const balanceRows = buildPhaseBalanceRows(symbols, metadata.supplyVoltageV);
  const imbalanceInsights = buildPhaseImbalanceInsights(balanceRows);
  const moveSuggestions = buildPhaseMoveSuggestions(balanceRows);

  return (
    <div className="power-balance-page">
      <div className="section-header">BILANS MOCY</div>

      <div className="card pb-summary-card">
        <div className="pb-summary-row">
          <span>
            <AppIcon className="accent-primary" name="validation" size={14} />
            Moc zainstalowana
          </span>
          <strong>{(totalPower / 1000).toFixed(2)} kW</strong>
        </div>
        <div className="pb-divider" />
        <div className="pb-summary-row">
          <span>
            <AppIcon className="accent-green" name="balance" size={14} />
            Moc obliczeniowa
          </span>
          <strong>{(calculatedPower / 1000).toFixed(2)} kW</strong>
        </div>
        <div className="pb-divider" />
        <div className="pb-summary-row">
          <span>
            <AppIcon className="accent-primary" name="balance" size={14} />
            Współczynnik jednoczesności
          </span>
          <strong>{simultaneityFactor.toFixed(2)}</strong>
        </div>
      </div>

      <div className="card pb-connection-card">
        <div className="section-header">MOC PRZYŁĄCZENIOWA VS BILANS</div>
        <PowerMetric label="Moc przyłączeniowa" value={`${(connectionPower / 1000).toFixed(2)} kW`} />
        <PowerMetric label="Moc obliczeniowa" value={`${(calculatedPower / 1000).toFixed(2)} kW`} />
        <PowerMetric label="Wykorzystanie mocy" value={`${connectionUsage.toFixed(1)}%`} />
        <PowerMetric label="Rezerwa mocy" value={`${(reservePower / 1000).toFixed(2)} kW`} />
        <div className={`pb-status ${reservePower >= 0 ? "ok" : "critical"}`}>
          <AppIcon name={reservePower >= 0 ? "check" : "validation"} size={14} />
          <span>{reservePower >= 0 ? "Bilans mieści się w mocy przyłączeniowej" : "Przekroczono moc przyłączeniową"}</span>
        </div>
      </div>

      <div className="section-header">BILANS FAZ</div>
      <div className="card pb-phases">
        <PhaseCard
          color="brown"
          label="L1"
          maxCurrent={maxPhaseCurrent}
          power={distribution.l1PowerW}
          current={distribution.l1CurrentA}
        />
        <PhaseCard
          color="black"
          label="L2"
          maxCurrent={maxPhaseCurrent}
          power={distribution.l2PowerW}
          current={distribution.l2CurrentA}
        />
        <PhaseCard
          color="gray"
          label="L3"
          maxCurrent={maxPhaseCurrent}
          power={distribution.l3PowerW}
          current={distribution.l3CurrentA}
        />
      </div>

      <div className={`card pb-imbalance ${imbalanceClass}`}>
        <span>Asymetria faz</span>
        <strong>{imbalance.toFixed(1)}%</strong>
      </div>

      <PhaseBalanceTable rows={balanceRows} />
      <ImbalanceInsightsCard insights={imbalanceInsights} />
      <PhaseMoveSuggestionsCard suggestions={moveSuggestions} onApplyPhaseMove={onApplyPhaseMove} />

      <AutoBalanceSection symbols={symbols} onApplyBalance={onApplyBalance} />
    </div>
  );
}

function PowerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="pb-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PhaseCard({
  label,
  power,
  current,
  maxCurrent,
  color,
}: {
  label: string;
  power: number;
  current: number;
  maxCurrent: number;
  color: "brown" | "black" | "gray";
}) {
  const fillPercent = Math.min(100, Math.max(3, (current / maxCurrent) * 100));

  return (
    <div className={`pb-phase-card ${color}`}>
      <div className="pb-phase-line">
        <span className="pb-phase-label">{label}</span>
        <strong>{current.toFixed(1)} A</strong>
      </div>
      <div className="pb-phase-track">
        <div className="pb-phase-fill" data-testid="pb-phase-fill" style={{ width: `${fillPercent}%` }} />
      </div>
      <span className="pb-phase-power">{power.toFixed(0)} W</span>
    </div>
  );
}

function PhaseBalanceTable({ rows }: { rows: PhaseBalanceRow[] }) {
  return (
    <section className="card pb-circuit-table-card">
      <div className="section-header">OBCIĄŻENIA OBWODÓW</div>
      {rows.length === 0 ? (
        <p className="pb-circuit-empty">Brak obwodów MCB/RCBO do bilansu.</p>
      ) : (
        <div className="pb-circuit-table-wrap">
          <table className="pb-circuit-table">
            <thead>
              <tr>
                <th>Ozn.</th>
                <th>Obwód</th>
                <th>Faza</th>
                <th>Moc</th>
                <th>Prąd</th>
                <th>Blok.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="pb-circuit-ref">{row.referenceDesignation}</td>
                  <td className="pb-circuit-name">{row.circuitName}</td>
                  <td>
                    <span className={`pb-phase-chip ${phaseClass(row.phase)}`}>{row.phase}</span>
                  </td>
                  <td>{formatPower(row.powerW)}</td>
                  <td>{row.currentA.toFixed(1)} A</td>
                  <td>{row.isPhaseLocked ? "Tak" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatPower(powerW: number): string {
  if (powerW >= 1000) {
    return `${(powerW / 1000).toFixed(2)} kW`;
  }

  return `${powerW.toFixed(0)} W`;
}

function phaseClass(phase: string): string {
  const normalized = phase.toUpperCase();
  if (normalized === "L2") return "l2";
  if (normalized === "L3") return "l3";
  if (normalized.includes("+")) return "multi";
  return "l1";
}

function ImbalanceInsightsCard({
  insights,
}: {
  insights: ReturnType<typeof buildPhaseImbalanceInsights>;
}) {
  if (!insights.heaviestPhase || insights.spreadW <= 0) {
    return (
      <section className="card pb-insights-card">
        <div className="section-header">ANALIZA ASYMETRII</div>
        <p className="pb-circuit-empty">Brak dominującej fazy w obwodach jednofazowych.</p>
      </section>
    );
  }

  return (
    <section className="card pb-insights-card">
      <div className="section-header">ANALIZA ASYMETRII</div>
      <div className="pb-insight-summary">
        <span>Najbardziej obciążona faza</span>
        <strong>{insights.heaviestPhase}</strong>
      </div>
      <div className="pb-insight-summary">
        <span>Najmniej obciążona faza</span>
        <strong>{insights.lightestPhase ?? "-"}</strong>
      </div>
      <div className="pb-insight-summary">
        <span>Różnica obciążenia</span>
        <strong>{formatPower(insights.spreadW)}</strong>
      </div>
      {insights.contributors.length > 0 ? (
        <div className="pb-insight-contributors">
          {insights.contributors.map((row) => (
            <div className="pb-insight-row" key={row.id}>
              <div>
                <strong>{row.referenceDesignation}</strong>
                <span>{row.circuitName}</span>
              </div>
              <span>{formatPower(row.powerW)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PhaseMoveSuggestionsCard({
  suggestions,
  onApplyPhaseMove,
}: {
  suggestions: PhaseMoveSuggestion[];
  onApplyPhaseMove: PhaseMoveApplyHandler;
}) {
  return (
    <section className="card pb-suggestions-card">
      <div className="section-header">SUGESTIE PRZENIESIENIA</div>
      {suggestions.length === 0 ? (
        <p className="pb-circuit-empty">Brak prostych przeniesień, które poprawiają asymetrię.</p>
      ) : (
        <div className="pb-suggestion-list">
          {suggestions.map((suggestion) => (
            <div
              className="pb-suggestion-row"
              key={`${suggestion.row.id}-${suggestion.fromPhase}-${suggestion.toPhase}`}
            >
              <div>
                <strong>{suggestion.row.referenceDesignation}</strong>
                <span>{suggestion.row.circuitName}</span>
              </div>
              <div className="pb-suggestion-move">
                <span>{suggestion.fromPhase}</span>
                <span>→</span>
                <span>{suggestion.toPhase}</span>
              </div>
              <small>
                {suggestion.beforeImbalancePercent.toFixed(1)}% → {suggestion.afterImbalancePercent.toFixed(1)}%
              </small>
              <button
                className="pb-suggestion-apply"
                type="button"
                onClick={() => onApplyPhaseMove(suggestion.row.id, suggestion.toPhase)}
              >
                Zastosuj
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AutoBalanceSection({
  symbols,
  onApplyBalance,
}: {
  symbols: SymbolItem[];
  onApplyBalance: BalanceApplyHandler;
}) {
  const [mode, setMode] = useState<BalanceMode>("Current");
  const [scope, setScope] = useState<BalanceScope>("OnlyUnlocked");
  const [balanceMessage, setBalanceMessage] = useState("");
  const [balanceDetails, setBalanceDetails] = useState<Array<{ id: string; label: string; fromPhase: string; toPhase: string }>>([]);
  const [balanceSeverity, setBalanceSeverity] = useState<'improved' | 'neutral' | 'worse'>('neutral');

  const handlePreview = () => {
    const result = onApplyBalance(mode, scope, true);
    setBalanceMessage(result.message);
    setBalanceDetails(result.details ?? []);
    setBalanceSeverity(result.severity ?? 'neutral');
  };

  const handleApply = () => {
    const result = onApplyBalance(mode, scope, false);
    setBalanceMessage(result.message);
    setBalanceDetails(result.details ?? []);
    setBalanceSeverity(result.severity ?? 'neutral');
  };

  return (
    <div className="pb-autobalance">
      <h3>Automatyczne bilansowanie</h3>
      <div className="pb-autobalance-controls">
        <label>
          Tryb:
          <select value={mode} onChange={(e) => setMode(e.target.value as BalanceMode)}>
            <option value="Current">Według prądu (A)</option>
            <option value="Power">Według mocy (W)</option>
          </select>
        </label>
        <label>
          Zakres:
          <select value={scope} onChange={(e) => setScope(e.target.value as BalanceScope)}>
            <option value="OnlyUnlocked">Tylko niezablokowane</option>
            <option value="AllSinglePhase">Wszystkie 1F</option>
          </select>
        </label>
        <div className="pb-autobalance-actions">
          <button type="button" onClick={handlePreview} disabled={symbols.length === 0}>
            Podgląd planu
          </button>
          <button type="button" onClick={handleApply} disabled={symbols.length === 0} className="accent-btn">
            Zastosuj bilans
          </button>
        </div>
      </div>
      {balanceMessage.length > 0 && (
        <>
          <p className={`pb-autobalance-result is-${balanceSeverity}`}>
            {balanceMessage}
          </p>
          {balanceDetails.length > 0 && (
            <div className={`pb-autobalance-details is-${balanceSeverity}`}>
              {balanceDetails.map((item) => (
                <div className="pb-autobalance-details-row" key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{item.fromPhase} -&gt; {item.toPhase}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
