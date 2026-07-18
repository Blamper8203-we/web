# Google Play — plan publikacji DINBoard (dla agenta wykonawczego)

> **Dokument dla agenta kodującego.** Ten plik jest kompletną specyfikacją — agent
> powinien móc wykonać całą część techniczną bez dodatkowych pytań. Kroki oznaczone
> **[TY]** wymagają działania developera (nie agenta) — wyjaśnij je, ale nie próbuj
> robić za niego.
>
> **Data utworzenia:** 2026-07-18. Wymagania Google Play sprawdzone na ten dzień.

---

## Kontekst

DINBoard to aplikacja PWA (React 19 + Vite) pakowana przez Capacitor 8 na Androida.
Aplikacja istnieje i działa lokalnie (`android/` zbudowane, splash screen zbrandbizowany
w poprzedniej iteracji). Ten plan prowadzi od obecnego stanu do **opublikowanego
pakietu w Google Play**.

**Stack:** Capacitor 8.3.4, AGP 9.2.1, Gradle 9.4.1, `applicationId: com.dinboard.app`,
`targetSdkVersion 36` (Android 16 — spełnia wymóg Play z 31 sierpnia 2026).

---

## Stan obecny (audyt 2026-07-18)

### ✅ Gotowe
- `applicationId` = `com.dinboard.app` (spójne w `capacitor.config.ts`, `strings.xml`, `build.gradle`)
- `targetSdkVersion`/`compileSdk` = 36 (Android 16) — **spełnia wymóg z 31.08.2026**
- `minSdkVersion` = 24
- Pełny zestaw ikon: `mipmap-{mdpi..xxxhdpi}/ic_launcher.png` + `ic_launcher_round.png` + adaptive (`mipmap-anydpi-v26/`)
- Splash assets: `drawable*/splash.png` (11 plików, zbrandbizowane)
- Uprawnienia minimalistyczne: tylko `android.permission.INTERNET`
- `AndroidManifest.xml`: `android:exported="true"` na MainActivity (wymóg Android 12+), LAUNCHER intent-filter OK
- `app_name` = "DinBoard" w `strings.xml`

### ❌ Blokujące
1. **Brak release signing config** w `android/app/build.gradle` — release AAB będzie niepodpisany
2. **Brak pliku keystore** — trzeba wygenerować
3. **Brak `colors.xml`** — `styles.xml` przywołuje `@color/colorPrimary|colorPrimaryDark|colorAccent`, których nie ma (latent resource-link failure)

### ⚠️ Wymaga uwagi
4. `versionCode 1` / `versionName "1.0"` — OK na pierwszy upload, brak strategii bumpowania
5. Rozbieżność wersji: `package.json` ma `0.2.0`, Android ma `1.0`
6. `.gitignore` nie chroni `*.keystore` ani `android/app/release/`
7. Brak npm scripts `cap:sync` / `cap:build` (workflow nie jest skryptowalny)
8. `minifyEnabled false` — dozwolone, ale brak obfuskacji/kurczenia kodu
9. `proguard-rules.pro` — tylko komentarze, brak aktywnych reguł

---

## Część 1 — Prace agenta (kod + build)

> Każdy krok ma **akceptancję** (jak sprawdzić że zrobione) i **pułapki**
> (co łatwo zepsuć). Realizuj sekwencyjnie.

### Krok 1.1: Zabezpiecz `.gitignore` przed keystorem i artefaktami

**Dlaczego najpierw:** keystore z kroku 1.3 jest sekretem. **Jeśli** agent go commitnie,
nawet jeden commit i push, klucz jest skompromitowany i trzeba go unieważnić.
Najpierw `.gitignore`, potem keystore.

**Co zrobić:**

W `android/.gitignore` odkomentuj i dodaj wpisy keystore (są zakomentowane):
```
*.jks
*.keystore
keystore.properties
```

W głównym `.gitignore` (project root) dodaj sekcję:
```
# Android signing secrets — NIGDY commitować
*.keystore
*.jks
android/app/release/
android/app/*.keystore
android/app/keystore.properties
```

