import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ValidationPanel.css";
import type { ValidationResult, ValidationSeverity } from "../lib/validation/electricalValidationService";
import { getValidationEditTargetForMessage } from "../lib/validation/validationEditTargets";
import { buildValidationDisplayGroupsForSymbols, getValidationReadiness } from "../lib/validation/validationPresentation";
import {
  getValidationRemediation,
  getValidationRuleDescription,
  VALIDATION_RULE_DESCRIPTIONS,
} from "../lib/validation/validationRuleDescriptions";
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
  const { t } = useTranslation();
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
  // WHY: severity filter is now driven by a single dropdown mode rather than
  // three toggle buttons. Single source of truth = no risk of dropdown and
  // buttons disagreeing about what's visible.
  const [severityFilterMode, setSeverityFilterMode] = useState<SeverityFilterMode>("all");
  const visibleSeverities = useMemo(() => severityModeToSet(severityFilterMode), [severityFilterMode]);
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
        <div className="section-header">{t("app.validationPanel.header", "WYNIKI WALIDACJI")}</div>
        <div className="card validation-empty validation-idle">
          <strong>{t("app.validationPanel.waitingTitle", "Walidacja oczekuje na rozdzielnicę")}</strong>
          <p>{t("app.validationPanel.waitingDesc", "Wygeneruj szynę DIN, aby rozpocząć sprawdzanie modułów i obwodów.")}</p>
        </div>
      </div>
    );
  }

  if (readiness === "emptyProject") {
    return (
      <div className="validation-panel">
        <div className="section-header">{t("app.validationPanel.header", "WYNIKI WALIDACJI")}</div>
        <div className="card validation-empty validation-idle">
          <strong>{t("app.validationPanel.readyTitle", "Walidacja gotowa")}</strong>
          <p>{t("app.validationPanel.readyDesc", "Dodaj moduły i obwody, aby rozpocząć sprawdzanie projektu.")}</p>
        </div>
      </div>
    );
  }

  if (readiness === "noCircuitDevices") {
    return (
      <div className="validation-panel">
        <div className="section-header">{t("app.validationPanel.header", "WYNIKI WALIDACJI")}</div>
        <div className="card validation-empty validation-idle">
          <strong>{t("app.validationPanel.noCircuitsTitle", "Brak obwodów do sprawdzenia")}</strong>
          <p>{t("app.validationPanel.noCircuitsDesc", "Moduły pomocnicze są obecne, ale walidacja obwodów ruszy po dodaniu MCB albo RCBO.")}</p>
        </div>
      </div>
    );
  }

  if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
    return (
      <div className="validation-panel">
        <div className="section-header">{t("app.validationPanel.header", "WYNIKI WALIDACJI")}</div>
        <div className="card validation-empty">
          <strong>{t("app.validationPanel.correctTitle", "Dokumentacja poprawna")}</strong>
          <p>{t("app.validationPanel.correctDesc", "Brak problemów w aktualnym zleceniu.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-panel">
      <div className="section-header">{t("app.validationPanel.header", "WYNIKI WALIDACJI")}</div>

      <div className="card validation-summary-card">
        <strong>{errorCount > 0 ? t("app.validationPanel.summaryErrorsTitle", "Dokumentacja wymaga poprawek") : t("app.validationPanel.summaryWarningsTitle", "Dokumentacja z ostrzeżeniami")}</strong>
        <div className="validation-summary">
          <button
            className="validation-export-btn"
            type="button"
            onClick={() => copyReportToClipboard(filteredGroups, t)}
            title={t("app.validationPanel.copyTooltip", "Kopiuj listę wyników jako tekst do schowka")}
          >
            <AppIcon name="print" size={14} />
            {t("app.validationPanel.copyAction", "Kopiuj raport")}
          </button>
          <label className="validation-filter-select">
            <span>{t("app.validationPanel.filterLabel", "Pokaż:")}</span>
            <select
              value={severityFilterMode}
              onChange={(e) => setSeverityFilterMode(e.target.value as SeverityFilterMode)}
            >
              <option value="all">{t("app.validationPanel.filterAll", "Wszystkie")} ({totalMessageCount})</option>
              {errorCount > 0 && (
                <option value="errors">{t("app.validationPanel.filterErrorsOnly", "Tylko błędy")} ({errorCount})</option>
              )}
              {(errorCount + warningCount) > 0 && (
                <option value="errors-warnings">{t("app.validationPanel.filterErrorsWarnings", "Błędy + ostrzeżenia")} ({errorCount + warningCount})</option>
              )}
              {warningCount > 0 && (
                <option value="warnings">{t("app.validationPanel.filterWarningsOnly", "Tylko ostrzeżenia")} ({warningCount})</option>
              )}
              {infoCount > 0 && (
                <option value="info">{t("app.validationPanel.filterInfoOnly", "Tylko info")} ({infoCount})</option>
              )}
            </select>
          </label>
          <div className="validation-counts">
            <span className="validation-count errors" aria-label={`${t("app.validationPanel.errorsLabel", "Błędy:")} ${errorCount}`}>
              <AppIcon name="validation" size={14} />
              {t("app.validationPanel.errorsLabel", "Błędy:")} {errorCount}
            </span>
            <span className="validation-count warnings" aria-label={`${t("app.validationPanel.warningsLabel", "Ostrzeżenia:")} ${warningCount}`}>
              <AppIcon name="validation" size={14} />
              {t("app.validationPanel.warningsLabel", "Ostrzeżenia:")} {warningCount}
            </span>
            {infoCount > 0 && (
              <span className="validation-count info" aria-label={`${t("app.validationPanel.infoLabel", "Info:")} ${infoCount}`}>
                <AppIcon name="help" size={14} />
                {t("app.validationPanel.infoLabel", "Info:")} {infoCount}
              </span>
            )}
          </div>
        </div>
        {hiddenMessageCount > 0 ? (
          <span className="validation-filter-note">{t("app.validationPanel.hiddenItems", "Ukryto:")} {hiddenMessageCount}</span>
        ) : null}
      </div>

      <RulesReferenceSection />

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
                    {t("app.validationPanel.showAction", "Pokaż")}
                  </span>
                ) : null}
                <span className="validation-expand-indicator">{expandedGroupIds.has(group.id) ? t("app.validationPanel.collapse", "Zwiń") : t("app.validationPanel.expand", "Rozwiń")}</span>
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
                      <span className="validation-code" title={buildRuleTooltip(msg.code, t)}>{msg.code}</span>
                      <span className="validation-message">{msg.message}</span>
                      {msg.details && <span className="validation-details">{msg.details}</span>}
                      {(() => {
                        const remediation = getValidationRemediation(msg.code, t);
                        return remediation ? (
                          <span className="validation-remediation">
                            <AppIcon name="help" size={12} />
                            <strong>{t("app.validationPanel.remediationLabel", "Co zrobić:")}</strong> {remediation}
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
  const { t } = useTranslation();
  const label = severity === "Error" ? t("app.validationPanel.severityError", "Błąd") : severity === "Warning" ? t("app.validationPanel.severityWarning", "Ostrzeżenie") : t("app.validationPanel.severityInfo", "Info");

  return <span className={`validation-severity-badge ${severity.toLowerCase()}`}>{label}</span>;
}

function RulesReferenceSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // Sorted list of all registered rule codes — drawn from the registry so
  // adding a new VAL-XXX entry to `VALIDATION_RULE_DESCRIPTIONS` automatically
  // shows up here without touching this component.
  const entries = useMemo(
    () =>
      Object.entries(VALIDATION_RULE_DESCRIPTIONS).sort(([a], [b]) =>
        a.localeCompare(b, "en", { numeric: true }),
      ),
    [],
  );

  return (
    <section className="card validation-rules-reference">
      <button
        className="validation-rules-reference-header"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <AppIcon name="help" size={14} />
        <strong>{t("app.validationPanel.rulesTitle", "Reguły walidacji")} ({entries.length})</strong>
        <span className="validation-rules-reference-hint">
          {isOpen ? t("app.validationPanel.collapse", "Zwiń") : t("app.validationPanel.showAllRules", "Pokaż wszystkie reguły")}
        </span>
      </button>
      {isOpen && (
        <ul className="validation-rules-reference-list">
          {entries.map(([code, entry]) => (
            <li key={code} className="validation-rules-reference-item">
              <div className="validation-rules-reference-row">
                <span className="validation-code">{code}</span>
                <span className="validation-rules-reference-description">{t(`app.validationRule.${code}.description`, entry.description)}</span>
              </div>
              {entry.normRef && (
                <div className="validation-rules-reference-norm">{t(`app.validationRule.${code}.normRef`, entry.normRef)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SeverityFilterMode = "all" | "errors" | "errors-warnings" | "warnings" | "info";

function severityModeToSet(mode: SeverityFilterMode): Set<ValidationSeverity> {
  switch (mode) {
    case "all":
      return new Set<ValidationSeverity>(["Error", "Warning", "Info"]);
    case "errors":
      return new Set<ValidationSeverity>(["Error"]);
    case "errors-warnings":
      return new Set<ValidationSeverity>(["Error", "Warning"]);
    case "warnings":
      return new Set<ValidationSeverity>(["Warning"]);
    case "info":
      return new Set<ValidationSeverity>(["Info"]);
  }
}

function buildRuleTooltip(code: string, t: (key: string, defaultValue: string) => string): string {
  const entry = getValidationRuleDescription(code, t);
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

function formatReportForClipboard(
  groups: ReturnType<typeof buildValidationDisplayGroupsForSymbols>,
  t: (key: string, defaultValue: string) => string
): string {
  const date = new Date().toISOString().split("T")[0];
  const lines: string[] = [];
  lines.push(`${t("app.validationPanel.reportHeader", "Raport walidacji DINBoard —")} ${date}`);
  lines.push("=".repeat(50));
  lines.push("");

  if (groups.length === 0) {
    lines.push(t("app.validationPanel.reportEmpty", "Brak problemów w wybranym filtrze."));
    return lines.join("\n");
  }

  for (const group of groups) {
    lines.push(`[${group.severity.toUpperCase()}] ${group.title} — ${group.subtitle}`);
    for (const msg of group.messages) {
      lines.push(`  ${msg.code}: ${msg.message}`);
      if (msg.details) lines.push(`    ${msg.details}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function copyReportToClipboard(
  groups: ReturnType<typeof buildValidationDisplayGroupsForSymbols>,
  t: (key: string, defaultValue: string) => string
): Promise<void> {
  const text = formatReportForClipboard(groups, t);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback: select-and-copy via a temporary textarea (older browsers,
    // non-secure contexts). Errors here are silent — clipboard failures
    // should not block the user from continuing work.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(textarea);
  }
}
