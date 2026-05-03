import { useState } from "react";
import type { SymbolItem } from "../types/symbolItem";
import {
  calculateTotalDistribution,
  type BalanceMode,
  type BalanceScope,
} from "../lib/phaseDistribution/phaseDistributionCalculator";
import { AppIcon } from "./AppIcon";

interface PowerBalancePageProps {
  symbols: SymbolItem[];
  onApplyBalance: (mode: BalanceMode, scope: BalanceScope) => { message: string };
}

export function PowerBalancePage({ symbols, onApplyBalance }: PowerBalancePageProps) {
  const distribution = calculateTotalDistribution(symbols);
  const totalPower = distribution.l1PowerW + distribution.l2PowerW + distribution.l3PowerW;
  const totalCurrent = distribution.l1CurrentA + distribution.l2CurrentA + distribution.l3CurrentA;
  const calculatedPower = totalPower * 0.6;
  const connectionPower = 14000;
  const connectionUsage = connectionPower > 0 ? (calculatedPower / connectionPower) * 100 : 0;
  const reservePower = connectionPower - calculatedPower;
  const imbalance = distribution.imbalancePercent;
  const imbalanceClass = imbalance > 30 ? "critical" : imbalance > 15 ? "warning" : "ok";

  return (
    <div className="power-balance-page">
      <div className="section-header">BILANS MOCY</div>

      <div className="card pb-summary-card">
        <div className="pb-summary-row">
          <span>
            <AppIcon className="accent-orange" name="validation" size={14} />
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
            <AppIcon className="accent-orange" name="balance" size={14} />
            Współczynnik jednoczesności
          </span>
          <strong>0.60</strong>
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
          maxCurrent={Math.max(totalCurrent, 1)}
          power={distribution.l1PowerW}
          current={distribution.l1CurrentA}
        />
        <PhaseCard
          color="black"
          label="L2"
          maxCurrent={Math.max(totalCurrent, 1)}
          power={distribution.l2PowerW}
          current={distribution.l2CurrentA}
        />
        <PhaseCard
          color="gray"
          label="L3"
          maxCurrent={Math.max(totalCurrent, 1)}
          power={distribution.l3PowerW}
          current={distribution.l3CurrentA}
        />
      </div>

      <div className={`card pb-imbalance ${imbalanceClass}`}>
        <span>Asymetria faz</span>
        <strong>{imbalance.toFixed(1)}%</strong>
      </div>

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
        <div className="pb-phase-fill" style={{ width: `${fillPercent}%` }} />
      </div>
      <span className="pb-phase-power">{power.toFixed(0)} W</span>
    </div>
  );
}

function AutoBalanceSection({
  symbols,
  onApplyBalance,
}: {
  symbols: SymbolItem[];
  onApplyBalance: (mode: BalanceMode, scope: BalanceScope) => { message: string };
}) {
  const [mode, setMode] = useState<BalanceMode>("Current");
  const [scope, setScope] = useState<BalanceScope>("OnlyUnlocked");
  const [balanceMessage, setBalanceMessage] = useState("");

  const handleBalance = () => {
    const result = onApplyBalance(mode, scope);
    setBalanceMessage(result.message);
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
        <button type="button" onClick={handleBalance} disabled={symbols.length === 0}>
          Bilansuj fazy
        </button>
      </div>
      {balanceMessage.length > 0 && (
        <p className="pb-autobalance-result">
          {balanceMessage}
        </p>
      )}
    </div>
  );
}
