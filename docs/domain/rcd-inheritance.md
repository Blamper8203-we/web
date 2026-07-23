# Dziedziczenie RCD → MCB

Aparaty podrzędne (MCB) dziedziczą informację o zabezpieczeniu różnicowoprądowym
(RCD) od aparatu, pod który są „podpięte" (snap target).

## ✅ Co (z kodu)

Funkcja [`applyInheritedRcdInfo(symbols, symbol, snapTarget)`](../../src/lib/domain/symbolGrouping.ts)
([`symbolGrouping.ts:93-117`](../../src/lib/domain/symbolGrouping.ts)):

1. **Głowa grupy nie dziedziczy** — jeśli `isGroupHeadSymbol(symbol)` → return
   (RCD-głowa jest źródłem, nie odbiorcą).
2. Wyznacza `rcdSource = resolveRcdSource(symbols, snapTarget)`.
3. **Brak źródła RCD (lub źródło = ten sam symbol)** → zeruje **wszystkie cztery**
   pola RCD razem: `rcdSymbolId=""`, `rcdRatedCurrent=0`, `rcdResidualCurrent=0`,
   `rcdType=""`.
4. **Jest źródło** → kopiuje wszystkie cztery pola z `rcdSource`.

**Dlaczego wszystkie cztery razem** — kod ma już wyczerpujący WHY
([`symbolGrouping.ts:100-105`](../../src/lib/domain/symbolGrouping.ts)): gdyby
wyczyścić tylko `rcdSymbolId`, a zostawić `rcdRatedCurrent`/`residualCurrent`/`type`
nieaktualne, symbol cicho raportowałby wartości RCD, do którego już nie jest
podpięty. PDF (`PdfRcdTablePage`) renderuje te cztery pola wprost z symbolu → każda
nieaktualna wartość = błędnie przypisany RCD w protokole pomiarowym.

## ❓ Dlaczego (do potwierdzenia przez autora)

1. **`resolveRcdSource` — jak głęboko sięga łańcuch?** Czy MCB dziedziczy RCD tylko
   od bezpośredniego snap-targetu, czy przechodzi w górę drzewa (MCB → blok → RCD)?
   Innymi słowy: czy dziedziczenie jest jednopoziomowe, czy przechodnie? To
   determinuje poprawność protokołu przy zagnieżdżonych grupach.
