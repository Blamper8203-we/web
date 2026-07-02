import { t } from "i18next";
/**
 * Validation rule descriptions — short explanation shown as a tooltip on the
 * rule code in the validation panel, plus an optional norm reference and
 * remediation hint ("what the user should do next").
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
 * description when present. `remediation` is a short imperative hint
 * shown under the finding — what the user should do next.
 *
 * Note: do NOT use ASCII double-quotes inside string values, they will
 * close the string early. Polish typographic quotes (COMMA QUOTES) or
 * single quotes are fine.
 */

export interface ValidationRuleDescription {
  description: string;
  normRef?: string;
  remediation?: string;
}

export const VALIDATION_RULE_DESCRIPTIONS: Record<string, ValidationRuleDescription> = {
  "VAL-001": {
    description: t("auto.sprawdzaczyobci_667", "Sprawdza czy obciążenie L1/L2/L3 nie różni się o więcej niż próg asymetrii (domyślnie 30%)."),
    normRef: "Polska praktyka inżynierska; PN-HD 60364 nie pinna konkretnej wartości.",
    remediation: "Kliknij zakładkę Bilans → przycisk «Zastosuj bilans» aby przenieść obwody na mniej obciążone fazy.",
  },
  "VAL-002": {
    description: t("auto.sprawdzaczyprdo_156", "Sprawdza czy prąd obwodu nie przekracza dopuszczalnej obciążalności kabla."),
    normRef: "IEC 60364 — dobór kabla do zabezpieczenia.",
    remediation: "Zwiększ przekrój kabla albo zmniejsz zabezpieczenie obwodu. Kliknij obwód → Edytuj zabezpieczenie lub przekrój.",
  },
  "VAL-003": {
    description: t("auto.sprawdzaczyzabe_222", "Sprawdza czy zabezpieczenie nadprądowe nie jest większe niż obciążalność kabla (poza margines 1,45×)."),
    normRef: "IEC 60364 §433.",
    remediation: "Zmniejsz zabezpieczenie lub zwiększ przekrój kabla. Kliknij obwód → Edytuj.",
  },
  "VAL-004": {
    description: t("auto.sprawdzaczyspad_546", "Sprawdza czy spadek napięcia na kablu mieści się w limicie (3% dla oświetlenia, 5% dla gniazd i siły)."),
    normRef: "PN-HD 60364 §525.",
    remediation: "Zwiększ przekrój kabla lub skróć obwód. Kliknij obwód → Edytuj przekrój lub długość.",
  },
  "VAL-005": {
    description: t("auto.sprawdzaczyzabe_990", "Sprawdza czy zabezpieczenie nie jest tak duże, że kabel jest bez ochrony przy przeciążeniu (próg 1,45 × obciążalność)."),
    normRef: "IEC 60364 §433.1.",
    remediation: "Dopasuj zabezpieczenie do przekroju kabla — zmniejsz prąd zabezpieczenia lub zwiększ przekrój.",
  },
  "VAL-006": {
    description: t("auto.sprawdzaczyobwd_806", "Sprawdza czy obwód (gniazdo, oświetlenie) ma przypisany RCD."),
    normRef: "PN-HD 60364 §415.1 (ochrona dodatkowa ≤ 30 mA).",
    remediation: "Dodaj RCD 30 mA przed tym obwodem lub przypisz obwód do istniejącego RCD. Zakładka «Zarządzanie RCD».",
  },
  "VAL-007": {
    description: t("auto.sprawdzaczynajw_835", "Sprawdza czy największy prąd fazowy nie przekracza znamionowego prądu FR lub zabezpieczenia głównego."),
    normRef: "IEC 60364 — dobór zabezpieczenia głównego.",
    remediation: "Zmniejsz obciążenie fazy (przenieś obwody do innej fazy w zakładce Bilans) lub wymień FR na wyższy prąd.",
  },
  "VAL-008": {
    description: t("auto.sprawdzaczysuma_414", "Sprawdza czy suma znamionowych prądów zabezpieczeń obwodów nie przekracza prądu znamionowego RCD (podejście konserwatywne — bez współczynnika jednoczesności)."),
    remediation: "Rozdziel obwody na dwa RCD lub wymień RCD na wyższy prąd znamionowy.",
  },
  "VAL-009": {
    description: t("auto.sprawdzaczypodr_815", "Sprawdza czy podrzędny RCD nie ma większego prądu różnicowego niż nadrzędny (naruszona selektywność kaskady)."),
    remediation: "Wymień jeden z RCD tak, aby podrzędny miał mniejszy lub równy prąd różnicowy niż nadrzędny.",
  },
  "VAL-010": {
    description: t("auto.sprawdzaczyobwd_329", "Sprawdza czy obwód 1-fazowy pod 1-fazowym RCD jest na tej samej fazie co RCD."),
    remediation: "Przypisz obwód do tej samej fazy co RCD. Kliknij obwód → Edytuj fazę.",
  },
  "VAL-011": {
    description: t("auto.sprawdzaczytypr_507", "Sprawdza czy typ RCD (AC/A/F/B) jest wystarczający dla typu odbiornika (PV → B, pompa ciepła → F/B, indukcja → A)."),
    remediation: "Wymień RCD na typ zalecany dla tego odbiornika (typ A dla indukcji, F/B dla pompy ciepła, B dla PV/EV).",
  },
  "VAL-012": {
    description: t("auto.informujeobraku_712", "Informuje o brakujących parametrach RCBO (zabezpieczenie nadprądowe, prąd różnicowy, typ RCD)."),
    remediation: "Kliknij obwód → Edytuj zabezpieczenie / typ RCD / prąd różnicowy.",
  },
  "VAL-013": {
    description: t("auto.sprawdzaczyzabe_75", "Sprawdza czy zabezpieczenie nadprądowe RCBO nie przekracza jego prądu znamionowego."),
    remediation: "Dopasuj zabezpieczenie nadprądowe do prądu znamionowego RCBO.",
  },
  "VAL-014": {
    description: t("auto.sprawdzaczyprdr_834", "Sprawdza czy prąd różnicowy RCBO w obwodzie wymagającym ochrony dodatkowej nie jest większy niż 30 mA."),
    normRef: "PN-HD 60364 §415.1.",
    remediation: "Wymień RCBO na wersję 30 mA.",
  },
  "VAL-015": {
    description: t("auto.informujeobraku_41", "Informuje o brakującym przekroju kabla albo przekroju spoza tabeli obciążalności."),
    remediation: "Kliknij obwód → Edytuj przekrój kabla.",
  },
  "VAL-016": {
    description: t("auto.informujeobraku_904", "Informuje o brakującej długości kabla (potrzebna do obliczenia spadku napięcia)."),
    remediation: "Kliknij obwód → Edytuj długość kabla.",
  },
  "VAL-017": {
    description: t("auto.informujeoprzek_313", "Informuje o przekroju kabla poniżej typowego minimum dla danego typu obwodu (np. gniazdo < 2,5 mm²)."),
    remediation: "Rozważ zwiększenie przekroju kabla do typowego minimum (2,5 mm² dla gniazd, 1,5 mm² dla oświetlenia).",
  },
  "VAL-018": {
    description: t("auto.informujeobraku_483", "Informuje o brakującej nazwie obwodu (dla czytelności dokumentacji)."),
    remediation: "Kliknij obwód → Edytuj nazwę obwodu.",
  },
  "VAL-019": {
    description: t("auto.informujeobraku_738", "Informuje o brakującej lokalizacji obwodu."),
    remediation: "Kliknij obwód → Edytuj lokalizację.",
  },
  "VAL-020": {
    description: t("auto.ostrzegaobrakuj_712", "Ostrzega o brakującej mocy obwodu (potrzebna do obliczeń bilansu, prądu i spadku napięcia)."),
    remediation: "Kliknij obwód → Edytuj moc (W).",
  },
  "VAL-021": {
    description: t("auto.ostrzegaobrakuj_660", "Ostrzega o brakującym zabezpieczeniu nadprądowym obwodu (np. B16, C20)."),
    remediation: "Kliknij obwód → Edytuj zabezpieczenie (np. B16, C20).",
  },
  "VAL-022": {
    description: t("auto.ostrzegagdyprdr_207", "Ostrzega gdy prąd różnicowy RCD nadrzędnego jest mniejszy niż 3× podrzędnego (brak selektywności kaskady)."),
    remediation: "Wymień RCD nadrzędny na wyższy prąd różnicowy (np. 300 mA → 30 mA w kaskadzie).",
  },
  "VAL-023": {
    description: t("auto.ostrzegagdyzabe_621", "Ostrzega gdy zabezpieczenie obwodu jest równe lub większe od zabezpieczenia głównego (brak koordynacji selektywnej)."),
    remediation: "Zmniejsz zabezpieczenie obwodu poniżej zabezpieczenia głównego (np. FR 63A → MCB max 40A).",
  },
};

