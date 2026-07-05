import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/locales/pl/translation.json',
  'src/locales/de/translation.json',
  'src/components/measurementProtocols/TitlePageTab.tsx',
  'src/components/measurementProtocols/RcdProtocolsTab.tsx',
  'src/components/measurementProtocols/UnifiedProtocolsTab.tsx'
];

for (const relPath of filesToUpdate) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.replace(/"app\.pdf\./g, '"pdf.');
    
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`Updated: ${relPath}`);
    } else {
      console.log(`No changes needed in: ${relPath}`);
    }
  } else {
    console.error(`File not found: ${relPath}`);
  }
}
