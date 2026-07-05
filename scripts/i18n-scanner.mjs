import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = './src';
const EXT_REGEX = /\.tsx?$/;

// RegExp matching strings between > and <, ensuring it doesn't match single spaces, and starts/ends without JSX blocks
const JSX_TEXT_REGEX = />([^<{}]+)</g;
const ATTRIBUTE_REGEX = /(?:placeholder|label|title|aria-label)="([^"{]+)"/g;

async function walkDir(dir) {
    let results = [];
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            results = results.concat(await walkDir(filePath));
        } else if (EXT_REGEX.test(file)) {
            results.push(filePath);
        }
    }
    return results;
}

async function scan() {
    console.log("Rozpoczynam skanowanie plików TSX pod kątem polskich fraz...");
    const files = await walkDir(SRC_DIR);
    const report = {};

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        let fileResults = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Ignoruj komentarze, puste linie lub linie już zawierające "t(" (z useTranslation)
            if (line.trim().startsWith('//') || line.trim() === '' || line.includes('t(')) {
                continue;
            }

            let match;
            // Sprawdź tekst JSX >Tekst<
            while ((match = JSX_TEXT_REGEX.exec(line)) !== null) {
                const text = match[1].trim();
                if (text && text.length > 1 && /[A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) {
                    // Wyklucz same liczby, operatory itp
                    if (!/^[0-9\s.,\-+*/%=[\]()]+$/.test(text)) {
                        fileResults.push({ line: i + 1, type: 'jsx-text', text });
                    }
                }
            }

            // Sprawdź atrybuty placeholder="tekst"
            while ((match = ATTRIBUTE_REGEX.exec(line)) !== null) {
                const text = match[1].trim();
                if (text && text.length > 1) {
                    fileResults.push({ line: i + 1, type: 'attr', text });
                }
            }
        }

        if (fileResults.length > 0) {
            report[file] = fileResults;
        }
    }

    const reportPath = 'untranslated-strings.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Zakończono! Znaleziono niesprzetłumaczone ciągi w ${Object.keys(report).length} plikach.`);
    console.log(`Raport zapisany w: ${reportPath}`);
}

scan().catch(err => console.error(err));
