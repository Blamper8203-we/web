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
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function run() {
    const files = await walk('src');
    const existingDe = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));
    
    const missingKeys = {};
    const regex = /t\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            const defaultValue = match[2];
            
            if (key.startsWith('auto.')) {
                if (!existingDe[key]) {
                    missingKeys[key] = defaultValue;
                }
            }
        }
    }

    await fs.writeFile('missing-keys.json', JSON.stringify(missingKeys, null, 2), 'utf8');
    console.log(`Wyekstrahowano ${Object.keys(missingKeys).length} nowych brakujących kluczy.`);
}

run().catch(console.error);
