# Pre-deploy smoke (local dist)

Symuluje zachowanie hostingu SPA na zbudowanym `dist/` przed wdrożeniem.

## Komenda

```powershell
npm run check:online
```

albo sam smoke (wymaga wcześniejszego `npm run build`):

```powershell
npm run smoke:online
```

## Artefakt

Po PASS: `test-artifacts/pre-deploy-smoke/route-smoke.json`
