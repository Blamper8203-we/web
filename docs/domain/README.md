# Dokumentacja domeny (ADR)

Ten katalog utrwala **decyzje domenowe**, które dziś rozumie głównie autor —
sam README nazywa to „największym ukrytym długiem" (bus-factor = 1).

## Metoda (ważne)

Każdy dokument ma dwie wyraźnie oddzielone części:

- **✅ Co (z kodu)** — zachowanie wywnioskowane wprost z kodu, z odnośnikami
  `plik:linia`. To jest zweryfikowane.
- **❓ Dlaczego (do potwierdzenia przez autora)** — intencja/uzasadnienie, którego
  **nie da się** wywnioskować z samego kodu. To są pytania, nie fakty. Autor
  potwierdza lub koryguje. **Nie zgadujemy uzasadnień inżynierskich.**

Gdy autor potwierdzi „dlaczego", przenieś je do części „Co" i usuń znacznik ❓.

## Spis

| Temat | Plik | Status |
|---|---|---|
| Format pliku `.dinboard` | [dinboard-file-format.md](dinboard-file-format.md) | Co: kompletne · Dlaczego: n/d (kontrakt techniczny) |
| `PhaseAssignment` (10 wariantów) | [phase-assignment.md](phase-assignment.md) | Co: kompletne · Dlaczego: 2 pytania |
| Dziedziczenie RCD → MCB | [rcd-inheritance.md](rcd-inheritance.md) | Co: kompletne (kod ma dobre WHY) · Dlaczego: 1 pytanie |
| Odstępy przewodów (`WIRE_THICKNESS_MAP`) | [wire-spacing.md](wire-spacing.md) | Co: kompletne · Dlaczego: 1 pytanie (fallback 4.5) |

## Otwarte tematy (bez własnego ADR — do rozpisania)

- **„Blok rozdzielczy" a skalowanie SVG.** README wymienia pytanie „dlaczego
  Blok rozdzielczy nigdy nie używa skalowania »none«". Z kodu udało się ustalić
  tylko, że w palecie (`src/lib/domain/paletteFormatting.ts:177-185`) kategoria
  „Blok rozdzielczy" (obok Smart Home, `fr`, `spd`, `phaseIndicator`) ma **pusty
  opis fazy** (jest bezfazowy). Aspekt „skalowania »none«" wymaga wskazania przez
  autora konkretnego miejsca w renderze SVG — wtedy powstanie osobny ADR.

---

*Utworzone 2026-07-22 (P2-4). Uzupełniaj przy każdej nietrywialnej decyzji domenowej.*
