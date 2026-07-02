import fs from 'fs/promises';

async function merge() {
    const plAuto = JSON.parse(await fs.readFile('missing-keys.json', 'utf8'));
    const deAuto = JSON.parse(await fs.readFile('missing-keys-de.json', 'utf8'));

    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    Object.assign(plMain, plAuto);
    Object.assign(deMain, deAuto);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
    
    console.log('Scalono nowe klucze!');
}

merge().catch(console.error);
