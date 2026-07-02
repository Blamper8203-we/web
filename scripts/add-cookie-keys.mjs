import fs from 'fs/promises';

async function fixCookieKeys() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    const plAdd = {
        "app.cookieConsent.ariaLabel": "Zgoda na pliki cookies",
        "app.cookieConsent.desc": "Używamy lokalnego magazynu przeglądarki i anonimowych statystyk. W przyszłości planujemy wyświetlanie reklam (Google AdSense). Możesz wybrać, na co się zgadzasz.",
        "app.cookieConsent.policyLink": "Polityka prywatności",
        "app.cookieConsent.btnEssential": "Tylko niezbędne",
        "app.cookieConsent.btnAll": "Akceptuję wszystkie"
    };

    const deAdd = {
        "app.cookieConsent.ariaLabel": "Zustimmung zu Cookies",
        "app.cookieConsent.desc": "Wir verwenden den lokalen Browser-Speicher und anonyme Statistiken. In der Zukunft planen wir die Anzeige von Werbung (Google AdSense). Sie können wählen, womit Sie einverstanden sind.",
        "app.cookieConsent.policyLink": "Datenschutzerklärung",
        "app.cookieConsent.btnEssential": "Nur unbedingt notwendige",
        "app.cookieConsent.btnAll": "Alle akzeptieren"
    };

    Object.assign(plMain, plAdd);
    Object.assign(deMain, deAdd);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

fixCookieKeys().catch(console.error);
