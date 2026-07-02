import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const DE_JSON_PATH = path.join(SRC_DIR, 'locales', 'de', 'translation.json');

// Bardzo pobłażliwe wyrażenie szukające t("...", "...") lub t('...', '...') i wszelkich odmian
const REGEX_T = /t\(\s*(["'`])(.*?)\1(?:,\s*(["'`])([\s\S]*?)\3)?/g;

function findTsxTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findTsxTsFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = findTsxTsFiles(SRC_DIR);
let deDict = {};
try {
  deDict = JSON.parse(fs.readFileSync(DE_JSON_PATH, 'utf-8'));
} catch (err) {
  console.error("Brak niemieckiego słownika", err);
}

let missingKeys = 0;
let foundKeys = 0;
const missingSet = new Set();
const missingLog = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = REGEX_T.exec(content)) !== null) {
    const key = match[2];
    const defaultVal = match[4] || "";
    if (!key || key.trim() === "") continue;

    foundKeys++;

    // Sprawdzamy czy dany klucz istnieje w słowniku DE (nieważne co ma w wartości, oby był - ewentualnie czy wartość nie jest pusta)
    if (deDict[key] === undefined || deDict[key] === null || deDict[key] === "") {
        if (!missingSet.has(key)) {
            missingSet.add(key);
            missingKeys++;
            missingLog.push({
                key,
                defaultValue: defaultVal,
                file: path.relative(SRC_DIR, file)
            });
        }
    }
  }
}

// Zapiszmy raport do JSON-a 
const outPath = path.join(process.cwd(), 'scripts', 'missing-translations-report.json');
fs.writeFileSync(outPath, JSON.stringify({ 
    totalFilesScanned: allFiles.length,
    totalTKeysFound: foundKeys,
    totalMissingInDE: missingKeys,
    missingDetails: missingLog
}, null, 2));

console.log(`Audyt zakończony! Przeskanowano ${allFiles.length} plików.`);
console.log(`Zaleziono ${foundKeys} wywołań t().`);
console.log(`Brakuje ${missingKeys} unikalnych kluczy w słowniku de/translation.json.`);
console.log(`Szczegółowy raport zapisany w: ${outPath}`);
