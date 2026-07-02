import fs from 'fs';
import path from 'path';

const smartKeys = {
  "pdf.smart.montaz": { pl: "Montaż rozdzielnicy głównej", de: "Montage der Hauptverteilung" },
  "pdf.smart.ukladanie": { pl: "Układanie przewodów i osprzętu", de: "Verlegung von Leitungen und Zubehör" },
  "pdf.smart.pomiary": { pl: "Pomiary ochrony przeciwporażeniowej", de: "Messungen zum Schutz gegen elektrischen Schlag" },
  "pdf.smart.tabela": { pl: "Tabela zbiorcza pomiarów", de: "Zusammenfassende Tabelle der Messungen" },
  "pdf.smart.rcd": { pl: "RCD i uziemienie", de: "RCD und Erdung" },
  "pdf.smart.schemat": { pl: "Schemat instalacji elektrycznej", de: "Schaltplan der elektrischen Anlage" },
  "pdf.smart.widok": { pl: "Widok rozdzielnicy elektrycznej", de: "Ansicht der Elektroverteilung" },
  "pdf.smart.lista": { pl: "Lista obwodów", de: "Stromkreisliste" },
  "pdf.smart.budynek": { pl: "Budynek jednorodzinny / Lokal mieszkalny", de: "Einfamilienhaus / Wohngebäude" },
  "pdf.smart.dokumentacja": { pl: "Dokumentacja powykonawcza instalacji elektrycznej", de: "Bestandsdokumentation der Elektroinstallation" },
  "pdf.smart.pieczatka": { pl: "PIECZĄTKA WYKONAWCY", de: "STEMPEL DES AUFTRAGNEHMERS" }
};

function updateLocales() {
  const plPath = path.join(process.cwd(), 'src/locales/pl/translation.json');
  const dePath = path.join(process.cwd(), 'src/locales/de/translation.json');

  const plDict = JSON.parse(fs.readFileSync(plPath, 'utf8'));
  const deDict = JSON.parse(fs.readFileSync(dePath, 'utf8'));

  for (const [key, t] of Object.entries(smartKeys)) {
    plDict[key] = t.pl;
    deDict[key] = t.de;
  }

  fs.writeFileSync(plPath, JSON.stringify(plDict, null, 2), 'utf8');
  fs.writeFileSync(dePath, JSON.stringify(deDict, null, 2), 'utf8');
  console.log('Successfully injected Smart Fallback keys.');
}

updateLocales();
