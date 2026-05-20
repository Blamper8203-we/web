# Device Smoke Report

Data testu: 2026-05-09

Zakres:
- desktop: `/` i `/app`
- tablet: `/app` (profil `iPad (gen 7)`)
- mobile: `/app` (profil `iPhone 13`)
- routing SPA: `/`, `/app`, `/app/`, `/non-existing-route`

Wyniki:
- wszystkie zrzuty wygenerowane poprawnie
- wszystkie trasy zwrocily `200`
- wszystkie odpowiedzi zawieraly kontener aplikacji `<div id="root"></div>`

Artefakty:
- `test-artifacts/device-smoke/desktop-landing.png`
- `test-artifacts/device-smoke/desktop-app.png`
- `test-artifacts/device-smoke/tablet-app.png`
- `test-artifacts/device-smoke/mobile-app.png`
- `test-artifacts/device-smoke/route-smoke.json`
