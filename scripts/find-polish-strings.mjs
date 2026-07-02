import fs from 'fs/promises';
import path from 'path';

async function walk(dir, fileList = []) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            await walk(filePath, fileList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            if (!filePath.includes('.test.')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

async function run() {
    const files = await walk('src');
    const regex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    const report = {};

    let total = 0;
    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Jeśli linia zawiera t( albo i18n, pomijamy, żeby zignorować domyślne fallbacki.
            // Również pomijamy komentarze (nie jest to perfekcyjne, ale użyteczne).
            if (line.includes('t(') || line.includes('i18n') || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
                continue;
            }

            if (regex.test(line)) {
                if (!report[file]) report[file] = [];
                report[file].push({ line: i + 1, content: line.trim() });
                total++;
            }
        }
    }

    await fs.writeFile('missing-translations-report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log(`Znaleziono ${total} linii z potencjalnie nieprzetłumaczonym tekstem w ${Object.keys(report).length} plikach.`);
}

run().catch(console.error);
