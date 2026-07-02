import fs from 'fs/promises';

async function fixFooterKeys() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    const plAdd = {
        "landing.footer.privacy": "Polityka prywatności",
        "landing.footer.terms": "Warunki korzystania",
        "landing.footer.contact": "Zgłoś problem",
        "landing.footer.subtitle": "Projektowanie schematów i dokumentacji z zachowaniem najwyższych standardów elektrycznych.",
        "landing.footer.copyright": "© 2026 DINBoard. Wszelkie prawa zastrzeżone."
    };

    const deAdd = {
        "landing.footer.privacy": "Datenschutzerklärung",
        "landing.footer.terms": "Nutzungsbedingungen",
        "landing.footer.contact": "Problem melden",
        "landing.footer.subtitle": "Planung von Schaltplänen und Dokumentationen nach höchsten elektrischen Standards.",
        "landing.footer.copyright": "© 2026 DINBoard. Alle Rechte vorbehalten."
    };

    Object.assign(plMain, plAdd);
    Object.assign(deMain, deAdd);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

fixFooterKeys().catch(console.error);
