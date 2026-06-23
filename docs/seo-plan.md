# Plan SEO dla dinboard.pl

> Audyt wykonany 2026-06-23. Strona praktycznie niewidoczna w Google pomimo dobrego produktu.
> Przyczyna: brak robots.txt, brak sitemap.xml, aplikacja renderuje się tylko po stronie klienta (SPA), brak structured data.

**Werdykt:** Meta tagi i PWA zrobione porządnie, ale fundamentalne rzeczy (robots, sitemap, SSR) — nie. Strona jest dla Google jak sklep bez adresu i szyldu.

---

## Stan obecny (audyt 2026-06-23)

### Co działa dobrze

| Element | Status |
|---|---|
| `<title>` | OK — zawiera słowa kluczowe |
| `<meta description>` | OK — opisowy, polski |
| Open Graph (FB/Twitter) | Tagi są, ale image to favicon |
| Język `lang="pl"` | OK |
| HTTPS + HSTS | OK (Vercel) |
| Google Search Console | Zweryfikowany |
| PWA manifest | OK |

### Co jest zepsute / brakuje

1. **robots.txt zwraca HTML aplikacji** — katastrofa. Vercel ma SPA fallback, więc `/robots.txt` zwraca `index.html`.
2. **sitemap.xml nie istnieje** — ta sama przyczyna co wyżej.
3. **Treść renderowana tylko w przeglądarce** — Googlebot widzi pustą stronę z `<div id="root"></div>`, treść pojawia się dopiero po uruchomieniu JS.
4. **Google indeksuje tylko 1 stronę** — `site:dinboard.pl` zwraca praktycznie jedną stronę (główną). Pozostałe wyniki to szum (dartboard, blackboard).
5. **Brak canonical URL** — `<link rel="canonical">` nie ma.
6. **Brak JSON-LD** — schema.org/SoftwareApplication byłoby idealne dla aplikacji.
7. **OG image to `favicon-192.png`** — za mały do social media (potrzeba 1200×630).
8. **Brak Twitter Card** — tagi `twitter:*` nie istnieją.

---

## Faza 1 — Quick wins (1-2 godziny)

Pliki statyczne, zero zmian w kodzie aplikacji. To jest absolutne minimum żeby w ogóle zacząć być widocznym.

### 1.1. Utwórz `public/robots.txt`

Pełna zawartość pliku:

```
# robots.txt dla DINBoard
# Blokujemy wewnętrzne ścieżki których Google nie powinien widzieć

User-agent: *
Allow: /
Disallow: /assets/

# Wskaż Google gdzie jest mapa strony
Sitemap: https://dinboard.pl/sitemap.xml
```

### 1.2. Utwórz `public/sitemap.xml`

Pełna zawartość pliku:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dinboard.pl/</loc>
    <lastmod>2026-06-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 1.3. Utwórz `public/og-image.png` (1200×630 px)

Obrazek który Facebook / LinkedIn / Twitter pokażą gdy ktoś udostępni stronę. Favicon wygląda amatorsko.

Co powinno być na nim:
- Logo DINBoard
- Tekst: "Projektowanie rozdzielnic elektrycznych"
- Screenshot aplikacji lub ikonka rozdzielnicy
- Kolor tła: dopasowany do brand color (obecnie ciemny `#111214` lub brand blue)

### 1.4. Zmień OG image w `index.html`

Znajdź linię:

```html
<meta property="og:image" content="https://dinboard.pl/favicon-192.png" />
```

Zmień na:

```html
<meta property="og:image" content="https://dinboard.pl/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="DINBoard - aplikacja do projektowania rozdzielnic elektrycznych" />
```

### 1.5. Dodaj canonical w `index.html`

W sekcji `<head>`:

```html
<link rel="canonical" href="https://dinboard.pl/" />
```

### 1.6. Dodaj JSON-LD (schema.org/SoftwareApplication)

W `index.html`, **przed** zamykającym `</head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DINBoard Web",
  "alternateName": "DINBoard",
  "url": "https://dinboard.pl",
  "applicationCategory": "DesignApplication",
  "applicationSubCategory": "Electrical Engineering Software",
  "operatingSystem": "Web, Windows, macOS, Linux, iOS, Android",
  "description": "Profesjonalna aplikacja dla elektryków do projektowania rozdzielnic, tworzenia obwodów, obliczania bilansu mocy i generowania dokumentacji zgodnej z polskimi standardami.",
  "inLanguage": "pl",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "PLN"
  },
  "author": {
    "@type": "Organization",
    "name": "DINBoard",
    "url": "https://dinboard.pl"
  }
}
</script>
```