**Akceptancja:**
- `git check-ignore -v android/app/release.keystore` zwraca dopasowanie
- `git status` nie pokazuje żadnego istniejącego keystore jako untracked

**Pułapka:** nie commituj keystore z poprzedniego testu, jeśli jakiś istnieje w working tree.

---

### Krok 1.2: Dodaj `colors.xml` (napraw resource-link)

**Dlaczego:** `styles.xml` → `AppTheme` przywołuje `@color/colorPrimary`,
`colorPrimaryDark`, `colorAccent`. Bez `colors.xml` czysty release build AAB
**może się wywalić** w `resourceLink` (debug buduje się bo Lint jest pobłażliwiejszy,
ale release jest rygorystyczny). To latentny bug — napraw teraz.

**Plik:** `android/app/src/main/res/values/colors.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- WHY: przywoływane przez styles.xml AppTheme. Brand DINBoard: granat tła
         + amber accent. Spójne z manifest theme_color #0e0f11 i logo amber #e0b341. -->
    <color name="colorPrimary">#0e0f11</color>
    <color name="colorPrimaryDark">#000000</color>
    <color name="colorAccent">#f59e0b</color>
</resources>
```

**Akceptancja:** `./gradlew :app:processReleaseManifest` przechodzi bez resource-link error.

**Pułapka:** nie zmieniaj nazw zmiennych — `styles.xml` ich wymaga dokładnie takich.

---

### Krok 1.3: [TY] Wygeneruj upload keystore

**To krok developera, nie agenta.** Agent **nie może** generować produkcyjnego keystore'a
— to sekret, którego kopię musi zachować developer na bezpiecznym nośniku (utrata =
utrata możliwości aktualizacji aplikacji na Play).

**Instrukcja dla developera (Windows PowerShell):**

```powershell
cd "F:\stare pliki\Nowy projekt\android\app"

keytool -genkeypair `
  -v `
  -keystore dinboard-upload.keystore `
  -alias dinboard `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass "TWOJE_MOCNE_HASLO_TUTAJ" `
  -keypass "TWOJE_MOCNE_HASLO_TUTAJ" `
  -dname "CN=DINBoard, OU=Mobile, O=TwojaFirma, L=Miejscowosc, ST=Wojewodztwo, C=PL"
```

**Krytyczne:**
- `keytool` jest w JDK (Android Studio bundluje JDK 17). Ścieżka na Windows: `"C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\keytool.exe"` — sprawdź `which keytool`.
- **RSA 2048+ — to wymóg Play App Signing.**
- **10000 dni ważności** — Play wymaga co najmniej do 2033-10-22, ale długa ważność zapobiega problemom.
- **Zapamiętaj hasło.** Jak zapomnisz → nie zaktualizujesz aplikacji (chyba że użyjesz Play App Signing z resetem).
- **Zrób 2 kopie zapasowe keystore'a** na różnych nośnikach (USB + chmura szyfrowana). Utrata keystore'a z Play App Signing enrolled = aplikacja martwa.

**Po wygenerowaniu agent wraca do pracy — ale NIE commituje keystore'a.**

**Akceptancja:** plik `android/app/dinboard-upload.keystore` istnieje, `git status` go **nie** pokazuje (gitignore działa).

---

### Krok 1.4: Dodaj `signingConfigs.release` do `build.gradle`

**Plik:** `android/app/build.gradle`

Wstaw blok `signingConfigs` PRZED `buildTypes`, a w `buildTypes.release` ustaw `signingConfig`:

