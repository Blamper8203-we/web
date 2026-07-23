# Audyt dostępności (a11y) — 2026-07-23

Zakres: komfort obsługi na tablecie/telefonie (dotyk) + kontrast. Metoda:
drzewo dostępności + pomiary computed style w przeglądarce na widoku edytora `/app`.

## 1. Cele dotykowe — ⚠️ znalezione, ✅ naprawione

WCAG 2.5.5 zaleca min. **44×44 px** dla celu dotyku. Pomiar (widok tablet/telefon):

| Element | Było | Uwaga |
|---|---|---|
| `.toolbar-icon-btn` (Cofnij, Przybliż, Szyna DIN, Ustawienia…) | **34×32 px** | główne akcje, dotykane najczęściej |
| `.palette-tab` (FR, SPD, RCD, kategorie modułów) | wys. **36 px** | przełączanie kategorii |
| `.win-close-btn` (Zamknij) | **32×32 px** | łatwe do przeoczenia |

**Naprawa** ([`src/components/Responsive.css`](../src/components/Responsive.css), sekcja „Cele dotykowe"):
blok `@media (pointer: coarse)` powiększa te przyciski do 44×44 px **tylko na
urządzeniach dotykowych**. Desktop (mysz, `pointer: fine`) zostaje kompaktowy.
Zweryfikowane w przeglądarce: przy 44 px kontener paska rośnie (brak klipowania),
layout czysty (screenshot mobile 383 px).

> Reguła celowo NIE rusza desktopu — kompaktowy pasek pod mysz jest zamierzony.
> Jeśli wolisz kompakt również na dotyku, usuń ten blok.

## 2. Kontrast — ✅ spot-check OK

Wyrywkowy pomiar (motyw ciemny): tekst drugorzędny statusbara
`rgb(161,166,180)` na `rgb(20,23,28)` = **7.38** (AA wymaga 4.5 — z zapasem).
Nie znaleziono oczywistych błędów w próbce.

**Rekomendacja:** pełny automatyczny audyt (axe / Lighthouse a11y) w CI dałby
pokrycie wszystkich elementów — łączy się z P3-1 (Lighthouse CI jako rozszerzenie).

## 3. Nazwy dla czytnika ekranu — ℹ️ do sprawdzenia (nie naprawiane tutaj)

Pasek narzędzi ma poprawne nazwy (Cofnij, Ponów, Szyna DIN…). Część przycisków
ikonowych w obszarze roboczym/canvasie może nie mieć jawnego `aria-label`
(czytnik ekranu odczyta „przycisk" bez treści). Warto przejść po nich osobno i
dodać `aria-label`. Nie wliczone w tę zmianę — wymaga pracy per-przycisk i nie
było głównym pytaniem (tablet/telefon).

---

*Ten audyt jest wyrywkowy (kluczowe powierzchnie), nie wyczerpujący. Pełne
pokrycie → automatyczne narzędzie w CI.*