### 1.7. Dodaj Twitter Card

W `index.html`, w sekcji `<head>`:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="DINBoard Web – Projektowanie Rozdzielnic Elektrycznych" />
<meta name="twitter:description" content="Aplikacja dla elektryków do projektowania rozdzielnic, obliczania bilansu mocy i generowania dokumentacji." />
<meta name="twitter:image" content="https://dinboard.pl/og-image.png" />
```

### 1.8. Weryfikacja po deployu

Po deploy na Vercel:
- Otwórz `https://dinboard.pl/robots.txt` — powinien wyświetlić tekst (nie HTML)
- Otwórz `https://dinboard.pl/sitemap.xml` — powinien wyświetlić XML

**Cache Vercel** — Vercel buforuje pliki. Jeśli po deploy nadal widać stary HTML, dodaj do URL `?v=2` lub poczekaj 5 minut.

### Rezultat fazy 1

- Działający robots.txt
- Działający sitemap.xml
- Poprawny OG image (1200×630)
- Canonical URL
- JSON-LD (Google zacznie pokazywać rich snippets)
- Twitter Card

---

## Faza 2 — Pre-rendering (3-5 dni)

To jest klucz do widoczności w Google. Aplikacja renderuje się tylko w przeglądarce — my sprawiamy, żeby Google dostał pełny HTML.

### Rekomendacja: vite-react-ssg

Dlaczego ta opcja:

- Kompatybilna z obecnym stackiem (Vite 8 + React 19)
- Zero zmian w architekturze — zachowujesz wszystko jak masz
- Generuje statyczny HTML przy `npm run build` — szybko i niezawodnie

Dlaczego nie inne:

- **Next.js** — ogromna migracja (import paths, dynamic loading, asset handling), za dużo jak na cel SEO
- **react-snap** — stary, słabo obsługuje React 19

### 2.1. Instalacja

```bash
npm install --save-dev vite-react-ssg
```

### 2.2. Wydziel routes z `src/App.tsx`

Na dole `src/App.tsx`:

```typescript
export const routes = [
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/app",
    Component: MainApp,
  },
];
```

Dokładna struktura zależy od aktualnego App.tsx — developer dostosowuje.

### 2.3. Konfiguracja `src/main.tsx`

```typescript
import React from "react";
import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";

export const createRoot = ViteReactSSG(
  { routes, basename: "/" }
);
```

### 2.4. Build z pre-renderowaniem

```bash
npm run build
```

Sprawdź folder `dist/` — powinny tam być:
- `index.html` z pełną treścią HTML (nie tylko `<div id="root">`)
- `app/index.html` (dla drugiej strony)

### 2.5. Test przed deployem

```bash
npm run preview
```

Otwórz `View Source` (`Ctrl+U`) na `http://localhost:4173/` — **powinieneś zobaczyć pełny HTML z treścią**, nie pustą stronę.

### 2.6. Deploy

```bash
git add .
git commit -m "SEO: robots.txt, sitemap.xml, JSON-LD, pre-rendering via vite-react-ssg"
git push
```

Vercel automatycznie przebuduje i wdroży.

### 2.7. Weryfikacja po deployu

Otwórz `https://dinboard.pl/`, kliknij `Ctrl+U` (pokaż źródło). Powinieneś zobaczyć pełny HTML z treścią strony.

### Rezultat fazy 2

- Google widzi pełną treść HTML
- Szybsze indeksowanie (Google dostaje wszystko od razu)
- Lepszy ranking (HTML > JS rendering)
- Strona nadal działa jak SPA po stronie klienta

---

## Faza 3 — Zgłoszenie do wyszukiwarek (1 dzień)

Po deployu trzeba powiedzieć Google i Bing że strona istnieje.

### 3.1. Google Search Console

1. Otwórz https://search.google.com/search-console
2. Wybierz domenę `dinboard.pl`
3. **Inspekcja > URL** → wpisz `https://dinboard.pl/`
4. Kliknij **"Poproś o indeksowanie"**

### 3.2. Bing Webmaster Tools