```gradle
android {
    // ... istniejące ...

    // WHY: release signing via keystore.properties — hasło NIE trafia do git.
    // Plik keystore.properties jest w .gitignore (krok 1.1), tworzy go developer.
    def keystoreProperties = new Properties()
    def keystorePropsFile = rootProject.file("keystore.properties")
    if (keystorePropsFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropsFile))
    }

    signingConfigs {
        release {
            if (keystorePropsFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

**Plik:** `android/keystore.properties` (utworzy **developer**, NIE commitowany):

```properties
storeFile=dinboard-upload.keystore
storePassword=TWOJE_MOCNE_HASLO
keyAlias=dinboard
keyPassword=TWOJE_MOCNE_HASLO
```

Ścieżka `storeFile` jest względna wobec `android/app/` (bo `signingConfigs` jest w `:app` module, a `file()` resolve'uje względem module dir). Keystore z kroku 1.3 leży w `android/app/dinboard-upload.keystore` — pasuje.

**Akceptancja:** `./gradlew :app:assembleRelease` kończy się sukcesem i produkuje podpisany APK w `android/app/build/outputs/apk/release/`.

**Pułapka:**
- NIE hardkoduj haseł w `build.gradle` — trafią do git.
- Sprawdź `git status` po dodaniu — `keystore.properties` musi być ignorowany.
- Jeśli `keystore.properties` nie istnieje (CI bez sekretów), build nie podpisze release'u — to bezpieczne zachowanie.

---

### Krok 1.5: Skrypty npm dla Capacitora

**Dlaczego:** workflow builda Androida powinien być skryptowalny (CI + powtarzalność).

**Plik:** `package.json`, sekcja `"scripts"`:

```json
{
  "scripts": {
    "cap:sync": "cap sync android",
    "cap:build:android": "npm run build && cap sync android && cd android && ./gradlew bundleRelease",
    "cap:open:android": "cap open android",
    "android:release": "npm run cap:build:android"
  }
}
```

**Co robi `cap:build:android`:**
1. `npm run build` — build web (`dist/`)
2. `cap sync android` — kopiuje `dist/` do `android/app/src/main/assets/public/`, updatuje pluginy
3. `./gradlew bundleRelease` — buduje **AAB** (App Bundle, nie APK) w `android/app/build/outputs/bundle/release/app-release.aab`

**Akceptancja:** `npm.cmd run cap:build:android` kończy się sukcesem po podaniu keystore.properties.

**Pułapka:**
- Na Windows `./gradlew` z `npm` wymaga Git Bash (zgodne z konwencją projektu). Alternatywa: `gradlew.bat`.
- `cap sync` nadpisuje `assets/public/` — po sync nie edytuj tam niczego ręcznie.

---

### Krok 1.6: Strategia wersjonowania

**Dlaczego:** `versionCode 1` i rozbieżność `package.json 0.2.0` vs `Android 1.0` wprowadzą chaos.

**Plik:** `android/app/build.gradle` → `defaultConfig`:

```gradle
defaultConfig {
    applicationId "com.dinboard.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0.0"
    // ...
}
```

**Konwencja (dodaj jako komentarz nad `versionCode`):**

```
// versionCode: integer monotonic, ZWIĘKSZAJ przy KAŻDYM uploadzie na Play.
//   Play odrzuca AAB z versionCode <= poprzedniego. Nie pomijaj liczb.
// versionName: dowolny string pokazywany użytkownikowi ("1.0.0", "1.1.0-beta").
//
// Konwencja DINBoard: versionName = package.json version (npm version patch/minor/major).
//   versionCode = jednomiejscowy counter, bumpuj ręcznie przy release.
```

**Synchronizacja z `package.json`:** przy każdym release:
1. `npm version minor` (lub `patch`/`major`) → bumpuje `package.json`
2. Ręcznie ustaw to samo `versionName` w `build.gradle`
3. Zwiększ `versionCode` o 1

**Akceptancja:** `versionName "1.0.0"` w build.gradle, zgadza się z `package.json` po `npm version`.

---

### Krok 1.7: [Opcjonalnie] ProGuard / R8 minimalne reguły

**Dlaczego:** `minifyEnabled false` jest dozwolone, ale obfuskacja chroni IP i zmniejsza AAB.
**Nie włączaj jeśli** Capacitor/pluginy mają problemy z reflection (zwykle działają, ale trzeba testować).

**Jeśli włączasz** (`minifyEnabled true`), dodaj do `proguard-rules.pro`:

```
# Capacitor — pluginy używają reflection do @CapacitorPlugin
-keep class com.getcapacitor.** { *; }
-keep class * implements com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Zachowaj nazwy klas JS bridge — JS woła po nazwie
-keepclassmembers class * {
    @com.getcapacitor.JavascriptInterface <methods>;
}
```

**Akceptancja:** `./gradlew bundleRelease` z `minifyEnabled true` buduje się i APK działa (test na emulatorze — `npx cap run android`).

**Zalecenie:** **Na pierwszy release zostaw `minifyEnabled false`**. Włącz obfuskację w 1.0.1, gdy app już żyje.

---

### Krok 1.8: [TY] Zbuduj AAB i weryfikuj

**Agent może przygotować komendę, ale build potrzebuje keystore'a (krok 1.3) z hasłem — developer musi to wykonać.**

```bash
npm.cmd run build              # web → dist/
npm.cmd run cap:sync           # sync dist/ do android/
cd android
./gradlew bundleRelease        # → app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease      # → app/build/outputs/apk/release/app-release.apk (do lokalnego testu)
```

**Weryfikacja AAB przed uploadem** (zainstaluj `bundletool` z Android SDK):
```bash
bundletool build-apks --bundle=app-release.aab --output=dinboard.apks --ks=dinboard-upload.keystore
bundletool install-apks --apks=dinboard.apks
```

**Akceptancja:**
- `app-release.aab` istnieje (20-50 MB dla PWA)
- Podpisany (`jarsigner -verify app-release.aab` → "jar verified")
- Instaluje się na emulatorze i uruchamia

**Pułapka:** AAB jest **podpisany upload key**. Play App Signing re-signuje go app-signing key Google'a po stronie serwera — to normalne.

---

## Część 2 — Prace developera (Play Console)

> Te kroki **musi wykonać developer**. Agent nie ma dostępu do konta Google.

### Krok 2.1: [TY] Konto Google Play Console

1. Wejdź na https://play.google.com/console/signup
2. Zapłać **$25 jednorazowo** (karta)
3. **Weryfikacja konta** — Google wymaga teraz weryfikacji tożsamości (Dowód osobisty / KYC). Trwa 1-3 dni robocze.
4. Uzupełnij profil developera (nazwa dewelopera widoczna w sklepie, kontakt, strona WWW)

**Bez zweryfikowanego konta** — nie możesz submitować aplikacji.

---

### Krok 2.2: [TY] Stwórz aplikację w Play Console

1. Play Console → **"Wybierz aplikację" → "Utwórz aplikację"**
2. **Nazwa aplikacji:** DINBoard
3. **Domyślny język:** Polski
4. **Aplikacja czy gra:** Aplikacja
5. **Darmowa czy płatna:** Darmowa
6. Zaakceptuj deklaracje (US export laws, Play policies)

---

### Krok 2.3: [TY] Skonfiguruj Play App Signing (kluczowe!)

Przy pierwszym uploadie AAB Play zapyta o **Play App Signing**. **Włącz to** — to rekomendacja Google i właściwie obowiązek dla nowych aplikacji.

**Jak to działa:**
- **Twój upload key** (keystore z kroku 1.3) — służy do podpisywania AAB przed uploadem
- **App signing key Google'a** — generowany przez Google (lub eksportujesz swój), trzymany na ich serwerach, **tym** są podpisywane APK rozsyłane użytkownikom

**Dlaczego warto:**
- Jeśli zgubisz upload key → Play App Signing pozwala na reset (aplikacja żyje dalej)
- Automatyczna optymalizacja APK per device (density splits, ABI splits)

**Podczas pierwszego uploadu AAB:**
- Play pyta "Use Google-generated key" → **TAK** (najbezpieczniejsze)
- Akceptuj warunki App Signing

---

### Krok 2.4: [TY] Store Listing (lista w sklepie)

**Wymagane zasoby:**

| Zasób | Wymóg | Skąd wziąć |
|---|---|---|
| **Ikona aplikacji** | 512×512 PNG, 32-bit | użyj `public/favicon-192.png` powiększonego lub wygeneruj 512 z `dinboard.svg` |
| **Feature graphic** | 1024×500 PNG/JPG | stwórz w Canva/Figma — tło granat + logo DIN + tagline |
| **Screenshots** | min. 2, max 8, min 320px, max 3840px | zrób screeny z emulatora (`adb exec-out screencap -p > s1.png`) |
| **Phone screenshots** | 16:9 lub 9:16 | min. 2 zrzuty — pokaż DIN rail + schemat + PDF |
| **Tablet screenshots** | opcjonalnie ale zalecane | jeśli DINBoard wspiera tablet (wspiera) |
| **App name** | max 30 znaków | "DINBoard — rozdzielnice" |
| **Krótki opis** | max 80 znaków | "Projektuj rozdzielnice, schematy i PDF odbiorczy na telefonie" |
| **Pełny opis** | max 4000 znaków | adaptuj treść z landing page |
| **Kategoria** | — | "Narzędzia" lub "Produktywność" |
| **Tagi** | do 5 | "elektryka", "rozdzielnica", "schemat", "DIN rail", "PDF" |
| **Strona WWW** | URL | https://dinboard.pl |
| **Email kontaktowy** | — | twój email |

**Pułapka:** screenshots **obowiązkowo z telefonu** (nie desktop). DINBoard ma layout mobilny — pokaż go. Play odrzuca same screenshoty desktopowe dla aplikacji mobilnych.

---

### Krok 2.5: [TY] App Content — formularze polityk (BLOCKING)

Play Console → "App content" — **wszystkie sekcje muszą być wypełnione** zanim zatwierdzisz release.

#### 2.5.1 Privacy Policy URL
- **Wymagane.** DINBoard już ma `/polityka-prywatnosci` — użyj `https://dinboard.pl/polityka-prywatnosci`.
- Privacy policy **musi pasować** do Data Safety form (2.5.3). Jak deklarujesz "nie zbieram danych" w Data Safety, privacy policy musi to potwierdzać.

