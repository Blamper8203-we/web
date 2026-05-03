import { useEffect, useMemo, useState } from "react";
import {
  applyCircuitEditValues,
  getCircuitEditFields,
  getCircuitEditHeader,
  type CircuitEditFieldDefinition,
} from "../lib/circuitEdit/circuitEditFieldDefinitions";
import type { SymbolItem } from "../types/symbolItem";
import { AppIcon } from "./AppIcon";

interface CircuitEditPanelProps {
  symbol: SymbolItem | null;
  onSave: (nextSymbol: SymbolItem) => void;
  onClearSelection: () => void;
}

type FieldValue = string | number | boolean;

import { CircuitCalculators } from "./CircuitCalculators";

export function CircuitEditPanel({ symbol, onSave, onClearSelection }: CircuitEditPanelProps) {
  const fields = useMemo(() => (symbol ? getCircuitEditFields(symbol) : []), [symbol]);
  const header = useMemo(() => (symbol ? getCircuitEditHeader(symbol) : null), [symbol]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((field) => [field.key, field.value])));
    setIsDirty(false);
  }, [fields, symbol?.id]);

  if (!symbol || !header) {
    return (
      <div className="circuit-edit-empty card">
        <span className="workspace-tag">Edycja</span>
        <strong>Brak zaznaczonego modułu</strong>
        <p>Wybierz element na schemacie albo dodaj moduł z palety, aby edytować parametry.</p>
      </div>
    );
  }

  const updateValue = (key: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const nextSymbol = applyCircuitEditValues(symbol, values);
    onSave(nextSymbol);
    setIsDirty(false);
  };

  const isSocketOrMcb = symbol.deviceKind === "mcb" || symbol.deviceKind === "rcbo" || symbol.type?.toLowerCase().includes("mcb") || symbol.circuitType === "Gniazdo" || symbol.type?.toLowerCase().includes("socket");
  const moduleTypeForCalc = isSocketOrMcb ? "mcb" : "other";

  return (
    <div className="circuit-edit-panel">
      <div className={`circuit-edit-header ${header.tone}`}>
        <span className="circuit-edit-icon" aria-hidden="true">
          <AppIcon name="validation" size={16} />
        </span>
        <div>
          <strong>{header.title}</strong>
          <span>{header.subtitle}</span>
        </div>
        <button type="button" className="circuit-edit-close" aria-label="Zamknij" title="Zamknij" onClick={onClearSelection}>
          <AppIcon name="exit" size={14} />
        </button>
      </div>

      <div className="circuit-edit-fields">
        {fields.map((field) => (
          <CircuitEditField
            field={field}
            key={field.key}
            value={values[field.key] ?? field.value}
            onChange={(value) => updateValue(field.key, value)}
            onCommit={handleSave}
          />
        ))}
      </div>

      <CircuitCalculators values={values} moduleType={moduleTypeForCalc} />

      <div className="circuit-edit-footer">
        <button
          type="button"
          className={`accent-btn ${isDirty ? "dirty" : ""}`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          Zapisz zmiany
        </button>
      </div>
    </div>
  );
}

interface CircuitEditFieldProps {
  field: CircuitEditFieldDefinition;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  onCommit: () => void;
}

function CircuitEditField({ field, value, onChange, onCommit }: CircuitEditFieldProps) {
  const options = field.kind === "combo" ? withCurrentOption(field.options ?? [], String(value)) : [];
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onCommit();
  };

  if (field.kind === "checkbox") {
    return (
      <label className="circuit-edit-checkbox">
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      </label>
    );
  }

  return (
    <label className="circuit-edit-field">
      <span>{field.label}</span>
      {field.kind === "combo" ? (
        <select
          value={String(value)}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.kind === "number" ? "number" : "text"}
          value={String(value)}
          placeholder={field.placeholder}
          step={field.kind === "number" ? "0.1" : undefined}
          onChange={(event) =>
            onChange(field.kind === "number" ? event.currentTarget.value : event.currentTarget.value)
          }
          onKeyDown={handleKeyDown}
        />
      )}
    </label>
  );
}

function withCurrentOption(options: string[], value: string): string[] {
  if (!value || options.includes(value)) {
    return options;
  }

  return [value, ...options];
}
