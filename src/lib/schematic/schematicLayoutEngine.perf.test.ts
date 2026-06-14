/**
 * Performance smoke test dla `buildSchematicLayout`.
 *
 * Cel: wykryć regresje O(n²) lub wycieki pamięci przy dużych projektach.
 * To NIE jest micro-benchmark (Czasy zależą od CI maszyny) — to sanity check
 * że layout silnik nie zamiera przy 200+ modułach. Jeśli ktoś wprowadzi zmianę
 * która spowolni layout z 200ms do 5s, ten test to złapie.
 *
 * NIE testujemy tu renderingu Pixi.js — to wymaga WebGL, którego jsdom nie ma.
 * Renderowanie powinno być testowane osobno (np. integracyjnie z Playwright).
 */
import { describe, expect, it } from "vitest";
import { createDefaultSymbolItem } from "../../types/symbolItem";
import { buildSchematicLayout } from "./schematicLayoutEngine";

// Ile symboli wypełnia typową szafę mieszkaniową? Plan mówi 200+. Testujemy
// realistyczne scenariusze: mała szafa (24), średnia (96), duża (200+).
const SYMBOL_COUNTS = [24, 96, 240];

function makeSymbol(index: number, group: string) {
  return createDefaultSymbolItem({
    id: `s${index}`,
    type: "MCB 1P",
    label: `Obwód ${index + 1}`,
    deviceKind: "mcb",
    circuitName: `Obwód ${index + 1}`,
    group,
    groupName: group,
    x: 100 + index * 17.5, // rozłożone wzdłuż szyny
    rcdSymbolId: `rcd-${group}`,
  });
}

function makeRcdHead(group: string) {
  return createDefaultSymbolItem({
    id: `rcd-${group}`,
    type: "RCD 2P",
    label: "RCD",
    deviceKind: "rcd",
    group,
    groupName: group,
    rcdRatedCurrent: 40,
    rcdResidualCurrent: 30,
    rcdType: "A",
    x: 50,
  });
}

describe("schematicLayoutEngine performance smoke", () => {
  for (const count of SYMBOL_COUNTS) {
    it(`handles ${count} modules without crashing or timing out`, () => {
      // Rozkład: 10 RCD heads, każdy z `(count-10)/10` MCB w swojej grupie.
      const groupCount = 10;
      const perGroup = Math.floor((count - groupCount) / groupCount);

      const symbols: ReturnType<typeof createDefaultSymbolItem>[] = [];
      for (let g = 0; g < groupCount; g++) {
        symbols.push(makeRcdHead(`G${g}`));
        for (let i = 0; i < perGroup; i++) {
          symbols.push(makeSymbol(g * perGroup + i, `G${g}`));
        }
      }
      // Dopełnij do oczekiwanej liczby (gdy nie dzieli się równo)
      while (symbols.length < count) {
        symbols.push(makeSymbol(symbols.length, `G${symbols.length % groupCount}`));
      }

      expect(symbols.length).toBeGreaterThanOrEqual(count);

      const start = performance.now();
      const result = buildSchematicLayout(symbols);
      const elapsedMs = performance.now() - start;

      // Layout musi zakończyć się w rozsądnym czasie. Na maszynie CI
      // (2 vCPU) limit to 5s. Lokalnie powinno być <1s. Jeśli test
      // zaczyna failować po zmianie w silniku, to sygnał że złożoność
      // poszła w złą stronę.
      expect(elapsedMs).toBeLessThan(5000);

      // Sanity: layout wyprodukował sensowną liczbę nodów.
      // Uwaga: layout może wyprodukować WIĘCEJ nodów niż symboli, bo
      // RCD head z >9 obwodami jest dzielony na chunki (każdy chunk
      // to osobny node). 240 symboli → do 260 nodów to normalne.
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.length).toBeLessThan(symbols.length * 2);
    });
  }

  it("memory: 240 modules run twice without unbounded growth", () => {
    // Sprawdzenie że layout nie akumuluje stanu między wywołaniami.
    // Prosty check: drugi przebieg z innymi danymi nie powinien być
    // drastycznie wolniejszy niż pierwszy (a już na pewno nie O(n²)).
    const build = (offset: number) => {
      const symbols = Array.from({ length: 240 }, (_, i) =>
        createDefaultSymbolItem({
          id: `mem-${offset}-${i}`,
          type: "MCB 1P",
          deviceKind: "mcb",
          group: `G${(i + offset) % 10}`,
          groupName: `G${(i + offset) % 10}`,
          x: 100 + i * 17.5,
        }),
      );
      return symbols;
    };

    const t0 = performance.now();
    buildSchematicLayout(build(0));
    const firstMs = performance.now() - t0;

    const t1 = performance.now();
    buildSchematicLayout(build(1000));
    const secondMs = performance.now() - t1;

    // Drugi przebieg nie powinien być wielokrotnie wolniejszy
    // (akceptuję 3x margines na GC i cache effects).
    expect(secondMs).toBeLessThan(firstMs * 3 + 50);
  });
});