1. Otwórz https://www.bing.com/webmasters
2. Dodaj stronę (zweryfikuj przez meta tag, tak jak dla Google)
3. Wyślij sitemap: `https://dinboard.pl/sitemap.xml`

### 3.3. Weryfikacja po 7-14 dniach

Wpisz w Google:

```
site:dinboard.pl
```

Powinny pojawić się zaindeksowane strony. Jeśli po 14 dniach nadal jest tylko 1 wynik — coś jest źle skonfigurowane.

---

## Faza 4 — Content i dominacja (2-4 tygodnie, opcjonalne)

Faza która odróżnia "stronę" od "lidera rynku". Wymaga pisania treści.

### 4.1. Strona "O programie"

Nowa podstrona `/o-programie` z opisem:
- Do kogo jest skierowany (elektrycy, projektanci)
- Jakie problemy rozwiązuje
- Kto go stworzył i dlaczego
- 300-500 słów minimum

Google kocha długi tekst z naturalnymi słowami kluczowymi: "projektowanie rozdzielnic", "schemat elektryczny", "rozdzielnica domowa".

### 4.2. Sekcja FAQ

Nowa podstrona `/faq` z pytaniami:
- Czym jest DINBoard?
- Jak zaprojektować rozdzielnicę domową?
- Jak obliczyć bilans mocy?
- Co to jest schemat ideowy?

FAQ to złoto SEO — Google często pokazuje je jako rich snippets (pozycja zero w wynikach).

### 4.3. Blog z poradnikami

Przykładowe tematy:
- "Jak zaprojektować rozdzielnicę domową krok po kroku"
- "Dobór zabezpieczeń RCD i MCB — poradnik"
- "Bilans mocy — jak obliczyć i kiedy stosować"
- "Norma PN-HD 60364 — co musisz wiedzieć"

Każdy artykuł 800-1500 słów. Zdjęcia, listy punktowane, konkretne przykłady.

To jest dźwignia SEO. Konkurencja (inni twórcy oprogramowania dla elektryków) prawie na pewno tego nie robi.

### 4.4. Linkowanie wewnętrzne

Każdy artykuł na blogu linkuje do strony głównej, FAQ, do pobrania. Google liczy te linki jako "głosy popularności".

### Rezultat fazy 4

- 5-20 podstron zaindeksowanych w Google
- Szansa na pozycję zero w wynikach (rich snippets)
- Ruch organiczny od osób szukających "rozdzielnica", "schemat elektryczny", itd.
- Autorytet domeny rośnie z każdym artykułem

---

## Harmonogram

| Faza | Czas | Trudność | Efekt |
|---|---|---|---|
| 1. Quick wins | 1-2h | Łatwy | Podstawy SEO działają |
| 2. Pre-rendering | 3-5 dni | Średni | Google widzi treść |
| 3. Zgłoszenie do wyszukiwarek | 1 dzień | Łatwy | Indeksacja startuje |
| 4. Content | 2-4 tyg. | Wymaga pisania | Ruch organiczny |

## Koszt

- **Faza 1-3:** 0 zł (robisz sam albo developer za 1-2 dni)
- **Faza 4:** Jeśli zlecisz copywriterowi — ~200-400 zł za artykuł, 1000-2000 zł za 5 artykułów

## Minimum żeby coś się zmieniło

Jeśli mało czasu, zrób fazę 1 + 2 + 3. To daje:

- Google widzi stronę (pełny HTML)
- Masz sitemap i robots
- Masz structured data
- Indeksacja startuje

Faza 4 to inwestycja na później.

---

## Ważne przed startem

1. **Zrób backup** obecnego `index.html` i całego folderu `public/` — żebyś mógł wrócić gdyby coś poszło nie tak.

2. **Po każdej fazie sprawdź** czy apka nadal działa (`npm run preview` + ręczne klikanie).

3. **NIE pushuj na GitHub** dopóki nie przetestujesz lokalnie.

4. **Vercel cache** — po deploy Vercel może serwować starą wersję przez 5-30 minut. Jeśli nie widać zmian, hard reload (`Ctrl+Shift+R`).

5. **Pamiętaj o PWA Service Worker** — `vite.config.ts` ma cache na `/assets/modules/*.svg` (CacheFirst, 30 dni TTL). Nowe SVG / zmiany w manifest wymagają wyczyszczenia SW w przeglądarce.