#### 2.5.2 Ads (reklamy)
- **Czy używasz AdMob / innych ad SDK?** DINBoard **ma AdSense na stronie web** (`index.html`), ale **w natywnej aplikacji Capacitor webview ≠ reklamy mobilne**.
- Jeśli AdSense się ładuje wewnątrz webview: **ODPOWIEDZ "Tak"** i deklaruj.
- Jeśli Capacitor build nie ładuje reklam (checknij DevTools webview): **ODPOWIEDZ "Nie"**.

**Agent/kod:** jeśli chcesz mieć czystą aplikację bez reklam, dodaj w `capacitor.config.ts`:
```ts
plugins: {
  // ... istniejące ...
}
```
I rozważ blokadę AdSense script w natywnej aplikacji (np. warunek na `Capacitor.isNativePlatform()` w `index.html` — to wymaga zmiany w kodzie, ale pozwala zaznaczyć "Nie" w Ads declaration).

#### 2.5.3 Data Safety form (krytyczny)
To najczęstszy powód odrzucenia aplikacji.

**Dla DINBoard — odpowiedzi:**

| Pytanie | Odpowiedź | Uzasadnienie |
|---|---|---|
| Czy aplikacja zbiera dane? | **NIE** (jeśli projekt działa w pełni offline) | DINBoard trzyma pliki `.dinboard` u użytkownika, nie wysyła na serwer |
| Camera / location / contacts? | NIE | tylko uprawnienie INTERNET |
| Email, name, personal data? | NIE | brak logowania, brak kont |
| Crash logs / analytics? | **Zależy** — jeśli masz Vercel Analytics w natywnej aplikacji → TAK | sprawdzaj — patrz sekcja "Analytics" poniżej |
| Encrypted in transit (HTTPS)? | **TAK** | cała aplikacja ładuje się przez https |
| Możliwość usunięcia danych? | **NIE DOTYCZY** (brak zbierania danych) | jeśli zaznaczyłeś "nie zbieram" |

