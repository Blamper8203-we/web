import fs from 'fs/promises';

async function update() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    const plAdd = {
        "landing.instalacji": "instalacji elektrycznej",
        "landing.warning": "Jeżeli nie posiadasz uprawnień elektrycznych (SEP), każdy schemat zaprojektowany w tej aplikacji musi zostać bezwzględnie sprawdzony i zatwierdzony przez wykwalifikowanego elektryka. Prąd elektryczny stanowi bezpośrednie zagrożenie zdrowia i życia — nie wykonuj montażu instalacji na własną rękę bez odpowiedniej wiedzy.",
        "landing.info": "Aplikacja rozwija się dynamicznie. Wygenerowane schematy i obliczenia bilansu mocy mają charakter pomocniczy.",
        "landing.startEditor": "Uruchom darmowy edytor"
    };

    const deAdd = {
        "landing.instalacji": "der Elektroinstallation",
        "landing.warning": "Wenn Sie über keine elektrische Qualifikation (SEP) verfügen, muss jeder in dieser Anwendung entworfene Schaltplan zwingend von einem qualifizierten Elektriker geprüft und genehmigt werden. Elektrischer Strom stellt eine direkte Gefahr für Gesundheit und Leben dar – führen Sie die Installation nicht ohne entsprechendes Fachwissen selbst durch.",
        "landing.info": "Die Anwendung entwickelt sich dynamisch weiter. Generierte Schaltpläne und Leistungsbilanzberechnungen dienen nur zur Unterstützung.",
        "landing.startEditor": "Kostenlosen Editor starten"
    };

    Object.assign(plMain, plAdd);
    Object.assign(deMain, deAdd);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

update().catch(console.error);
