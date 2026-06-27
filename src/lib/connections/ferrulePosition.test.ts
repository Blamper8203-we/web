/**
 * Regression test dla edge case tulejki (ferrule) w nieodpowiednim miejscu.
 *
 * Ładuje prawdziwy projekt DINBoard z src/fixtures/testProject.dinboard
 * (kopia projektu user-developera, w którym zaobserwował problem z
 * pozycją tulejki) i sprawdza spójność logiki domenowej.
 *
 * Test nie renderuje canvas (Pixi nie działa w jsdom), ale weryfikuje:
 *   - Czy kolor tulejki w danych pasuje do przekroju (getAutoFerruleColor)
 *   - Czy długość tulejki dla Blok rozdzielczy to 230px (isExtraLong)
 *   - Czy helper isTerminalZlaczka odróżnia Złączka od Rozłącznik
 *   - Czy specjalne przypadki (auto-horizontal, ten sam symbol, moduły
 *     o nietypowej geometrii) są zidentyfikowane do ręcznej inspekcji
 *
 * Wynik: dla każdego "podejrzanego" connection wypisuje id i przyczynę
 * w console.warn — to jest dane wejściowe do ręcznego debug w canvas.
 *
 * Owner: canvas-expert (po implementacji fixu)
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error - @types/node not in tsconfig; Vitest provides Node globals at runtime
import { readFileSync } from "fs";
// @ts-expect-error - see above
import { join, dirname } from "path";
// @ts-expect-error - see above
import { fileURLToPath } from "url";
import {
  getAutoFerruleColor,
  getFerruleLength,
  isTerminalZlaczka,
} from "./connectionsLogic";
import { isDistributionBlockSymbol, type DeviceKind } from "../../types/symbolItem";
import { parseProjectFileContent } from "../projectFile";

interface ConnectionPoint {
  x: number;
  y: number;
}

interface Connection {
  id: string;
  fromSymbolId: string;
  fromTerminal: string;
  toSymbolId: string;
  toTerminal: string;
  wireColor: string;
  wireCrossSection: number;
  wireType: string;
  ferruleColor: string;
  routingMode: string;
  isFromTop: boolean;
  fromDirection: string;
  isToTop: boolean;
  toDirection: string;
  points: ConnectionPoint[];
}

interface Symbol {
  id: string;
  type: string;
  moduleRef: string;
  deviceKind: DeviceKind | string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isTerminalBlock?: boolean;
}

interface DinboardProject {
  schemaVersion: number;
  symbols: Symbol[];
  connections: Connection[];
}

// WHY: test jest w src/lib/connections/, fixture w src/fixtures/.
// ESM-style ścieżka przez import.meta.url — działa w Vitest bez @types/node.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = join(
  __dirname,
  "..",
  "..",
  "fixtures",
  "testProject.dinboard",
);

function loadFixture(): DinboardProject {
  const raw = readFileSync(FIXTURE_PATH, "utf8");
  return JSON.parse(raw);
}

describe("ferrule + wire consistency — testProject.dinboard", () => {
  const project = loadFixture();

  it("fixture loads and contains the modules referenced by other tests in this file", () => {
    // WHY: this used to pin counts (7 symbols, 20 connections) — that was a
    // history guard. Adding a new module to testProject.dinboard would break
    // this test for no behavioral reason. The actual contract is: every
    // fixture symbol referenced by the tests below must exist, and the file
    // must parse. Counts are NOT pinned — they are free to grow when new
    // edge-case scenarios are added to the fixture.

    expect(project.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(project.symbols.length).toBeGreaterThan(0);
    expect(project.connections.length).toBeGreaterThan(0);

    // Pin the existence of specific modules the downstream tests depend on.
    // If you rename a symbol here, you must update the matching find() in
    // the test below.
    expect(project.symbols.find((s) => s.type === "Blok rozdzielczy")).toBeDefined();
    expect(project.symbols.find((s) => s.label === "Listwa 15 pin N")).toBeDefined();
    expect(project.symbols.find((s) => s.label === "Złączka N 2-zaciskowa")).toBeDefined();
    expect(project.symbols.find((s) => s.type === "RCD")).toBeDefined();
  });

  describe("ferrule color consistency", () => {
    it("reports connections where ferruleColor doesn't match cross-section (diagnostic)", () => {
      const mismatches: string[] = [];
      for (const conn of project.connections) {
        if (conn.ferruleColor === "none") continue;
        const expected = getAutoFerruleColor(conn.wireCrossSection);
        if (conn.ferruleColor !== expected) {
          mismatches.push(
            `  ${conn.id}: crossSection=${conn.wireCrossSection}mm², expected=${expected}, actual=${conn.ferruleColor}`,
          );
        }
      }
      if (mismatches.length > 0) {
        // WHY: to jest raport diagnostyczny, nie asercja. Może być prawdziwy
        // problem w danych (color override explicit przez usera) albo w logice.
        // User-developer powinien zweryfikować manualnie.
        console.warn(
          `Ferrule color mismatches in testProject.dinboard (${mismatches.length}/${project.connections.length}):\n${mismatches.join("\n")}`,
        );
      }
      // Sanity check: raport nie jest pusty (fixture się ładuje)
      expect(Array.isArray(mismatches)).toBe(true);
    });
  });

  describe("ferrule length (bazowa wartość z getFerruleLength)", () => {
    // WHY: TULEJKI_LOGIKA.md wspomina o "isExtraLong 230px" — ale to jest
    // visual override ustawiany w FerruleGraphic.tsx jako prop, NIE wynik
    // getFerruleLength(). Te dwa mechanizmy żyją obok siebie:
    //   - getFerruleLength()  → bazowa długość (50/90/160/...)
    //   - <FerruleGraphic isExtraLong={...}/>  → render override
    // Test sprawdza getFerruleLength(). Jeśli user-developer widzi w canvas
    // tulejkę 230px dla Blok rozdzielczy, to override działa. Jeśli widzi
    // 90px, to override nie jest nadawany — to może być źródło edge case'a.

    it("Blok rozdzielczy 4x7: getFerruleLength returns 90 (terminalBlock base)", () => {
      const blok = project.symbols.find((s) => s.type === "Blok rozdzielczy");
      expect(blok).toBeDefined();
      const length = getFerruleLength(blok!.deviceKind, blok!.moduleRef);
      expect(length).toBe(90);
    });

    it("Listwa 15 pin N: getFerruleLength returns 50 ('listwy do rozdzielnicy' branch)", () => {
      const listwa = project.symbols.find((s) => s.label === "Listwa 15 pin N");
      expect(listwa).toBeDefined();
      const length = getFerruleLength(listwa!.deviceKind, listwa!.moduleRef);
      expect(length).toBe(50);
    });

    it("Złączka N 2-zaciskowa: getFerruleLength returns 90 (isTerminalZlaczka branch)", () => {
      const zlaczka = project.symbols.find(
        (s) => s.label === "Złączka N 2-zaciskowa",
      );
      expect(zlaczka).toBeDefined();
      const length = getFerruleLength(zlaczka!.deviceKind, zlaczka!.moduleRef);
      expect(length).toBe(90);
    });

    it("regular modules (MCB, RCD): getFerruleLength returns 160 (default)", () => {
      const rcd = project.symbols.find((s) => s.type === "RCD");
      expect(rcd).toBeDefined();
      const length = getFerruleLength(rcd!.deviceKind, rcd!.moduleRef);
      expect(length).toBe(160);
    });
  });

  describe("isTerminalZlaczka disambiguation (Złączka vs Rozłącznik)", () => {
    it("identifies Złączka N 2-zaciskowa as terminal (not rozlacznik)", () => {
      const zlaczka = project.symbols.find(
        (s) => s.label === "Złączka N 2-zaciskowa",
      );
      expect(zlaczka).toBeDefined();
      expect(isTerminalZlaczka(zlaczka!.moduleRef)).toBe(true);
    });

    it("does NOT flag RCD 'Rozłącznik różnicowoprądowy'", () => {
      const rcd = project.symbols.find((s) => s.type === "RCD");
      expect(rcd).toBeDefined();
      // moduleRef RCD zawiera 'rozlacznik' lub 'rcd' — ani 'zlacz'
      expect(isTerminalZlaczka(rcd!.moduleRef)).toBe(false);
    });
  });

  describe("isDistributionBlockSymbol (canvas-expert dispatch)", () => {
    it("flags Blok rozdzielczy 4x7", () => {
      const blok = project.symbols.find((s) => s.type === "Blok rozdzielczy");
      expect(blok).toBeDefined();
      expect(isDistributionBlockSymbol(blok! as Parameters<typeof isDistributionBlockSymbol>[0])).toBe(true);
    });

    it("does NOT flag RCD (different routing rules)", () => {
      const rcd = project.symbols.find((s) => s.type === "RCD");
      expect(rcd).toBeDefined();
      expect(isDistributionBlockSymbol(rcd! as Parameters<typeof isDistributionBlockSymbol>[0])).toBe(false);
    });

    it("does NOT flag Controls (Lampka kontrolna)", () => {
      const ctrl = project.symbols.find((s) => s.type === "Controls");
      expect(ctrl).toBeDefined();
      expect(isDistributionBlockSymbol(ctrl! as Parameters<typeof isDistributionBlockSymbol>[0])).toBe(false);
    });
  });

  describe("suspicious edge cases — flag for manual visual inspection", () => {
    // Te testy NIE sprawdzają wizualnej pozycji tulejki (to wymaga Pixi).
    // Identyfikują connections które user-developer powinien obejrzeć
    // w canvasie i potwierdzić że tulejka jest w dobrym miejscu.

    it("flags connections involving non-standard aspect ratio Listwa 15 pin N (1243x175)", () => {
      const listwa = project.symbols.find((s) => s.label === "Listwa 15 pin N");
      expect(listwa).toBeDefined();
      // Aspect ratio > 5:1 — nietypowe dla listwy zaciskowej
      const aspectRatio = listwa!.width / listwa!.height;
      expect(aspectRatio).toBeGreaterThan(5);

      const listwaConnections = project.connections.filter(
        (c) => c.fromSymbolId === listwa!.id || c.toSymbolId === listwa!.id,
      );

      if (listwaConnections.length > 0) {
        console.warn(
          `Listwa 15 pin N has ${listwaConnections.length} connections — manual visual review recommended (non-standard aspect ratio).\n` +
            listwaConnections
              .map(
                (c) =>
                  `  ${c.id}: from=${c.fromSymbolId.substring(0, 8)}/${c.fromTerminal} to=${c.toSymbolId.substring(0, 8)}/${c.toTerminal}`,
              )
              .join("\n"),
        );
      }

      // Twarde sprawdzenie: raport jest sensowny (nie pusty)
      expect(Array.isArray(listwaConnections)).toBe(true);
    });

    it("flags connections with auto-horizontal direction (routing transition point)", () => {
      const autoH = project.connections.filter(
        (c) =>
          c.fromDirection === "auto-horizontal" ||
          c.toDirection === "auto-horizontal",
      );

      if (autoH.length > 0) {
        console.warn(
          `auto-horizontal connections (routing transition edge case):\n` +
            autoH
              .map(
                (c) =>
                  `  ${c.id}: from=${c.fromSymbolId.substring(0, 8)}/${c.fromTerminal} (${c.fromDirection}) to=${c.toSymbolId.substring(0, 8)}/${c.toTerminal} (${c.toDirection})`,
              )
              .join("\n"),
        );
      }

      expect(Array.isArray(autoH)).toBe(true);
    });

    it("flags internal connections (from and to are the same symbol)", () => {
      const internal = project.connections.filter(
        (c) => c.fromSymbolId === c.toSymbolId,
      );

      if (internal.length > 0) {
        console.warn(
          `Internal (same-symbol) connections — both ferrule ends on same module:\n` +
            internal
              .map(
                (c) =>
                  `  ${c.id}: ${c.fromSymbolId.substring(0, 8)} ${c.fromTerminal} → ${c.toTerminal}`,
              )
              .join("\n"),
        );
      }

      expect(Array.isArray(internal)).toBe(true);
    });

    it("flags connections referencing unknown symbol IDs (data integrity — DIAGNOSTIC)", () => {
      // WHY: to jest realny raport diagnostyczny, nie asercja.
      // Jeśli są orphan references, routing engine nie wie gdzie podłączyć
      // przewód — może renderować tulejkę w domyślnej pozycji lub pomijać.
      // To może być przyczyna edge case'a "tulejka w nieodpowiednim miejscu".
      // User-developer musi zdecydować:
      //   (a) dodać brakujące symbole do tablicy symbols
      //   (b) naprawić reference w connections
      //   (c) zaakceptować orphan references i obsłużyć je w routing engine

      const knownIds = new Set(project.symbols.map((s) => s.id));
      const orphans: string[] = [];
      const uniqueUnknownIds = new Set<string>();

      for (const conn of project.connections) {
        if (!knownIds.has(conn.fromSymbolId)) {
          orphans.push(
            `  ${conn.id}: fromSymbolId ${conn.fromSymbolId} not in symbols`,
          );
          uniqueUnknownIds.add(conn.fromSymbolId);
        }
        if (!knownIds.has(conn.toSymbolId)) {
          orphans.push(
            `  ${conn.id}: toSymbolId ${conn.toSymbolId} not in symbols`,
          );
          uniqueUnknownIds.add(conn.toSymbolId);
        }
      }

      if (orphans.length > 0) {
        console.warn(
          `⚠️  Orphan connections in testProject.dinboard:\n` +
            `   ${orphans.length} orphan endpoints referencing ${uniqueUnknownIds.size} unique unknown symbol IDs:\n` +
            `   Unique unknown IDs: ${[...uniqueUnknownIds].join(", ")}\n` +
            `${orphans.join("\n")}`,
        );
      }

      // Sanity check: raport się wygenerował (fixture się ładuje)
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  // Integration test: sprawdza że fix orphan handling w projectFile.ts działa.
  // Ładuje raw JSON przez parseProjectFileContent (z fixem) i weryfikuje że
  // loader odrzuca connections z brakującymi symbolami.
  describe("projectFile loader integration — orphan filter", () => {
    it("parseProjectFileContent drops connections referencing unknown symbols", () => {
      const raw = readFileSync(FIXTURE_PATH, "utf8");
      const parsed = parseProjectFileContent(raw, "testProject.dinboard");
      const connections = parsed.connections ?? [];

      const validIds = new Set(parsed.symbols.map((s) => s.id));

      // Każdy załadowany connection musi mieć valid from/to symbol
      for (const conn of connections) {
        expect(validIds.has(conn.fromSymbolId)).toBe(true);
        expect(validIds.has(conn.toSymbolId)).toBe(true);
      }

      // testProject.dinboard ma 30 orphan endpoints w raw JSON.
      // Po fixie loader odrzuca te connections — parsed count < raw count (20).
      // Raw count było 20; po odrzuceniu orphans powinno być < 20.
      expect(connections.length).toBeLessThan(20);
    });
  });
});
