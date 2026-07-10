import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, search, replace) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(search)) {
    fs.writeFileSync(fullPath, content.replace(search, replace), 'utf8');
    console.log(`Zaktualizowano: ${filePath}`);
  }
}

// 1. Zmiana twardego stringa w plikach PDF
replaceInFile(
  'src/lib/export/pdfPages/PdfUnifiedTablePage.tsx',
  'Protokół Pomiarów Nr <Text',
  '{t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}<Text'
);

replaceInFile(
  'src/lib/export/pdfPages/PdfRcdTablePage.tsx',
  'Protokół Pomiarów Nr <Text',
  '{t("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")}<Text'
);

// 2. Zmiana klucza w Tabs UI
replaceInFile(
  'src/components/measurementProtocols/UnifiedProtocolsTab.tsx',
  't("app.pdfDocumentationPage.editor.unifiedProtocol.protocolNrPrefix", "Protokół Pomiarów Nr ")',
  't("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")'
);

replaceInFile(
  'src/components/measurementProtocols/RcdProtocolsTab.tsx',
  't("app.pdfDocumentationPage.editor.unifiedProtocol.protocolNrPrefix", "Protokół Pomiarów Nr ")',
  't("pdf.shared.protocolNrPrefix", "Protokół Pomiarów Nr ")'
);

// 3. Zmiana w testach, jesli wystepuje ten ciag - ignoruje bo to tyczy sie weryfikacji. 

// 4. Aktualizacja slownika pl
const plPath = path.resolve('src/locales/pl/translation.json');

const plData = JSON.parse(fs.readFileSync(plPath, 'utf8'));
if (!plData.pdf.shared) plData.pdf.shared = {};
plData.pdf.shared.protocolNrPrefix = "Protokół Pomiarów Nr ";
fs.writeFileSync(plPath, JSON.stringify(plData, null, 2), 'utf8');
