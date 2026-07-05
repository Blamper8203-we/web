const fs = require('fs');
const files = [
  'src/components/ConnectionsLeftPanel.tsx',
  'src/lib/pdfDocumentation.ts',
  'src/lib/projectFile.ts',
  'src/lib/projectFileSemantics.ts',
  'src/lib/validation/validationEditTargets.ts',
  'src/lib/validation/rules/val-007-main-overload.ts',
  'src/lib/validation/rules/val-009-rcd-hierarchy.ts',
  'src/lib/validation/rules/val-022-rcd-selectivity.ts',
  'src/lib/validation/validationRuleDescriptions.ts',
  'src/lib/validation/validationQuickFixes.ts'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/t\("[^"]+",\s*("[^"]+")\)/g, '$1');
  c = c.replace(/import \{ t \} from "i18next";\n/g, '');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