**UWAGA na Analytics:** w `src/App.tsx` jest `<Analytics />` z `@vercel/analytics`. **W natywnej aplikacji Capacitor** to może działać (webview ma dostęp do networku). Sprawdź:
```bash
# W Logcat szukaj requestów do vercel.com / vcvalytics
adb logcat | grep -i analytics
```
**Jeśli działa** → Data Safety musi deklarować "Performance data / Crash diagnostics" i "Analytics".

**Rozwiązanie (agent/kod):** wyłącz Vercel Analytics w aplikacji natywnej:
```tsx
// w src/App.tsx
import { isNativePlatform } from "./lib/platform/detect";
// ...
{!isNativePlatform() && <Analytics />}
```
To czyści aplikację natywną z analityki i upraszcza Data Safety do "nie zbieram".

#### 2.5.4 Content Rating (IARC questionnaire)
- Odpowiedz na ~6 pytań (czy app zawiera przemoc, nagość, hazard itd.)
- DINBoard: wszystko "Nie" → rating **Everyone / 3+**
- Wymagane, inaczej nie opublikujesz

#### 2.5.5 Target Audience
- **Wiek:** 18+ (dorośli profesjonaliści) — bezpieczny wybór dla narzędzia elektrycznego
- Dlaczego nie "all ages": aplikacja dla elektryków, normy PN-HD 60364 nie są dla dzieci
- App **nie** jest skierowana do dzieci, więc nie podlega COPPA / Google Kids policy

