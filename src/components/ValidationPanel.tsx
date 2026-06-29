import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import "./ValidationPanel.css";
import type { ValidationResult, ValidationSeverity } from "../lib/validation/electricalValidationService";
import { getValidationEditTargetForMessage } from "../lib/validation/validationEditTargets";
import { buildValidationDisplayGroupsForSymbols, getValidationReadiness } from "../lib/validation/validationPresentation";
import { getValidationRemediation, getValidationRuleDescription } from "../lib/validation/validationRuleDescriptions";
import {
  getValidationQuickFixesForMessage,
  type ValidationQuickFixId,
} from "../lib/validation/validationQuickFixes";
import type { SymbolItem } from "../types/symbolItem";
import { AppIcon } from "./AppIcon";

interface ValidationPanelProps {
  result: ValidationResult;
  symbols: SymbolItem[];
  isDinRailGenerated: boolean;
  onSelectSymbol?: (symbolId: string) => void;
  onEditSymbolField?: (symbolId: string, fieldKey: string) => void;
  onApplyQuickFix?: (symbolId: string, fixId: ValidationQuickFixId) => void;
}

export function ValidationPanel({
  result,
  symbols,
  isDinRailGenerated,
  onSelectSymbol,
  onEditSymbolField,
  onApplyQuickFix,
}: ValidationPanelProps) {
  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const infoCount = result.info.length;
  const groups = buildValidationDisplayGroupsForSymbols(result, symbols);
  const readiness = getValidationReadiness(symbols);
  const symbolMap = useMemo(() => new Map(symbols.map((symbol) => [symbol.id, symbol])), [symbols]);
  // WHY: groups with at least one Error open automatically so the user lands
  // on the most actionable findings without an extra click. Groups with only
  // Warning/Info stay collapsed (less urgent, user can drill in if needed).
  // Uses `groups` (not `filteredGroups`) so the set is stable when the user
  // toggles severity filters later.
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(groups.filter((group) => group.severity === "Error").map((group) => group.id)),
  );
  const [visibleSeverities, setVisibleSeverities] = useState<Set<ValidationSeverity>>(
    () => new Set(["Error", "Warning", "Info"]),
  );
  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          messages: group.messages.filter((message) => visibleSeverities.has(message.severity)),
        }))
        .filter((group) => group.messages.length > 0),
    [groups, visibleSeverities],
  );
  const totalMessageCount = errorCount + warningCount + infoCount;
  const visibleMessageCount = filteredGroups.reduce((sum, group) => sum + group.messages.length, 0);
  const hiddenMessageCount = totalMessageCount - visibleMessageCount;

  if (!isDinRailGenerated) {
    return (
      <div className="validation-panel">
        <div className="section-header">WYNIKI WALIDACJI</div>
        <div className="card validation-empty validation-idle">
          <strong>Walidacja oczekuje na rozdzielnicę</strong>
          <p>Wygeneruj szynę DIN, aby rozpocząć sprawdzanie modułów i obwodów.</p>
        </div>
      </div>
    );
  }

  if (readiness === "emptyProject") {
    return (
      <div className="validation-panel">
        <div className="section-header">WYNIKI WALIDACJI</div>
        <div className="card validation-empty validation-idle">
          <strong>Walidacja gotowa</strong>
          <p>Dodaj moduły i obwody, aby rozpocząć sprawdzanie projektu.</p>
        </div>
      </div>
    );
  }

  if (readiness === "noCircuitDevices") {
    return (
      <div className="validation-panel">
        <div className="section-header">WYNIKI WALIDACJI</div>
        <div className="card validation-empty validation-idle">
          <strong>Brak obwodów do sprawdzenia</strong>
          <p>Moduły pomocnicze są obecne, ale walidacja obwodów ruszy po dodaniu MCB albo RCBO.</p>
        </div>
      </div>
    );
  }

  if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
    return (
      <div className="validation-panel">
        <div className="section-header">WYNIKI WALIDACJI</div>
        <div className="card validation-empty">
          <strong>Dokumentacja poprawna</strong>
          <p>Brak problemów w aktualnym zleceniu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-panel">
      <div className="section-header">WYNIKI WALIDACJI</div>

      <div className="card validation-summary-card">
        <strong>{errorCount > 0 ? "Dokumentacja wymaga poprawek" : "Dokumentacja z ostrzeżeniami"}</strong>
        <div className="validation-summary">
          <button
            className={`validation-count errors ${visibleSeverities.has("Error") ? "active" : ""}`}
            type="button"
            aria-pressed={visibleSeverities.has("Error")}
            onClick={() => toggleSeverityFilter("Error", setVisibleSeverities)}
          >
            <AppIcon name="validation" size={14} />
            Błędy: {errorCount}
          </button>
          <button
            className={`validation-count warnings ${visibleSeverities.has("Warning") ? "active" : ""}`}
            type="button"
            aria-pressed={visibleSeverities.has("Warning")}
            onClick={() => toggleSeverityFilter("Warning", setVisibleSeverities)}
          >
            <AppIcon name="validation" size={14} />
            Ostrzeżenia: {warningCount}
          </button>
          {infoCount > 0 && (
            <button
              className={`validation-count info ${visibleSeverities.has("Info") ? "active" : ""}`}
              type="button"
              aria-pressed={visibleSeverities.has("Info")}
              onClick={() => toggleSeverityFilter("Info", setVisibleSeverities)}
            >
              <AppIcon name="help" size={14} />
              Info: {infoCount}
            </button>
          )}
        </div>
        {hiddenMessageCount > 0 ? (
          <span className="validation-filter-note">Ukryto: {hiddenMessageCount}</span>
        ) : null}
      </div>

      <div className="validation-group-list">
        {filteredGroups.map((group) => {
          const visibleGroupSeverity = getHighestSeverity(group.messages.map((message) => message.severity));

          return (
          <section key={group.id} className={`validation-group ${visibleGroupSeverity.toLowerCase()}`}>
            <button
              className="validation-group-header"
              type="button"
              aria-expanded={expandedGroupIds.has(group.id)}
              onClick={() => {
                setExpandedGroupIds((current) => {
                  const next = new Set(current);
                  if (next.has(group.id)) {
                    next.delete(group.id);
                  } else {
                    next.add(group.id);
                  }
                  return next;
                });
              }}
            >
              <div>
                <h3>{group.title}</h3>
                <span>{group.subtitle}</span>
              </div>
              <div className="validation-group-header-actions">
                <SeverityBadge severity={visibleGroupSeverity} />
                {group.technicalId && onSelectSymbol ? (
                  <span
                    className="validation-locate-action"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectSymbol(group.technicalId!);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onSelectSymbol(group.technicalId!);
                    }}
                  >
                    Pokaż
                  </span>
                ) : null}
                <span className="validation-expand-indicator">{expandedGroupIds.has(group.id) ? "Zwiń" : "Rozwiń"}</span>
              </div>
            </button>
            {expandedGroupIds.has(group.id) && (
              <ul className="validation-list">
                {group.messages.map((msg) => {
                  const quickFixes = getValidationQuickFixesForMessage(
                    msg,
                    msg.symbolId ? symbolMap.get(msg.symbolId) : undefined,
                  );
                  const editTarget = getValidationEditTargetForMessage(msg);

                  return (
                    <li
                      key={`${msg.code}-${msg.symbolId ?? "project"}-${msg.message}`}
                      className={`validation-item ${msg.severity.toLowerCase()}`}
                    >
                      <span className="validation-code" title={buildRuleTooltip(msg.code)}>{msg.code}</span>
                      <span className="validation-message">{msg.message}</span>
                      {msg.details && <span className="validation-details">{msg.details}</span>}
                      {(() => {
                        const remediation = getValidationRemediation(msg.code);
                        return remediation ? (
                          <span className="validation-remediation">
                            <AppIcon name="help" size={12} />
                            <strong>Co zrobić:</strong> {remediation}
                          </span>
                        ) : null;
                      })()}
                      {(editTarget && msg.symbolId && onEditSymbolField) || (quickFixes.length > 0 && onApplyQuickFix) ? (
                        <div className="validation-quick-actions">
                          {editTarget && msg.symbolId && onEditSymbolField ? (
                            <button
                              className="validation-quick-action"
                              type="button"
                              onClick={() => onEditSymbolField(msg.symbolId!, editTarget.fieldKey)}
                            >
                              {editTarget.label}
                            </button>
                          ) : null}
                          {onApplyQuickFix
                            ? quickFixes.map((fix) => (
                                <button
                                  key={fix.id}
                                  className="validation-quick-action"
                                  type="button"
                                  onClick={() => onApplyQuickFix(fix.symbolId, fix.id)}
                                >
                                  {fix.label}
                                </button>
                              ))
                            : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          );
        })}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: ValidationSeverity }) {
  const label = severity === "Error" ? "Błąd" : severity === "Warning" ? "Ostrzeżenie" : "Info";

  return <span className={`validation-severity-badge ${severity.toLowerCase()}`}>{label}</span>;
}

function buildRuleTooltip(code: string): string {
  const entry = getValidationRuleDescription(code);
  if (!entry) return "";

  // WHY: tooltip text combines plain rule explanation with the standard
  // reference when available. NormRef is shown italicized after the
  // description so the user immediately sees the engineering context.
  return entry.normRef ? `${entry.description}\n\n${entry.normRef}` : entry.description;
}

function getHighestSeverity(severities: ValidationSeverity[]): ValidationSeverity {
  if (severities.includes("Error")) return "Error";
  if (severities.includes("Warning")) return "Warning";
  return "Info";
}

function toggleSeverityFilter(
  severity: ValidationSeverity,
  setVisibleSeverities: Dispatch<SetStateAction<Set<ValidationSeverity>>>,
) {
  setVisibleSeverities((current) => {
    const next = new Set(current);
    if (next.has(severity)) {
      next.delete(severity);
    } else {
      next.add(severity);
    }

    return next.size > 0 ? next : current;
  });
}
