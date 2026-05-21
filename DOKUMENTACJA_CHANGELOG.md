# Changelog dokumentacji

## 2026-05-21

- Rozszerzono `scripts/online-smoke.mjs` o tryb produkcyjny (`DINBOARD_SMOKE_BASE_URL`) i raport JSON.
- Dodano `npm run smoke:production` oraz artefakty `test-artifacts/pre-deploy-smoke/` i `test-artifacts/post-deploy-smoke/`.
- Zaktualizowano `RELEASE_WEB_V1_CHECKLIST.md` o pre-deploy smoke PASS (2026-05-21).

## 2026-05-20

- Zamrożono stan aplikacji web v1 w commicie z tagiem `web-v1-freeze-2026-05-20`.
- Zaktualizowano `RELEASE_WEB_V1_CHECKLIST.md` o datę walidacji technicznej i nowy tag freeze.
- Dodano `.gitignore` dla lokalnych logów `vite-dev.*.log`.

## 2026-05-19

- Dodano `TODO_DOKUMENTACJI.md`.
- Zaktualizowano `RELEASE_WEB_V1_CHECKLIST.md` o statusy i daty walidacji.
- Zaktualizowano `README.md` o sekcję „Stan na dziś”, testy celowane, standard UTF-8 i notę o `tsc_errors.txt`.
- Dodano `DOKUMENTY_MAPA.md` z mapą dokumentów i procedurą aktualizacji.
- Dodano lokalne skróty dokumentów źródłowych: `AI_CONTEXT.md`, `ARCHITECTURE_MAP.md`, `CODE_QUALITY.md`, `DOMAIN_RULES.md`, `PREVENTING_CODE_MESS.md`, `.cursorrules`.
- Dodano `RELEASE_NOTE_WEB_V1_2026-05-19.md`.
- Uzupełniono deploy/sign-off w `RELEASE_WEB_V1_CHECKLIST.md` o potwierdzone elementy i adnotacje o punktach wymagających środowiska produkcyjnego.
