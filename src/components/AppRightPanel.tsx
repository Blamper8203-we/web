import type { RightTab } from "../lib/appHelpers";
import type { ValidationResult } from "../lib/validation/electricalValidationService";
import type { ProjectMetadata } from "../types/projectMetadata";
import type { SymbolItem } from "../types/symbolItem";
import { AppIcon } from "./AppIcon";
import { CircuitEditPanel } from "./CircuitEditPanel";
import { PowerBalancePage, type BalanceApplyHandler } from "./PowerBalancePage";
import { ValidationPanel } from "./ValidationPanel";

const MAIN_BREAKER_VALUES = [25, 32, 40, 63, 80, 100, 125] as const;

function toMainBreakerValue(value: number): ProjectMetadata["mainBreakerA"] | null {
  return MAIN_BREAKER_VALUES.find((entry) => entry === value) ?? null;
}

export interface AppRightPanelProps {
  showRightPanel: boolean;
  activeRightTab: RightTab;
  setActiveRightTab: (tab: RightTab) => void;
  symbols: SymbolItem[];
  handleAutoBalance: BalanceApplyHandler;
  validationResult: ValidationResult;
  selectedSymbol: SymbolItem | null;
  handleCircuitEditSave: (nextSymbol: SymbolItem) => void;
  handleSymbolSelectionChange: (ids: string[], primaryId: string | null) => void;
  metadata: ProjectMetadata;
  handleMetadataChange: (nextMetadata: ProjectMetadata) => void;
  handleOpenRcdManager: () => void;
}

export function AppRightPanel({
  showRightPanel,
  activeRightTab,
  setActiveRightTab,
  symbols,
  handleAutoBalance,
  validationResult,
  selectedSymbol,
  handleCircuitEditSave,
  handleSymbolSelectionChange,
  metadata,
  handleMetadataChange,
  handleOpenRcdManager,
}: AppRightPanelProps) {
  if (!showRightPanel) {
    return null;
  }

  return (
    <aside className="right-panel">
      <div className="panel-content">
          <div className="right-tabs">
            <button className={`right-tab-btn ${activeRightTab === "config" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("config")}>
              <span>Konfiguracja</span>
            </button>
            <button className={`right-tab-btn ${activeRightTab === "balance" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("balance")}>
              <span>Bilans</span>
            </button>
            <button className={`right-tab-btn ${activeRightTab === "validation" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("validation")}>
              <span>Walidacja</span>
            </button>
            <button className={`right-tab-btn ${activeRightTab === "circuitEdit" ? "active" : ""}`} type="button" onClick={() => setActiveRightTab("circuitEdit")}>
              <span>Edycja</span>
            </button>
          </div>
        <div className="right-panel-content">
          {activeRightTab === "balance" && (
            <PowerBalancePage symbols={symbols} onApplyBalance={handleAutoBalance} metadata={metadata} />
          )}
          {activeRightTab === "validation" && (
            <ValidationPanel result={validationResult} />
          )}
          {activeRightTab === "circuitEdit" && (
            <CircuitEditPanel
              symbol={selectedSymbol}
              onSave={handleCircuitEditSave}
              onClearSelection={() => handleSymbolSelectionChange([], null)}
            />
          )}
          {activeRightTab === "config" && (
            <div className="power-config-panel">
              <section className="power-config-section">
                <div className="section-header">KONFIGURACJA ZASILANIA</div>
                <div className="card power-config-card">
                  <label className="power-config-field">
                    <span><AppIcon className="accent-primary" name="validation" size={12} />Napięcie</span>
                    <select
                      value={metadata.supplyVoltageV}
                      onChange={(e) => handleMetadataChange({ ...metadata, supplyVoltageV: Number(e.target.value) as 230 | 400 })}
                    >
                      <option value="230">230V</option>
                      <option value="400">400V</option>
                    </select>
                  </label>
                  <label className="power-config-field">
                    <span><AppIcon className="accent-primary" name="busbar" size={12} />Liczba faz</span>
                    <select
                      value={metadata.supplyPhases}
                      onChange={(e) => handleMetadataChange({ ...metadata, supplyPhases: Number(e.target.value) as 1 | 3 })}
                    >
                      <option value="1">1-fazowe</option>
                      <option value="3">3-fazowe</option>
                    </select>
                  </label>
                  <label className="power-config-field">
                    <span><AppIcon className="accent-primary" name="delete" size={12} />Zabezpieczenie główne</span>
                    <select
                      value={metadata.mainBreakerA}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        handleMetadataChange({
                          ...metadata,
                          mainBreakerA: toMainBreakerValue(parsed) ?? metadata.mainBreakerA,
                        });
                      }}
                    >
                      <option value="25">25A</option>
                      <option value="32">32A</option>
                      <option value="40">40A</option>
                      <option value="63">63A</option>
                      <option value="80">80A</option>
                      <option value="100">100A</option>
                      <option value="125">125A</option>
                    </select>
                  </label>
                  <label className="power-config-field">
                    <span><AppIcon className="accent-primary" name="balance" size={12} />Moc przyłączeniowa</span>
                    <div className="unit-input">
                      <input
                        value={metadata.contractedPowerKw}
                        inputMode="decimal"
                        type="number"
                        step="0.1"
                        onChange={(e) => handleMetadataChange({ ...metadata, contractedPowerKw: Number(e.target.value) || 0 })}
                      />
                      <span>kW</span>
                    </div>
                  </label>
                </div>
              </section>
              <section className="power-config-section">
                <div className="section-header">USTAWIENIA RCD</div>
                <button
                  className="accent-btn power-config-action"
                  type="button"
                  onClick={handleOpenRcdManager}
                >
                  <AppIcon name="cog" size={14} /><span>Zarządzaj RCD</span>
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
