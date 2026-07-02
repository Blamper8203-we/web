import { t } from "i18next";
import type { ValidationMessage } from "./electricalValidationService";

export interface ValidationEditTarget {
  fieldKey: string;
  label: string;
}

export function getValidationEditTargetForMessage(message: ValidationMessage): ValidationEditTarget | null {
  switch (message.code) {
    case "VAL-010":
      return { fieldKey: "Phase", label: t("auto.edytujfaz_972", "Edytuj fazę") };
    case "VAL-012":
      return getRcboEditTarget(message);
    case "VAL-015":
    case "VAL-017":
      return { fieldKey: "CableCrossSection", label: t("auto.edytujprzekrj_985", "Edytuj przekrój") };
    case "VAL-016":
      return { fieldKey: "CableLength", label: t("auto.edytujdugo_812", "Edytuj długość") };
    case "VAL-018":
      return { fieldKey: "CircuitName", label: t("auto.edytujnazw_47", "Edytuj nazwę") };
    case "VAL-019":
      return { fieldKey: "Location", label: t("auto.edytujlokalizac_181", "Edytuj lokalizację") };
    case "VAL-020":
      return { fieldKey: "PowerW", label: t("auto.edytujmoc_972", "Edytuj moc") };
    case "VAL-021":
      return { fieldKey: "ProtectionType", label: t("auto.edytujzabezpiec_645", "Edytuj zabezpieczenie") };
    default:
      return null;
  }
}

function getRcboEditTarget(message: ValidationMessage): ValidationEditTarget | null {
  const text = normalizeText(message.message, message.details);
  if (text.includes("nadpradow")) {
    return { fieldKey: "ProtectionType", label: t("auto.edytujzabezpiec_278", "Edytuj zabezpieczenie") };
  }

  return null;
}

function normalizeText(...values: Array<string | undefined>): string {
  return values
    .join(" ")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL");
}
