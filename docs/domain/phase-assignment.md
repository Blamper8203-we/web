# `PhaseAssignment` — przypisanie fazy

Typ opisujący, do których faz podłączony jest aparat.

## ✅ Co (z kodu)

**10 wariantów** ([`src/types/symbolItem.ts:28-38`](../../src/types/symbolItem.ts)):

| Grupa | Warianty | Znaczenie |
|---|---|---|
| Jednofazowe | `L1`, `L2`, `L3` | jedna faza |
| Dwufazowe | `L1+L2`, `L2+L3`, `L1+L3` | dwie fazy |
| Trójfazowe | `L1+L2+L3`, `3F` | trzy fazy (dwie reprezentacje — patrz ❓) |
| Specjalne | `PE`, `N` | ochronny / neutralny |

> Uwaga: to **10** wariantów, nie 11 (README/plan podawał 11 — nieścisłość skorygowana).

**Kolejność w wariantach dwufazowych jest znacząca.** Kod dystrybucji mocy
rozpoznaje dokładnie `L1+L2`, `L2+L3`, `L1+L3`. Odwrócone zapisy (np. `L3+L1`)
**nie** matchują żadnego case'u i wpadają w gałąź domyślną „tylko L1"
(patrz WHY w `phaseDistributionCalculator.ts` — QW-14 w `zadania do naprawy.md`).
Zawsze zapisuj w kanonicznej kolejności rosnącej.

**Wykrywanie 3-fazowego RCD** dopuszcza `phase === "L1+L2+L3"` jako jeden z sygnałów
([`symbolGrouping.ts:130`](../../src/lib/domain/symbolGrouping.ts)).

## ❓ Dlaczego (do potwierdzenia przez autora)

1. **`3F` vs `L1+L2+L3` — dlaczego dwie reprezentacje trójfazowości?** Kiedy
   używana jest która? Czy `3F` to skrót UI, a `L1+L2+L3` forma kanoniczna w
   danych — czy mają różną semantykę (np. `3F` = symetryczny odbiornik 3-faz bez
   rozbicia na fazy, `L1+L2+L3` = trzy niezależne obwody)? To wpływa na bilans faz.

2. **`PE`/`N` jako `PhaseAssignment` — czy są kiedykolwiek liczone w bilansie mocy?**
   Z założenia nie niosą mocy czynnej. Potwierdź, że są traktowane jako
   „transparentne" w `phaseDistribution` (analogicznie do zamkniętego Q2 o FR).
