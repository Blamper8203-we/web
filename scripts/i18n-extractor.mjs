import fs from 'fs/promises';
import path from 'path';

async function walk(dir, fileList = []) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if ((await fs.stat(filePath)).isDirectory()) {
            await walk(filePath, fileList);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function run() {
    const files = await walk('src/components');
    const keys = {};

    const regex = /t\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            const defaultValue = match[2];
            if (key.startsWith('auto.')) {
                keys[key] = defaultValue; // Default Polish text
            }
        }
    }

    await fs.writeFile('auto-keys.json', JSON.stringify(keys, null, 2), 'utf8');
    console.log(`Zapisano ${Object.keys(keys).length} kluczy do auto-keys.json`);
}

run().catch(console.error);
