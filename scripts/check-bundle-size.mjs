// Budżet rozmiaru bundla (P3-1). Uruchamiane po `npm run build` (lokalnie i w CI).
// Sumuje rozmiar JS w dist/assets po gzipie (to widzi przeglądarka na telefonie)
// i faili, jeśli przekroczy budżet. Cel: żeby apka nie urosła niepostrzeżenie.
//
// Bez dodatkowych zależności — używa wbudowanego zlib. Gdy przekroczenie jest
// świadome i uzasadnione, podnieś BUDGET_GZIP_KB w tym pliku (jednym commitem,
// z uzasadnieniem), zamiast wyłączać sprawdzenie.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

// Punkt odniesienia: ~809 KB gzip (2026-07-23). Headroom ~18% na normalny wzrost;
// duży skok (np. nowa ciężka zależność) świadomie zatrzyma CI.
const BUDGET_GZIP_KB = 950;

const ASSETS_DIR = path.resolve(process.cwd(), "dist", "assets");

if (!existsSync(ASSETS_DIR)) {
  console.error(`✗ Brak ${ASSETS_DIR}. Uruchom najpierw \`npm run build\`.`);
  process.exit(1);
}

let rawTotal = 0;
let gzTotal = 0;
const rows = [];

for (const file of readdirSync(ASSETS_DIR)) {
  if (!file.endsWith(".js")) continue;
  const buf = readFileSync(path.join(ASSETS_DIR, file));
  const gz = gzipSync(buf).length;
  rawTotal += buf.length;
  gzTotal += gz;
  rows.push({ file, gz });
}

const kb = (bytes) => (bytes / 1024).toFixed(0);
const gzTotalKB = gzTotal / 1024;

rows.sort((a, b) => b.gz - a.gz);
console.log("Największe chunki JS (gzip):");
for (const r of rows.slice(0, 8)) {
  console.log(`  ${kb(r.gz).padStart(5)} KB  ${r.file}`);
}
console.log("");
console.log(`JS raw:  ${kb(rawTotal)} KB`);
console.log(`JS gzip: ${kb(gzTotal)} KB  (budżet: ${BUDGET_GZIP_KB} KB)`);

if (gzTotalKB > BUDGET_GZIP_KB) {
  console.error(
    `\n✗ Bundle za duży: ${gzTotalKB.toFixed(0)} KB > budżet ${BUDGET_GZIP_KB} KB.\n` +
      `  Zmniejsz go albo świadomie podnieś BUDGET_GZIP_KB w scripts/check-bundle-size.mjs.`,
  );
  process.exit(1);
}

console.log(`\n✓ OK: ${gzTotalKB.toFixed(0)} KB mieści się w budżecie ${BUDGET_GZIP_KB} KB.`);
