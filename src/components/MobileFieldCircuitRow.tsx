import { useTranslation } from "react-i18next";
import type { SymbolItem } from "../types/symbolItem";
import { type CircuitRow } from "../types/circuitRow";

type MobileFieldCircuitRowProps = {
  row: CircuitRow;
  symbols: SymbolItem[];
  onSave: (symbol: SymbolItem) => void;
};

export function MobileFieldCircuitRow({ row, symbols, onSave }: MobileFieldCircuitRowProps) {
  const { t } = useTranslation();
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
            <label>{t("auto.zabezpieczenie_924", "Zabezpieczenie")}</label>
            <select
              className="mobile-field-select"
              value={symbol.protectionType || ""}
              onChange={handleProtectionChange}
            >
              <option value="">-</option>
              <option value="B6">{t("auto.b6_517", "B6")}</option>
              <option value="B10">{t("auto.b10_837", "B10")}</option>
              <option value="B16">{t("auto.b16_303", "B16")}</option>
              <option value="B20">{t("auto.b20_413", "B20")}</option>
              <option value="B25">{t("auto.b25_229", "B25")}</option>
              <option value="B32">{t("auto.b32_535", "B32")}</option>
              <option value="C10">{t("auto.c10_911", "C10")}</option>
              <option value="C16">{t("auto.c16_165", "C16")}</option>
              <option value="C20">{t("auto.c20_367", "C20")}</option>
              <option value="C25">{t("auto.c25_61", "C25")}</option>
              <option value="C32">{t("auto.c32_368", "C32")}</option>
            </select>
          </div>
        )}

        <div className="mobile-field-input-group" style={isRcd ? { gridColumn: 'span 2' } : {}}>
          <label>{t("auto.faza_203", "Faza")}</label>
          <select
            className="mobile-field-select"
            value={symbol.phase || ""}
            onChange={handlePhaseChange}
          >
            <option value="">-</option>
            <option value="L1">{t("auto.l1_864", "L1")}</option>
            <option value="L2">{t("auto.l2_143", "L2")}</option>
            <option value="L3">{t("auto.l3_864", "L3")}</option>
            <option value="L1, L2, L3">{t("auto.l1l2l3_674", "L1, L2, L3")}</option>
          </select>
        </div>
      </div>

      <div className="mobile-field-input-group">
        <label>{t("auto.nazwaobwodu_995", "Nazwa obwodu")}</label>
        <input
          type="text"
          className="mobile-field-input"
          value={symbol.circuitName || ""}
          onChange={handleCircuitNameChange}
          placeholder={t("auto.npgniazdakuchni_711", "Np. Gniazda kuchnia")}
        />
      </div>
    </article>
  );
}
