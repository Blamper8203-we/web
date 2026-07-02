import fs from 'fs';
import path from 'path';

const pdfDir = 'src/lib/export/pdfPages';
const files = fs.readdirSync(pdfDir)
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
  .map(f => path.join(pdfDir, f));

files.push('src/lib/export/PdfProtocolDocument.tsx');

for (const file of files) {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Zmiana import { t } from "i18next"; na poprawny binding.
    if (content.includes('import { t } from "i18next";')) {
      content = content.replace('import { t } from "i18next";', 'import i18next from "i18next";\nconst t = i18next.t.bind(i18next);');
    }
    
    if (content.includes('import i18next, { t } from "i18next";')) {
      content = content.replace('import i18next, { t } from "i18next";', 'import i18next from "i18next";\nconst t = i18next.t.bind(i18next);');
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated imports in: ${file}`);
  }
}
