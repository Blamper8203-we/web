
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyCircuitEditValues,
  getCircuitEditFields,
  getCircuitEditHeader,
  type CircuitEditFieldDefinition,
} from "../lib/circuitEdit/circuitEditFieldDefinitions";
import type { SymbolItem } from "../types/symbolItem";
import { AppIcon } from "./AppIcon";
import "./CircuitEditPanel.css";

interface CircuitEditPanelProps {
  symbol: SymbolItem | null;
  symbols?: SymbolItem[];
  highlightedFieldKey?: string | null;
  /** Gdy true — ukrywa pole "Zdejmij osłonę" (tylko dla rozdzielnicy połączeń) */
  hideRemoveCover?: boolean;
  onSave: (nextSymbol: SymbolItem) => void;
  onClearSelection: () => void;
}

type FieldValue = string | number | boolean;

import { CircuitCalculators } from "./CircuitCalculators";

export function CircuitEditPanel({ symbol, symbols, highlightedFieldKey, hideRemoveCover, onSave, onClearSelection }: CircuitEditPanelProps) {
  const allFields = useMemo(() => (symbol ? getCircuitEditFields(symbol, symbols) : []), [symbol, symbols]);
  const fields = useMemo(
    () => (hideRemoveCover ? allFields.filter((f) => f.key !== "RemoveCover") : allFields),
    [allFields, hideRemoveCover],
  );
  const header = useMemo(() => (symbol ? getCircuitEditHeader(symbol) : null), [symbol]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const fieldsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setValues(() => {
      const newValues: Record<string, FieldValue> = {};
      fields.forEach((field) => {
        newValues[field.key] = field.value;
      });
      return newValues;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol?.id]);

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
  };

  /** Natychmiastowy zapis bez czekania na React state — używane przez toggle switch. */
  const updateValueAndSaveNow = (key: string, value: FieldValue) => {
    // WHY: setState jest asynchroniczny, więc nie można wywołać handleSave() zaraz po
    // updateValue() — stare `values` byłoby użyte do budowania nextSymbol.
    // Budujemy nextSymbol ręcznie z aktualnym values + nową wartością.
    const mergedValues = { ...values, [key]: value };
    setValues(mergedValues);
    const nextSymbol = applyCircuitEditValues(symbol, mergedValues);
    onSave(nextSymbol);
  };

  const handleSave = () => {
    const nextSymbol = applyCircuitEditValues(symbol, values);
    onSave(nextSymbol);
  };

  const focusNextField = (currentKey: string) => {
    const controls = Array.from(
      fieldsRef.current?.querySelectorAll<HTMLElement>("[data-circuit-edit-control]") ?? [],
    );
    const currentIndex = controls.findIndex((control) => control.dataset.circuitEditKey === currentKey);
    const nextControl = currentIndex >= 0 ? controls[currentIndex + 1] : undefined;

    if (!nextControl) {
      return false;
    }

    nextControl.focus();
    nextControl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
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

      <div className="circuit-edit-fields" ref={fieldsRef}>
        {fields.map((field) => (
          <CircuitEditField
            field={field}
            key={field.key}
            value={values[field.key] ?? field.value}
            isHighlighted={field.key === highlightedFieldKey}
            onChange={(value) => updateValue(field.key, value)}
            onAutoSave={(value) => updateValueAndSaveNow(field.key, value)}
            onCommit={handleSave}
            onFocusNext={() => focusNextField(field.key)}
          />
        ))}
      </div>

      <CircuitCalculators values={values} moduleType={moduleTypeForCalc} />

      <div className="circuit-edit-footer">
        {/* Przycisk Zapisz usunięto zgodnie z życzeniem, panel zapisuje automatycznie. */}
      </div>
    </div>
  );
}

interface CircuitEditFieldProps {
  field: CircuitEditFieldDefinition;
  value: FieldValue;
  isHighlighted: boolean;
  onChange: (value: FieldValue) => void;
  /** Wywoływane dla pól toggle/checkbox — od razu zapisuje bez klikania przycisku. */
  onAutoSave: (value: FieldValue) => void;
  onCommit: () => void;
  onFocusNext: () => boolean;
}

function CircuitEditField({ field, value, isHighlighted, onChange, onAutoSave, onCommit, onFocusNext }: CircuitEditFieldProps) {
  const controlRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const options = field.kind === "combo" ? withCurrentOption(field.options ?? [], String(value)) : [];
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const didFocusNext = onFocusNext();

    if (!didFocusNext) {
      onCommit();
    }
  };

  useEffect(() => {
    if (!isHighlighted) {
      return;
    }

    controlRef.current?.focus();
    controlRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isHighlighted, field.key]);

  if (field.kind === "checkbox") {
    return (
      <label className={`circuit-edit-checkbox ${isHighlighted ? "is-highlighted" : ""}`}>
        <span>{field.label}</span>
        <span className="circuit-edit-toggle">
          <input
            ref={controlRef as React.RefObject<HTMLInputElement>}
            data-circuit-edit-control="true"
            data-circuit-edit-key={field.key}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              onAutoSave(checked); // natychmiastowy zapis bez przycisku
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="circuit-edit-toggle-track" aria-hidden="true" />
        </span>
      </label>
    );
  }

  return (
    <label className={`circuit-edit-field ${isHighlighted ? "is-highlighted" : ""}`}>
      <span>{field.label}</span>
      {field.kind === "combo" ? (
        <select
          ref={controlRef as React.RefObject<HTMLSelectElement>}
          data-circuit-edit-control="true"
          data-circuit-edit-key={field.key}
          value={String(value)}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            onAutoSave(event.currentTarget.value);
          }}
          onKeyDown={handleKeyDown}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            ref={controlRef as React.RefObject<HTMLInputElement>}
            data-circuit-edit-control="true"
            data-circuit-edit-key={field.key}
            type={field.kind === "number" ? "number" : "text"}
            value={String(value)}
            placeholder={field.placeholder}
            step={field.kind === "number" ? "0.1" : undefined}
            onChange={(event) =>
              onChange(field.kind === "number" ? event.currentTarget.value : event.currentTarget.value)
            }
            onBlur={() => onCommit()}
            onKeyDown={handleKeyDown}
            list={field.options && field.options.length > 0 ? `${field.key}-datalist` : undefined}
          />
          {field.kind === "text" && field.options && field.options.length > 0 && (
            <datalist id={`${field.key}-datalist`}>
              {field.options.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          )}
        </>
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
