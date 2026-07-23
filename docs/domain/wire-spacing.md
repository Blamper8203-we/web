# `WIRE_THICKNESS_MAP` — odstępy przewodów

Mapa: przekrój przewodu (mm²) → wartość używana do rozsuwania przewodów
dzielących ten sam zacisk (żeby się nie nakładały wizualnie).

## ✅ Co (z kodu)

**Mapa** ([`src/lib/connections/connectionsLogic.ts:26-36`](../../src/lib/connections/connectionsLogic.ts)):

| Przekrój (mm²) | 0.5 | 0.75 | 1.0 | 1.5 | 2.5 | 4 | 6 | 10 | 16 |
|---|---|---|---|---|---|---|---|---|---|
| Wartość | 25 | 28 | 30 | 35 | 40 | 45 | 50 | 55 | **60** |

`WIRE_THICKNESS_MAP[16] = 60` było przedmiotem audytu (Q1, zamknięte, commit `3291993`).

**Użycie** ([`wirePathGenerator.ts:125-126`](../../src/lib/connections/wirePathGenerator.ts)):
```ts
const wireThickness = WIRE_THICKNESS_MAP[conn.wireCrossSection] || 4.5;
const shiftAmount = wireThickness + 2; // Offset dla przewodów w tym samym zacisku
```
Gdy wiele przewodów wychodzi z jednego zacisku, każdy jest przesuwany o
`shiftAmount`, więc wartość mapy steruje **rozstawem** wiązki. Grubszy przewód →
większy rozstaw.

**Pokrewne:** `DEFAULT_CUSTOM_RADIUS = 52` (ten sam rząd wielkości, 25–60) — single
source of truth dla promienia gięcia, z własnym WHY
([`connectionsLogic.ts:38-43`](../../src/lib/connections/connectionsLogic.ts)):
rozjazd między widokiem (edytor) a eksportem (PDF/SVG) daje widoczną niespójność
w dokumentacji, którą elektryk wysyła na budowę.

## ❓ Dlaczego (do potwierdzenia przez autora)

1. **Fallback `|| 4.5` vs wartości mapy 25–60.** Przekrój spoza mapy dostaje
   `4.5` → rozstaw `6.5 px`, ~5–13× mniejszy niż dla przekrojów listowanych. Czy
   `wireCrossSection` może w praktyce przyjąć wartość spoza mapy (UI oferuje tylko
   te 9)? Jeśli nie — fallback jest martwy (ok). Jeśli tak (np. przekrój `0` domyślny
   albo `35 mm²`) — przewody mogą się nakładać. **Potwierdź, czy 4.5 jest zamierzone,
   czy fallback powinien być w zakresie 25–60.**
