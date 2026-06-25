import type { SymbolItem } from "../types/symbolItem";
import { type CircuitRow } from "../types/circuitRow";

type MobileFieldCircuitRowProps = {
  row: CircuitRow;
  symbols: SymbolItem[];
  onSave: (symbol: SymbolItem) => void;
};

export function MobileFieldCircuitRow({ row, symbols, onSave }: MobileFieldCircuitRowProps) {
  const symbol = symbols.find(s => s.id === row.id);
  if (!symbol) return null;

  const handlePhaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave({ ...symbol, phase: e.target.value as any });
  };

  const handleProtectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave({ ...symbol, protectionType: e.target.value });
  };

  const handleCircuitNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSave({ ...symbol, circuitName: e.target.value });
  };

  const isRcd = symbol.deviceKind === "rcd";

  return (
    <article className={`mobile-circuit-row ${isRcd ? 'mobile-circuit-row--rcd' : ''}`}>
      <div className="mobile-circuit-row__header">
        <span className="mobile-circuit-row__ref">
          {symbol.referenceDesignation || "Brak Ozn."}
        </span>
        <span className="mobile-circuit-row__group">
          {symbol.groupName || "Bez grupy"}
        </span>
      </div>

      <div className="mobile-circuit-row__controls">
        {!isRcd && (
          <div className="mobile-field-input-group">
            <label>Zabezpieczenie</label>
            <select
              className="mobile-field-select"
              value={symbol.protectionType || ""}
              onChange={handleProtectionChange}
            >
              <option value="">-</option>
              <option value="B6">B6</option>
              <option value="B10">B10</option>
              <option value="B16">B16</option>
              <option value="B20">B20</option>
              <option value="B25">B25</option>
              <option value="B32">B32</option>
              <option value="C10">C10</option>
              <option value="C16">C16</option>
              <option value="C20">C20</option>
              <option value="C25">C25</option>
              <option value="C32">C32</option>
            </select>
          </div>
        )}

        <div className="mobile-field-input-group" style={isRcd ? { gridColumn: 'span 2' } : {}}>
          <label>Faza</label>
          <select
            className="mobile-field-select"
            value={symbol.phase || ""}
            onChange={handlePhaseChange}
          >
            <option value="">-</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="L1, L2, L3">L1, L2, L3</option>
          </select>
        </div>
      </div>

      <div className="mobile-field-input-group">
        <label>Nazwa obwodu</label>
        <input
          type="text"
          className="mobile-field-input"
          value={symbol.circuitName || ""}
          onChange={handleCircuitNameChange}
          placeholder="Np. Gniazda kuchnia"
        />
      </div>
    </article>
  );
}
