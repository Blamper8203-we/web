import fs from 'fs/promises';

function slugify(text) {
  return "auto." + text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15).toLowerCase() + "_" + Math.floor(Math.random()*1000);
}

async function run() {
    const data = JSON.parse(await fs.readFile('untranslated-strings.json', 'utf8'));

    for (const [file, items] of Object.entries(data)) {
        if (items.length === 0) continue;
        if (!file.endsWith('.tsx') || file.includes('.test.') || file.includes('legal')) continue;
        let content = await fs.readFile(file, 'utf8');
        let lines = content.split('\n');
        let needsImport = !content.includes('useTranslation');
        let hasTranslationHook = content.includes('const { t }');

        let modified = false;

        items.forEach(item => {
            let lineIdx = item.line - 1;
            let line = lines[lineIdx];
            if (!line) return;
            // Odfiltruj stringi, które nie są tekstem językowym
            if (/^[0-9\s.,\-+*/%=[\]()><|&]+$/.test(item.text)) return; 
            if (item.text.length < 2) return;
            if (item.text.includes("||") || item.text.includes("&&") || item.text.includes("===") || item.text.includes("Promise") || item.text.includes("event: React")) return;
            if (item.text === "230V" || item.text === "400V" || item.text === "1-fazowe" || item.text === "3-fazowe" || item.text.endsWith("A") || item.text === "kW") return;
            if (item.text === "ReferenceDesignation" || item.text === "Label" || item.text.includes("console.log") || item.text === "before" || item.text === "after") return;

            let key = slugify(item.text);
            
            if (item.type === 'jsx-text' && line.includes(`>${item.text}<`)) {
                lines[lineIdx] = line.replace(`>${item.text}<`, `>{t("${key}", "${item.text}")}<`);
                modified = true;
            } else if (item.type === 'attr' && line.includes(`="${item.text}"`)) {
                lines[lineIdx] = line.replace(`="${item.text}"`, `={t("${key}", "${item.text}")}`);
                modified = true;
            }
        });

        if (modified) {
            let newContent = lines.join('\n');

            if (needsImport) {
                newContent = `import { useTranslation } from "react-i18next";\n` + newContent;
            }
            if (!hasTranslationHook) {
                newContent = newContent.replace(/(export function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/, `$1\n  const { t } = useTranslation();`);
                newContent = newContent.replace(/(export const [a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/, `$1\n  const { t } = useTranslation();`);
            }
            
            await fs.writeFile(file, newContent, 'utf8');
            console.log(`Zaktualizowano ${file}`);
        }
    }
}

run().catch(console.error);