#### 2.5.6 News app / Government app / Financial app
- **Nie** — DINBoard to narzędzie produktywności
- Te kategorie mają dodatkowe wymogi — nie wchodź tam

#### 2.5.7 Data Access form (jeśli pyta)
- Pojawi się **tylko jeśli** zaznaczysz w 2.5.3 że zbierasz dane. Dla czystego DINBoard (offline) — **pominięte**.

---

### Krok 2.6: [TY] Setup cen / dystrybucji

1. **Ceny i dystrybucja** → aplikacja darmowa
2. **Kraje:** wszystkie (domyślnie) albo wybierz rynki (Polska + UE jeśli chcesz zacząć wąsko)
3. **Zawiera reklamy:** Nie (jeśli wyłączyłeś AdSense/Analytics w natywnej)
4. **Family Policy:** aplikacja dla dorosłych, nie włączaj Family Library

---

### Krok 2.7: [TY] Upload AAB i tworzenie release'u

1. Play Console → **Produkcja** (Production) → **Utwórz wersję**
2. **App bundles** → upload `app-release.aab` z kroku 1.8
3. **Release notes** (po polsku): krótkie — "Pierwsza publiczna wersja DINBoard na Androida. Projektuj rozdzielnice, generuj PDF."
4. **Release name:** "1.0.0"
5. Zapisz jako **roboczy**, potem przejrzyj ostrzeżenia

**Przed "Przejrzyj wersję":** Play pokaże **listę braków** (np. "uzupełnij Privacy Policy", "dodaj screenshots"). Wszystkie muszą być zielone.

---

### Krok 2.8: [TY] Weryfikacja tożsamości aplikacji (nowe 2026)

Od 2026 Play może wymagać **weryfikacji aplikacji** (nie tylko dewelopera):
- **App-ids** powiązane z kontem — Play może prosić o potwierdzenie własności `com.dinboard.app`
- Jeśli pyta o **D-U-N-S number** (firmowy) — opcjonalne dla indywidualnych deweloperów

---

### Krok 2.9: [TY] Zatwierdzenie i review

1. **"Przejrzyj wersję"** → **"Rozpocznij wdrażanie do produkcji"**
2. **Czas review Google:** 1-7 dni roboczych (dla nowych kont często dłużej — do 2 tygodni)
3. Status: **"W trakcie sprawdzania"** → jeśli OK: **"Na żywo"**
4. Jeśli odrzucone → Play wyśle email z powodem (najczęściej: Data Safety mismatch, screenshots z desktop, brak deklaracji reklam)

**Po pierwszym approval:** aplikacja pojawia się w sklepie w ciągu kilku godzin.

---

## Część 3 — Checklista przed submitem (sumaryczna)

### Kod / Build (agent + developer)
- [ ] `.gitignore` chroni `*.keystore` i `android/app/release/` (krok 1.1)
- [ ] `colors.xml` dodany (krok 1.2)
- [ ] Keystore wygenerowany przez developera (krok 1.3)
- [ ] `signingConfigs.release` w build.gradle (krok 1.4)
- [ ] `keystore.properties` utworzony (developer, NIE commitowany) (krok 1.4)
- [ ] npm scripts `cap:sync` / `cap:build:android` (krok 1.5)
- [ ] Wersje zsynchronizowane `versionName` ↔ `package.json` (krok 1.6)
- [ ] AAB buduje się i jest podpisany (krok 1.8)
- [ ] AAB instaluje się na emulatorze (krok 1.8)
- [ ] **Vercel Analytics wyłączony w natywnej** (sekcja 2.5.3) — jeśli chcesz proste Data Safety

