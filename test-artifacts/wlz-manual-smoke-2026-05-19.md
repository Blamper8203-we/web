# WLZ Manual Smoke - 2026-05-19

## Cel

Sprawdzić, czy konfiguracja zasilania (WLZ) działa spójnie w:
- konfiguracji,
- bilansie mocy,
- walidacji,
- podglądzie i eksporcie PDF.

## Zakres

- `supplyVoltageV` (230/400 V)
- `supplyPhases` (1F/3F)
- `mainBreakerA`
- `contractedPowerKw`

## Scenariusze

### Scenariusz A: Moc przyłączeniowa a bilans

1. Ustaw `Moc przyłączeniowa` na `10 kW`.
2. Przejdź do zakładki `Bilans`.
3. Potwierdź, że pole „Moc przyłączeniowa” pokazuje `10.00 kW`.
4. Zmień `Moc przyłączeniowa` na `20 kW`.
5. Potwierdź, że bilans pokazuje `20.00 kW` bez odświeżania strony.

Wynik: PASS (2026-05-19)

### Scenariusz B: Główne zabezpieczenie z konfiguracji (bez FR)

1. Przygotuj projekt bez symbolu FR/SWITCH.
2. Ustaw `Zabezpieczenie główne` na niższą wartość (np. `25 A`).
3. Ustaw moce obwodów tak, aby suma prądów przekroczyła próg.
4. Przejdź do zakładki `Walidacja`.
5. Potwierdź błąd `VAL-007` o przeciążeniu wyłącznika głównego.

Wynik: PASS (2026-05-19)
Notatka: Potwierdzono `VAL-007` przy `mainBreakerA = 25A` i obciążeniu ~`58.0A`.

### Scenariusz C: Napięcie zasilania wpływa na walidację prądu

1. Dla tego samego obwodu ustaw parametry tak, by był blisko granicy.
2. Ustaw `Napięcie` na `230 V` i sprawdź walidację.
3. Ustaw `Napięcie` na `400 V` i sprawdź walidację.
4. Potwierdź, że wynik walidacji zmienia się zgodnie ze zmianą napięcia.

Wynik: PASS (2026-05-19)
Notatka: Dla `230V` błąd `VAL-002` występuje, po przełączeniu na `400V` znika.

### Scenariusz D: Spójność PDF (podgląd i eksport)

1. Przejdź do arkusza PDF.
2. Wygeneruj podgląd.
3. Wykonaj eksport PDF.
4. Potwierdź zgodność danych walidacji i bilansu między UI i PDF.

Wynik: PENDING
