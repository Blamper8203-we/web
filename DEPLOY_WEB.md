# Publikacja DINBoard Web za darmo

Najprostsza ścieżka dla tej aplikacji to Vercel, bo projekt ma już `vercel.json`
z obsługą odświeżania tras SPA, np. `/app`.

## Opcja 1: Vercel

1. Wypchnij aktualny kod do GitHuba.
2. Wejdź na Vercel i wybierz `Add New -> Project`.
3. Importuj repozytorium `Blamper8203-we/web`.
4. Ustawienia powinny wykryć się automatycznie:
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
5. Kliknij `Deploy`.
6. Po wdrożeniu aplikacja będzie dostępna pod adresem w stylu:
   `https://twoja-nazwa.vercel.app`

## Opcja 2: Netlify

Projekt zawiera `netlify.toml`, więc Netlify powinien użyć:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: `/* -> /index.html`

Kroki:

1. Wypchnij kod do GitHuba.
2. W Netlify wybierz `Add new site -> Import an existing project`.
3. Wybierz repozytorium.
4. Zatwierdź ustawienia i kliknij `Deploy`.

## Opcja 3: Cloudflare Pages

Cloudflare Pages też obsłuży ten projekt jako statyczny build Vite:

- Build command: `npm run build`
- Build output directory: `dist`

Pliki `public/_redirects` i `public/_headers` trafią do `dist` podczas builda.

## Sprawdzenie przed publikacją

```powershell
npm.cmd run check:online
```

## Sprawdzenie po publikacji

Podmień adres na docelowy adres strony:

```powershell
$env:DINBOARD_SMOKE_BASE_URL = "https://twoja-nazwa.vercel.app"
npm.cmd run smoke:production
```

Jeżeli test przejdzie, podstawowe trasy strony, `/app` i fallback SPA działają.
