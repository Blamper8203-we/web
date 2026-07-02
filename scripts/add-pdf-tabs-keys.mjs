import fs from 'fs';
import path from 'path';

const tabKeys = {
  "pdf.tabs.title-page": { pl: "Strona główna", de: "Startseite" },
  "pdf.tabs.unified": { pl: "Tabela zbiorcza", de: "Sammeltabelle" },
  "pdf.tabs.rcd-ground": { pl: "RCD i uziemienie", de: "RCD und Erdung" },
  "pdf.tabs.circuit-list": { pl: "Lista obwodów", de: "Stromkreisliste" },
  "pdf.tabs.din-rail": { pl: "Rozdzielnica elektryczna", de: "Elektroverteilung" },
  "pdf.tabs.din-rail-connections": { pl: "Rozdzielnica połączenia", de: "Verteileranschlüsse" },
  "pdf.tabs.schematic": { pl: "Schemat obwodów", de: "Stromlaufplan" }
};

function updateLocales() {
  const plPath = path.join(process.cwd(), 'src/locales/pl/translation.json');
  const dePath = path.join(process.cwd(), 'src/locales/de/translation.json');

  const plDict = JSON.parse(fs.readFileSync(plPath, 'utf8'));
  const deDict = JSON.parse(fs.readFileSync(dePath, 'utf8'));

  for (const [key, t] of Object.entries(tabKeys)) {
    plDict[key] = t.pl;
    deDict[key] = t.de;
  }

  fs.writeFileSync(plPath, JSON.stringify(plDict, null, 2), 'utf8');
  fs.writeFileSync(dePath, JSON.stringify(deDict, null, 2), 'utf8');
  console.log('Successfully injected PDF Tab keys to DE and PL locales.');
}

updateLocales();
