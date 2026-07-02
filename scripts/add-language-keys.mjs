import fs from 'fs/promises';

async function addLangKeys() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    plMain["app.settingsMenu.language"] = "Język";
    deMain["app.settingsMenu.language"] = "Sprache";

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

addLangKeys().catch(console.error);