/**
 * Returns the description for a validation code, or null if the code is
 * unknown (e.g. a future rule that hasn't been documented yet). Callers
 * should handle null gracefully — typically by not rendering the tooltip.
 */
export function getValidationRuleDescription(code: string, t?: (key: string, defaultValue: string) => string): ValidationRuleDescription | null {
  const entry = VALIDATION_RULE_DESCRIPTIONS[code];
  if (!entry) return null;
  
  if (!t) return entry;

  return {
    ...entry,
    description: t(`app.validationRule.${code}.description`, entry.description),
    normRef: entry.normRef ? t(`app.validationRule.${code}.normRef`, entry.normRef) : undefined,
    remediation: entry.remediation ? t(`app.validationRule.${code}.remediation`, entry.remediation) : undefined,
  };
}

/**
 * Returns the short remediation hint for a validation code, or null if
 * the rule has no documented remediation. The hint is a Polish imperative
 * sentence (Kliknij..., Przenieś...) describing what the user should
 * do to fix the finding.
 */
export function getValidationRemediation(code: string, t?: (key: string, defaultValue: string) => string): string | null {
  const entry = VALIDATION_RULE_DESCRIPTIONS[code];
  if (!entry || !entry.remediation) return null;
  
  if (!t) return entry.remediation;

  return t(`app.validationRule.${code}.remediation`, entry.remediation);
}