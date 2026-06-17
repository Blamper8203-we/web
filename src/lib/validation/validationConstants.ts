/**
 * Constants used by electrical validation rules.
 *
 * Extracted from `electricalValidationService.ts` so that each rule file
 * (and helper) can import the numbers it needs without pulling the whole
 * 26 KB dispatcher into its dependency graph.
 *
 * Numbers here are engineering defaults, not user-tunable. The user-tunable
 * thresholds live on `ValidationConfig` and are passed into `validateProject`
 * at the call site.
 */
import type { SymbolItem } from "../../types/symbolItem";

/**
 * Default phase voltage in volts. Used when no `supplyVoltageV` is passed
 * via `ValidationConfig`. Real installations are nominally 230 V (was 220 V
 * pre-harmonisation, but the unified European nominal is 230 V).
 */
export const PHASE_VOLTAGE = 230;

/**
 * Default imbalance threshold between L1/L2/L3 (percent).
 * Above this we emit a Warning (VAL-001). User can override via
 * `ValidationConfig.imbalanceThresholdPercent`.
 *
 * WHY 30%: PN-HD 60364 does not pin a single number, but 30% is a
 * conservative rule-of-thumb that catches obviously bad designs without
 * flagging reasonable three-phase loads.
 */
export const IMBALANCE_THRESHOLD_PERCENT = 30;

/**
 * Maximum allowed voltage drop for lighting circuits (percent).
 * 3% is the value recommended for lighting in PN-HD 60364.
 */
export const VOLTAGE_DROP_LIMIT_LIGHTING = 3.0;

/**
 * Maximum allowed voltage drop for non-lighting circuits (percent).
 * 5% is the value recommended for "other" loads in PN-HD 60364.
 */
export const VOLTAGE_DROP_LIMIT_OTHER = 5.0;

/**
 * Cable ampacity table (cross-section in mm² → max continuous current in A).
 *
 * WHY: covers the cross-sections used in typical DINBoard projects
 * (1.5 mm² sockets and lighting up to 50 mm² sub-feeders). Values follow
 * PN-HD 60364 / IEC 60364 installation method B1/B2 (cables in conduit on
 * wall). If the table needs to grow (e.g. 70 mm²), add the new entry here
 * and let `getCableCapacity` fall through to the default 0.
 */
export const CABLE_CAPACITY_BY_CROSS_SECTION: Record<number, number> = {
  1.5: 16,
  2.5: 21,
  4: 27,
  6: 36,
  10: 50,
  16: 68,
  25: 89,
  35: 107,
  50: 133,
};

/**
 * Typical minimum cable cross-section per circuit type (mm²).
 * Used by `val-015-cable-data` to flag "could be undersized" cases.
 *
 * WHY: these are the typical Polish/European defaults, not regulatory
 * hard limits. The actual minimums depend on installation method, length
 * and protection coordination. The rule only emits a Warning.
 */
export const MIN_CABLE_CROSS_SECTION_BY_CIRCUIT_TYPE: Partial<
  Record<SymbolItem["circuitType"], number>
> = {
  Oswietlenie: 1.5,
  Gniazdo: 2.5,
  Sila: 2.5,
};