### Play Console (developer)
- [ ] Konto zweryfikowane (krok 2.1)
- [ ] Aplikacja stworzona (krok 2.2)
- [ ] Play App Signing włączony przy upload (krok 2.3)
- [ ] Store listing kompletny: ikona 512, feature graphic, ≥2 phone screenshots (krok 2.4)
- [ ] Privacy Policy URL: `https://dinboard.pl/polityka-prywatnosci` (krok 2.5.1)
- [ ] Ads declaration (krok 2.5.2)
- [ ] Data Safety form wypełniony zgodnie z rzeczywistością (krok 2.5.3)
- [ ] Content Rating: Everyone (krok 2.5.4)
- [ ] Target Audience: 18+ (krok 2.5.5)
- [ ] Release upload + review rozpoczęty (2.7-2.9)

---

## Najczęstsze powody odrzucenia (unikaj)

1. **Data Safety mismatch** — deklarujesz "nie zbieram danych" a app wysyła analitykę. **Rozwiązanie:** wyłącz Analytics w natywnej (sekcja 2.5.3).
2. **Screenshots z desktop** — Play wymaga mobile/tablet screenshots dla aplikacji mobilnych.
3. **Brak Privacy Policy** albo URL nie odpowiada (404). **Sprawdź:** https://dinboard.pl/polityka-prywatnosci działa.
4. **Target SDK zbyt stary** — DINBoard ma 36, **OK** (wymóg 31.08.2026).
5. **Brak `android:exported`** na activities — DINBoard ma (MainActivity `exported=true`). **OK.**
6. **Permission overclaim** — Play flaguje nieuzasadnione uprawnienia. DINBoard ma tylko INTERNET. **OK.**
7. **WebView violate policies** — jeśli app jest tylko wrapper webowy bez wartości dodanej, Play może odrzucić ("Minimum functionality"). **DINBoard OK** — ma natywny splash, haptics, share, filesystem (realna funkcjonalność natywna).
8. **Broken signing** — keystore hasło błędne, alias nie pasuje. **Testuj** `./gradlew assembleRelease` lokalnie przed upload.

---

## Co agent **MUSI** zrobić (czysto techniczne)
1. Krok 1.1 — `.gitignore`
2. Krok 1.2 — `colors.xml`
3. Krok 1.4 — `signingConfigs` w `build.gradle` (bez generowania keystore'a)
4. Krok 1.5 — npm scripts
5. Krok 1.6 — wersja `1.0.0`
6. [Opcjonalnie] sekcja 2.5.3 — wyłączenie Analytics w natywnej (jeśli developer chce czyste Data Safety)

## Co **musi zrobić developer** (nie agent)
- Krok 1.3 — wygenerowanie keystore (`keytool`)
- Krok 1.8 — build AAB (wymaga haseł)
- Krok 2.1-2.9 — cała Play Console

---

## Źródła oficjalne (2026)

- [Google Play — Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Android Developers — Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Google Help — Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Capacitor — Android build guide](https://capacitorjs.com/docs/android)
- [Capacitor — Publishing to Google Play](https://capacitorjs.com/docs/guides/push-notifications) (analogiczny workflow)

---

## Estymacja pracy

| Etap | Czas |
|---|---|
| Część 1 (agent, kod) | 2-4h |
| Krok 1.3 (developer, keystore) | 15 min |
| Krok 1.8 (developer, build AAB) | 30 min + test na emulatorze |
| Część 2 (developer, Play Console) | 2-4h + 1-3 dni na weryfikację konta |
| Review Google | 1-7 dni roboczych (do 2 tyg. dla nowych kont) |

**Razem do opublikowania:** ~1 tydzień aktywności + 1-2 tygodnie oczekiwania.
