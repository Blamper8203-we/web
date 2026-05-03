import type { SymbolItem } from "../types/symbolItem";
import { validateProject } from "../lib/validation/electricalValidationService";
import { AppIcon } from "./AppIcon";

interface ValidationPanelProps {
  symbols: SymbolItem[];
}

export function ValidationPanel({ symbols }: ValidationPanelProps) {
  const result = validateProject(symbols);

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const infoCount = result.info.length;

  if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
    return (
      <div className="validation-panel">
        <div className="section-header">WYNIKI WALIDACJI</div>
        <div className="card validation-empty">
          <strong>Projekt poprawny</strong>
          <p>Brak problemów w aktualnym projekcie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-panel">
      <div className="section-header">WYNIKI WALIDACJI</div>

      <div className="card validation-summary-card">
        <strong>{errorCount > 0 ? "Projekt wymaga poprawek" : "Projekt z ostrzeżeniami"}</strong>
        <div className="validation-summary">
          <span className="validation-count errors">
            <AppIcon name="validation" size={14} />
            Błędy: {errorCount}
          </span>
          <span className="validation-count warnings">
            <AppIcon name="validation" size={14} />
            Ostrzeżenia: {warningCount}
          </span>
          {infoCount > 0 && (
            <span className="validation-count info">
              <AppIcon name="help" size={14} />
              Info: {infoCount}
            </span>
          )}
        </div>
      </div>

      {errorCount > 0 && (
        <div className="card validation-section">
          <h3 className="section-header errors">
            Błędy krytyczne
          </h3>
          <ul className="validation-list">
            {result.errors.map((msg, idx) => (
              <li key={idx} className="validation-item error">
                <span className="validation-code">{msg.code}</span>
                <span className="validation-message">{msg.message}</span>
                {msg.details && (
                  <span className="validation-details">{msg.details}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warningCount > 0 && (
        <div className="card validation-section">
          <h3 className="section-header warnings">
            Ostrzeżenia
          </h3>
          <ul className="validation-list">
            {result.warnings.map((msg, idx) => (
              <li key={idx} className="validation-item warning">
                <span className="validation-code">{msg.code}</span>
                <span className="validation-message">{msg.message}</span>
                {msg.details && (
                  <span className="validation-details">{msg.details}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {infoCount > 0 && (
        <div className="card validation-section">
          <h3 className="section-header info">
            Informacje
          </h3>
          <ul className="validation-list">
            {result.info.map((msg, idx) => (
              <li key={idx} className="validation-item info">
                <span className="validation-code">{msg.code}</span>
                <span className="validation-message">{msg.message}</span>
                {msg.details && (
                  <span className="validation-details">{msg.details}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
