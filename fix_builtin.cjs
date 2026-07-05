/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
let c = fs.readFileSync('src/lib/modules/builtinModules.ts', 'utf8');

// Replace t("key", "Value") with just "Value"
c = c.replace(/t\("[^"]+",\s*("[^"]+")\)/g, '$1');
c = c.replace(/import \{ t \} from "i18next";\n/g, '');

fs.writeFileSync('src/lib/modules/builtinModules.ts', c);
console.log('Fixed builtinModules.ts');
