import type { CircuitTypeValue, DeviceKind, PhaseAssignment } from "../../types/symbolItem";
import { detectTerminalBlockPinPositions, serialisePinPositions } from "./svgNormalization";

export const CATEGORY_DEFAULT_HEIGHT_MM: Record<string, number> = {
  FR: 80,
  SPD: 90,
  RCD: 83,
  MCB: 83,
  "Kontrolki faz": 83,
  Inne: 85,
};

export function normalizeDetectionText(value: string): string {
  return value
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function matchExplicitPoleCount(value: string): RegExpMatchArray | null {
  const normalizedName = normalizeDetectionText(value);
  return normalizedName.match(/(^|[^0-9])([1-9]|1[0-2])\s*(?:P|POL[A-Z]*|BIEG[A-Z]*|TOR[A-Z]*)([^A-Z0-9]|$)/);
}

export function detectPoleCount(fileName: string): number {
  const normalizedName = normalizeDetectionText(fileName);
  const polePlusNeutralMatch = normalizedName.match(/(^|[^0-9])([1-9]|1[0-2])\s*P\s*\+\s*N([^A-Z0-9]|$)/);
  if (polePlusNeutralMatch) {
    return Number.parseInt(polePlusNeutralMatch[2]!, 10) + 1;
  }

  const match = matchExplicitPoleCount(fileName);
  if (match) {
    return Number.parseInt(match[2]!, 10);
  }

  if (normalizedName.includes("3XPEN")) {
    return 2;
  }

  const trailingNumberMatch = normalizedName.match(/(?:^|[^0-9])(1[0-2]|[2-9])(?:[^0-9]*)$/);
  if (trailingNumberMatch) {
    return Number.parseInt(trailingNumberMatch[1]!, 10);
  }

  return 1;
}

export function detectExplicitPoleCount(fileName: string): number | null {
  const match = matchExplicitPoleCount(fileName);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[2]!, 10);
}

export function isRcdDetectionText(value: string): boolean {
  return value.includes("RCD") || value.includes("RCCB") || value.includes("ROZNIC");
}

export function detectCategory(fileName: string): string {
  const upperName = normalizeDetectionText(fileName);

  if (isRcdDetectionText(upperName)) return "RCD";
  if (upperName.includes("MCB")) return "MCB";
  if (upperName.includes("SPD")) return "SPD";
  if (upperName.includes("FR")) return "FR";
  if (upperName.includes("BLOK")) return "Blok rozdzielczy";
  if (upperName.includes("LISTWA")) return "Listwy zaciskowe";
  if (upperName.includes("ZLACZ") || upperName.includes("PEN")) return "Z\u0142\u0105cza";
  if (upperName.includes("KONTROLK")) return "Kontrolki faz";

  return "Inne";
}

export function detectDeviceKind(category: string): DeviceKind {
  switch (category) {
    case "FR":
      return "fr";
    case "RCD":
      return "rcd";
    case "MCB":
      return "mcb";
    case "SPD":
      return "spd";
    case "Kontrolki faz":
      return "phaseIndicator";
    case "Listwy zaciskowe":
    case "Z\u0142\u0105cza":
    case "Blok rozdzielczy":
      return "terminalBlock";
    default:
      return "other";
  }
}

export function detectType(category: string): string {
  switch (category) {
    case "Kontrolki faz":
      return "Controls";
    default:
      return category;
  }
}

export function detectPhase(category: string, fileName = ""): PhaseAssignment {
  switch (category) {
    case "RCD":
    case "MCB":
    case "FR":
    case "SPD":
      {
        const poleCount = detectExplicitPoleCount(fileName);
        if (poleCount !== null && poleCount < 3) {
          return "L1";
        }
        return "L1+L2+L3";
      }
    case "Listwy zaciskowe":
    case "Z\u0142\u0105cza":
      return "L1+L2+L3";
    default:
      return "L1";
  }
}

export function deriveImportTraits(category: string, fileName = "") {
  return {
    deviceKind: detectDeviceKind(category),
    phase: detectPhase(category, fileName),
    type: detectType(category),
    defaultHeightMm: CATEGORY_DEFAULT_HEIGHT_MM[category],
  };
}

export function storeTerminalBlockPinPositions(
  parameters: Record<string, string>,
  rawSvg: string,
  deviceKind: DeviceKind,
): void {
  if (deviceKind !== "terminalBlock") {
    return;
  }

  const positions = detectTerminalBlockPinPositions(rawSvg);
  if (positions.length >= 2) {
    parameters["_TERMINAL_PIN_POSITIONS"] = serialisePinPositions(positions);
  }
}

export function detectCircuitType(category: string): CircuitTypeValue | undefined {
  return category === "Inne" ? "Inne" : undefined;
}

export function extractPlaceholderDefaults(svgMarkup: string, category: string): Record<string, string> {
  const matches = svgMarkup.match(/\{\{([A-Z0-9_]+)\}\}/g) ?? [];
  const defaults: Record<string, string> = {};

  for (const match of matches) {
    const key = match.slice(2, -2);
    if (defaults[key]) {
      continue;
    }

    switch (key) {
      case "CURRENT":
        defaults[key] = category === "MCB" ? "B16" : "40A";
        break;
      case "SENSITIVITY":
        defaults[key] = "30mA";
        break;
      case "TYPE":
        defaults[key] = "Typ A";
        break;
      case "LABEL":
        defaults[key] = category === "FR" ? "63A" : "";
        break;
      case "BLUE_COVER_VISIBILITY":
      case "BLUE_COVER_VISIBLE":
        defaults[key] = "visible";
        break;
      default:
        defaults[key] = "";
        break;
    }
  }

  return defaults;
}

export function detectRcdRatedCurrent(fileName: string, category: string): number | undefined {
  if (category !== "RCD") {
    return undefined;
  }

  const match = fileName.match(/(?:^|[^0-9])(\d{2,3})\s*A(?:[^a-z]|$)/i);
  if (!match) {
    return undefined;
  }

  const current = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(current) && current > 0 ? current : undefined;
}

export function detectRcdResidualCurrent(fileName: string, category: string): number | undefined {
  if (category !== "RCD") {
    return undefined;
  }

  const match = fileName.match(/(?:^|[^0-9])(\d{2,3})\s*mA(?:[^a-z]|$)/i);
  if (!match) {
    return 30;
  }

  const current = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(current) && current > 0 ? current : 30;
}

export function detectRcdType(fileName: string, category: string): string | undefined {
  if (category !== "RCD") {
    return undefined;
  }

  const match = fileName.match(/(?:typ|type)\s*([A-Z]{1,2})/i);
  return match?.[1]?.toUpperCase() ?? "A";
}
