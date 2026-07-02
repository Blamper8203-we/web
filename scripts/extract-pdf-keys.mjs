import fs from 'fs';
import path from 'path';

// Złapie zarówno t("klucz", "Wartość domyślna") jak i samo t("klucz")
const REGEX_T = /t\(\s*(["'`])(.*?)\1\s*(?:,\s*(["'`])([\s\S]*?)\3)?\s*(?:,\s*\{.*?\})?\s*\)/g;

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const foldersToScan = [
  path.join(process.cwd(), 'src/components/measurementProtocols'),
  path.join(process.cwd(), 'src/lib/export/pdfPages')
];

let allFiles = [];
foldersToScan.forEach(f => {
  if (fs.existsSync(f)) {
    allFiles = allFiles.concat(findFiles(f));
  }
});

const extractedKeys = {};
let matchCount = 0;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = REGEX_T.exec(content)) !== null) {
    const key = match[2];
    const defaultValue = match[4] || "";
    // Ignoruj dynamiczne (bezpośrednie zmienne) – regex tu złapie tylko stringowe
    
    // Zapobiegaj dodawaniu pustych kluczy i dziwnych złych łapań
    if (key && key.trim() !== '') {
        if (!extractedKeys[key]) {
            extractedKeys[key] = defaultValue;
            matchCount++;
        }
    }
  }
}

console.log(`Zaleziono ${matchCount} unikalnych kluczy w ${allFiles.length} plikach.`);

// Zapisz do temporary JSON bym mógł sprawdzić
const outPath = path.join(process.cwd(), 'scripts', 'temp-pdf-keys.json');
fs.writeFileSync(outPath, JSON.stringify(extractedKeys, null, 2), 'utf-8');
console.log(`Zapisano do ${outPath}`);
