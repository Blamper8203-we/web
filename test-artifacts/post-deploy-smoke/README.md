# Post-deploy smoke

Uruchom po wdrożeniu na docelową domenę (Vercel, Netlify lub GitHub Pages).

## Wymagania

- Aplikacja wdrożona z regułą SPA (`/* -> /index.html`).
- Znany publiczny URL bez końcowego slasha, np. `https://twoja-domena.pl`.

## Komenda

```powershell
$env:DINBOARD_SMOKE_BASE_URL = "https://twoja-domena.pl"
npm run smoke:production
```

## Oczekiwany wynik

- PASS dla tras: `/`, `/app`, `/app/`, `/non-existing-route`
- PASS dla `/manifest.webmanifest`
- Raport JSON: `test-artifacts/post-deploy-smoke/route-smoke.json`

## Po PASS

Zaktualizuj `RELEASE_WEB_V1_CHECKLIST.md` (sekcja Deploy gate) datą i URL produkcji.
