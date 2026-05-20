# DIN Rail - Checklist regresji drag/smoothness

Cel: szybka weryfikacja, czy przesuwanie modułów na szynie DIN jest płynne i bez migotania.

## Zakres
- Obszar: `DinRailCanvasPixi` + `dinRailSnap` + zaznaczanie/hitbox.
- Scenariusze: drag pojedynczego modułu i drag grupy (RCD + człony grupy).

## Warunki wstępne
1. Uruchom aplikację (`npm.cmd run dev` lub build desktop).
2. Otwórz projekt z widoczną szyną DIN.
3. Upewnij się, że na jednej szynie są:
- co najmniej 4 moduły,
- jedna grupa (np. RCD + 2-3 moduły),
- wolna przestrzeń po lewej i prawej stronie.

## Szybki pre-check automatyczny (przed testem manualnym)
1. Uruchom:
`npm.cmd run test:din-rail-regression`
2. Opcjonalnie:
`npm.cmd run build`

## Scenariusze testowe
1. Drag pojedynczego modułu w prawo i w lewo (powolny ruch):
- Oczekiwane: brak migotania SVG, brak skoków pozycji, płynne podążanie za kursorem.

2. Drag pojedynczego modułu szybkim ruchem:
- Oczekiwane: nadal brak „teleportów” i brak jitteru na sąsiednich pozycjach.

3. Drag grupy (złap element grupy) w prawo i w lewo:
- Oczekiwane: grupa przesuwa się spójnie, bez oscylacji między pozycjami.

4. Drag grupy w pobliżu innych modułów:
- Oczekiwane: snap działa przewidywalnie; grupa nie „walczy” z własnymi elementami.

5. Drag na granice szyny (lewa/prawa):
- Oczekiwane: pozycja jest clampowana do granic; brak migotania przy krawędzi.

6. Powtarzany drag (10-15 razy):
- Oczekiwane: brak degradacji płynności w czasie i brak narastającego migotania.

7. Zoom 80%, 100%, 150% i ponowny drag:
- Oczekiwane: to samo zachowanie (płynność + brak flicker) na każdym poziomie zoom.

## Kryterium PASS/FAIL
- PASS: wszystkie scenariusze bez widocznego flicker/jitter i bez skoków lewo/prawo.
- FAIL: jakikolwiek powtarzalny skok, migotanie modułu lub niestabilny snap grupy.

## Szablon raportu (do szybkiego logu)
- Data:
- Build/commit:
- Tester:
- Wynik:
- Uwagi (kroki reprodukcji + screen/nagranie):
