# Release Web v1 Checklist

## Status bazowy

- Ostatnia walidacja QA: `2026-05-09` (`QA_FUNCTIONAL_REPORT_2026-05-09.md`).
- Ostatnia walidacja techniczna lokalnie: `2026-05-20`.

## 1) Technical gate

- [x] `npm ci` (2026-05-19)
- [x] `npm run check` (2026-05-19)
- [x] `npm run check:online` (2026-05-19)
- [x] `npm run preview` and smoke test `/` + `/app` (2026-05-19)
- [x] Verify PDF export on a real project (2026-05-19)
- [x] Verify open/save `.dinboard` flow in browser (2026-05-19)

Uwagi walidacyjne (2026-05-19):
- Test automatyczny zapisu/odczytu projektu: `src/lib/projectFile.test.ts` - PASS.
- Test automatyczny warstwy dokumentu PDF: `src/lib/export/PdfProtocolDocument.test.ts` - PASS.
- Manualny test end-to-end w UI na realnym projekcie - PASS.
- Scenariusz manualny: `test-artifacts/release-manual-smoke-2026-05-19.md`.

## 2) Device gate

- [x] Desktop smoke: landing + app workspace (2026-05-09)
- [x] Tablet smoke: workspace layout and interactions (2026-05-09)
- [x] Mobile smoke: tab/panel navigation and readability (2026-05-09)
- [x] Attach/update evidence in `test-artifacts/device-smoke/` (2026-05-09)

## 3) Deploy gate

- [x] Hosting rewrite active for SPA routes (2026-05-19)
- [ ] Environment/domain config updated (publiczny URL produkcji)
- [x] Pre-deploy SPA smoke on local `dist` (2026-05-21)
- [ ] Post-deploy smoke on production URL (`/`, `/app`, `/app/`, fallback route)

Uwagi deploy (2026-05-21):
- Netlify rewrite potwierdzony w `public/_redirects` (`/* /index.html 200`).
- Vercel rewrite potwierdzony w `vercel.json` (`"source": "/(.*)", "destination": "/index.html"`).
- Pre-deploy PASS: `npm run check:online` (73 testy + 4 trasy SPA + manifest).
- Raport: `test-artifacts/pre-deploy-smoke/route-smoke.json`.
- Post-deploy: uruchom `npm run smoke:production` z `DINBOARD_SMOKE_BASE_URL=https://<twoja-domena>` (instrukcja: `test-artifacts/post-deploy-smoke/README.md`).
- Przy weryfikacji 2026-05-21 brak działającego URL produkcji (GitHub Pages / Vercel probe: 404).

## 4) Sign-off

- [x] Update `MIGRATION_PLAN.md` status if scope changed (2026-05-19: brak zmiany scope funkcjonalnego)
- [x] Freeze release commit/tag (2026-05-20, tag: `web-v1-freeze-2026-05-20`)
- [x] Publish short release note (scope + known limitations) - `RELEASE_NOTE_WEB_V1_2026-05-19.md`
