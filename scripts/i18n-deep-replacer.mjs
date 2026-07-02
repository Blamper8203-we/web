import fs from 'fs/promises';
import path from 'path';

function slugify(text) {
  return "auto." + text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15).toLowerCase() + "_" + Math.floor(Math.random()*1000);
}

const ATTRIBUTES = ['title', 'placeholder', 'aria-label', 'content', 'label', 'description', 'message'];
const OBJ_KEYS = ['label', 'description', 'message', 'name', 'tooltip', 'placeholder'];

async function walk(dir, fileList = []) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            await walk(filePath, fileList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            if (!filePath.includes('.test.')) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

async function run() {
    const files = await walk('src');
    const polishRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

    // RegEx do atrybutów JSX: nazwaAtrybutu="Tekst"
    // Uwaga: pomija t() w środku.
    const attrRegex = new RegExp(`(${ATTRIBUTES.join('|')})="([^"]+)"`, 'g');
    
    // RegEx do kluczy obiektów w TS: klucz: "Tekst"
    const objRegex = new RegExp(`(${OBJ_KEYS.join('|')}):\\s*"([^"]+)"`, 'g');

    // RegEx do zwykłych stringów rzucanych w wyjątkach: throw new Error("Błąd")
    const errorRegex = /throw new Error\("([^"]+)"\)/g;

    let totalModifiedFiles = 0;
    let totalReplacements = 0;

    for (const file of files) {
        // Pomińmy pliki legalne, bo tam jest dużo długiego tekstu który zepsuje się w t() jako atrybuty
        if (file.includes('legal') || file.includes('AppIcon')) continue;

        let content = await fs.readFile(file, 'utf8');
        let modified = false;

        const replaceFn = (match, p1, p2) => {
            // Jeśli już użyto t() w p2, to zostawiamy (choć to rzadkie, bo nie powinno być cudzysłowów wewnątrz)
            if (p2.includes('t(')) return match;
            
            // Reaguj tylko na teksty posiadające spację lub polskie litery (omijamy techniczne ID/zmienne)
            if (!polishRegex.test(p2) && !p2.includes(' ')) return match;

            // Ignorujemy jednoliterowe/bardzo krótkie
            if (p2.length <= 2) return match;

            modified = true;
            totalReplacements++;
            
            const key = slugify(p2);
            // Dla atrybutów JSX p1 to nazwa np. title, musimy zwrócić title={t("...", "...")}
            if (ATTRIBUTES.includes(p1) && match.includes('="')) {
                return `${p1}={t("${key}", "${p2}")}`;
            } 
            // Dla obiektów p1 to nazwa klucza np. label, zwracamy label: t("...", "...")
            else {
                return `${p1}: t("${key}", "${p2}")`;
            }
        };

        const replaceErrorFn = (match, p1) => {
             if (p1.includes('t(') || !polishRegex.test(p1)) return match;
             modified = true;
             totalReplacements++;
             const key = slugify(p1);
             return `throw new Error(t("${key}", "${p1}"))`;
        };

        content = content.replace(attrRegex, replaceFn);
        content = content.replace(objRegex, replaceFn);
        content = content.replace(errorRegex, replaceErrorFn);

        if (modified) {
            // Dodawanie importów (tak samo jak ostatnio, z rozróżnieniem warstwy)
            if (file.includes('src\\lib') || file.includes('src/lib') || file.endsWith('.ts')) {
                // Warstwa domenowa lub pliki .ts -> potrzebuje import { t } from "i18next";
                if (!content.includes('import { t } from "i18next"')) {
                    // Czasami i18next jest już importowany na inne sposoby, zignorujmy jeśli jest "from 'i18next'"
                    if (!content.includes("from 'i18next'") && !content.includes('from "i18next"')) {
                         content = 'import { t } from "i18next";\n' + content;
                    }
                }
            } else {
                // Komponenty JSX
                if (!content.includes('useTranslation')) {
                    content = 'import { useTranslation } from "react-i18next";\n' + content;
                }
                if (!content.includes('const { t }')) {
                    // Szukamy początku komponentu... (bardzo uproszczone, dla JSX dodawaliśmy to inaczej w partii 1)
                    // Ale w partii 1 my podmienialiśmy linijka po linijce za pomocą untranslated-strings.json
                    // Nie mogę ot tak wstrzyknąć const { t } bez analizy.
                    // ALE większość komponentów już to ma po partii 1!
                    // Jeżeli nie ma, to zostawię to Lintowi do wyłapania i sam ręcznie naprawię, bo to szybciej niż psucie całych ciał funkcji.
                }
            }

            await fs.writeFile(file, content, 'utf8');
            totalModifiedFiles++;
        }
    }

    console.log(`Przetworzono z sukcesem. Zmodyfikowano pliki: ${totalModifiedFiles}. Zamienionych tekstów: ${totalReplacements}.`);
}

run().catch(console.error);
