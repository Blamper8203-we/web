/**
 * Validation rule descriptions — short explanation shown as a tooltip on the
 * rule code in the validation panel, plus an optional norm reference.
 *
 * WHY a registry file (vs. embedding the description in each rule):
 *  - rules stay focused on detection logic
 *  - UI text lives in one place that's easy to localize / expand
 *  - rules that share a code family (e.g. VAL-002/003/004 all live in
 *    `val-002-cable-safety.ts`) can declare descriptions independently
 *
 * `description` is one sentence in plain Polish — what the rule actually
 * checks. `normRef` is an optional pointer to the standard section it
 * follows (PN-HD 60364 or IEC 60364), shown italicized after the
 * description when present.
 */

export interface ValidationRuleDescription {
  description: string;
  normRef?: string;
}

export const VALIDATION_RULE_DESCRIPTIONS: Record<string, ValidationRuleDescription> = {
  "VAL-001": {
    description: "Sprawdza czy obciążenie L1/L2/L3 nie różni się o więcej niż próg asymetrii (domyślnie 30%).",
    normRef: "Polska praktyka inżynierska; PN-HD 60364 nie pinna konkretnej wartości.",
  },
  "VAL-002": {
    description: "Sprawdza czy prąd obwodu nie przekracza dopuszczalnej obciążalności kabla.",
    normRef: "IEC 60364 — dobór kabla do zabezpieczenia.",
  },
  "VAL-003": {
    description: "Sprawdza czy zabezpieczenie nadprądowe nie jest większe niż obciążalność kabla (poza margines 1,45×).",
    normRef: "IEC 60364 §433.",
  },
  "VAL-004": {
    description: "Sprawdza czy spadek napięcia na kablu mieści się w limicie (3% dla oświetlenia, 5% dla gniazd i siły).",
    normRef: "PN-HD 60364 §525.",
  },
  "VAL-005": {
    description: "Sprawdza czy zabezpieczenie nie jest tak duże, że kabel jest bez ochrony przy przeciążeniu (próg 1,45 × obciążalność).",
    normRef: "IEC 60364 §433.1.",
  },
  "VAL-006": {
    description: "Sprawdza czy obwód (gniazdo, oświetlenie) ma przypisany RCD.",
    normRef: "PN-HD 60364 §415.1 (ochrona dodatkowa ≤ 30 mA).",
  },
  "VAL-007": {
    description: "Sprawdza czy największy prąd fazowy nie przekracza znamionowego prądu FR lub zabezpieczenia głównego.",
    normRef: "IEC 60364 — dobór zabezpieczenia głównego.",
  },
  "VAL-008": {
    description: "Sprawdza czy suma znamionowych prądów zabezpieczeń obwodów nie przekracza prądu znamionowego RCD (podejście konserwatywne — bez współczynnika jednoczesności).",
  },
  "VAL-009": {
    description: "Sprawdza czy podrzędny RCD nie ma większego prądu różnicowego niż nadrzędny (naruszona selektywność kaskady).",
  },
  "VAL-010": {
    description: "Sprawdza czy obwód 1-fazowy pod 1-fazowym RCD jest na tej samej fazie co RCD.",
  },
  "VAL-011": {
    description: "Sprawdza czy typ RCD (AC/A/F/B) jest wystarczający dla typu odbiornika (PV → B, pompa ciepła → F/B, indukcja → A).",
  },
  "VAL-012": {
    description: "Informuje o brakujących parametrach RCBO (zabezpieczenie nadprądowe, prąd różnicowy, typ RCD).",
  },
  "VAL-013": {
    description: "Sprawdza czy zabezpieczenie nadprądowe RCBO nie przekracza jego prądu znamionowego.",
  },
  "VAL-014": {
    description: "Sprawdza czy prąd różnicowy RCBO w obwodzie wymagającym ochrony dodatkowej nie jest większy niż 30 mA.",
    normRef: "PN-HD 60364 §415.1.",
  },
  "VAL-015": {
    description: "Informuje o brakującym przekroju kabla albo przekroju spoza tabeli obciążalności.",
  },
  "VAL-016": {
    description: "Informuje o brakującej długości kabla (potrzebna do obliczenia spadku napięcia).",
  },
  "VAL-017": {
    description: "Informuje o przekroju kabla poniżej typowego minimum dla danego typu obwodu (np. gniazdo < 2,5 mm²).",
  },
  "VAL-018": {
    description: "Informuje o brakującej nazwie obwodu (dla czytelności dokumentacji).",
  },
  "VAL-019": {
    description: "Informuje o brakującej lokalizacji obwodu.",
  },
  "VAL-020": {
    description: "Ostrzega o brakującej mocy obwodu (potrzebna do obliczeń bilansu, prądu i spadku napięcia).",
  },
  "VAL-021": {
    description: "Ostrzega o brakującym zabezpieczeniu nadprądowym obwodu (np. B16, C20).",
  },
  "VAL-022": {
    description: "Ostrzega gdy prąd różnicowy RCD nadrzędnego jest mniejszy niż 3× podrzędnego (brak selektywności kaskady).",
  },
  "VAL-023": {
    description: "Ostrzega gdy zabezpieczenie obwodu jest równe lub większe od zabezpieczenia głównego (brak koordynacji selektywnej).",
  },
};

/**
 * Returns the description for a validation code, or null if the code is
 * unknown (e.g. a future rule that hasn't been documented yet). Callers
 * should handle null gracefully — typically by not rendering the tooltip.
 */
export function getValidationRuleDescription(code: string): ValidationRuleDescription | null {
  return VALIDATION_RULE_DESCRIPTIONS[code] ?? null;
}