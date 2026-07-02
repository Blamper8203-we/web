import fs from 'fs/promises';

async function fixBalanceKeys() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    const plAdd = {
        "app.powerBalance.title": "BILANS MOCY",
        "app.powerBalance.installedPower": "Moc zainstalowana",
        "app.powerBalance.calculatedPower": "Moc obliczeniowa",
        "app.powerBalance.simultaneityFactor": "Współczynnik jednoczesności",
        "app.powerBalance.connectionTitle": "MOC PRZYŁĄCZENIOWA VS BILANS",
        "app.powerBalance.connectionPower": "Moc przyłączeniowa",
        "app.powerBalance.powerUsage": "Wykorzystanie mocy",
        "app.powerBalance.powerReserve": "Rezerwa mocy",
        "app.powerBalance.statusOk": "Bilans mieści się w mocy przyłączeniowej",
        "app.powerBalance.statusCritical": "Przekroczono moc przyłączeniową",
        "app.powerBalance.phaseBalanceTitle": "BILANS FAZ",
        "app.powerBalance.cosPhiTooltip": "Współczynnik mocy użyty do przeliczenia prądu z mocy zainstalowanej",
        "app.powerBalance.phaseImbalance": "Asymetria faz",
        "app.powerBalance.circuitTableTitle": "OBCIĄŻENIA OBWODÓW",
        "app.powerBalance.circuitTableEmpty": "Brak obwodów MCB/RCBO do bilansu.",
        "app.powerBalance.circuitTableRef": "Ozn.",
        "app.powerBalance.circuitTableName": "Obwód",
        "app.powerBalance.circuitTablePhase": "Faza",
        "app.powerBalance.circuitTablePower": "Moc",
        "app.powerBalance.circuitTableCurrent": "Prąd",
        "app.powerBalance.circuitTableLocked": "Blok.",
        "app.common.yes": "Tak",
        "app.powerBalance.insightsTitle": "ANALIZA ASYMETRII",
        "app.powerBalance.insightsEmpty": "Brak dominującej fazy w obwodach jednofazowych.",
        "app.powerBalance.heaviestPhase": "Najbardziej obciążona faza",
        "app.powerBalance.lightestPhase": "Najmniej obciążona faza",
        "app.powerBalance.spreadPower": "Różnica obciążenia",
        "app.powerBalance.suggestionsTitle": "SUGESTIE PRZENIESIENIA",
        "app.powerBalance.suggestionsEmpty": "Brak prostych przeniesień, które poprawiają asymetrię.",
        "app.powerBalance.suggestionApply": "Zastosuj",
        "app.powerBalance.autoBalanceTitle": "Automatyczne bilansowanie",
        "app.powerBalance.autoBalanceMode": "Tryb:",
        "app.powerBalance.modeCurrent": "Według prądu (A)",
        "app.powerBalance.modePower": "Według mocy (W)",
        "app.powerBalance.autoBalanceScope": "Zakres:",
        "app.powerBalance.scopeUnlocked": "Tylko niezablokowane",
        "app.powerBalance.scopeAll1F": "Wszystkie 1F",
        "app.powerBalance.btnPreview": "Podgląd planu",
        "app.powerBalance.btnApply": "Zastosuj bilans"
    };

    const deAdd = {
        "app.powerBalance.title": "LEISTUNGSBILANZ",
        "app.powerBalance.installedPower": "Installierte Leistung",
        "app.powerBalance.calculatedPower": "Berechnete Leistung",
        "app.powerBalance.simultaneityFactor": "Gleichzeitigkeitsfaktor",
        "app.powerBalance.connectionTitle": "ANSCHLUSSLEISTUNG VS BILANZ",
        "app.powerBalance.connectionPower": "Anschlussleistung",
        "app.powerBalance.powerUsage": "Leistungsnutzung",
        "app.powerBalance.powerReserve": "Leistungsreserve",
        "app.powerBalance.statusOk": "Bilanz liegt innerhalb der Anschlussleistung",
        "app.powerBalance.statusCritical": "Anschlussleistung überschritten",
        "app.powerBalance.phaseBalanceTitle": "PHASENBILANZ",
        "app.powerBalance.cosPhiTooltip": "Leistungsfaktor zur Umrechnung von Strom in installierte Leistung",
        "app.powerBalance.phaseImbalance": "Phasenasymmetrie",
        "app.powerBalance.circuitTableTitle": "STROMKREISBELASTUNGEN",
        "app.powerBalance.circuitTableEmpty": "Keine MCB/RCBO-Stromkreise für die Bilanz.",
        "app.powerBalance.circuitTableRef": "Bez.",
        "app.powerBalance.circuitTableName": "Stromkreis",
        "app.powerBalance.circuitTablePhase": "Phase",
        "app.powerBalance.circuitTablePower": "Leistung",
        "app.powerBalance.circuitTableCurrent": "Strom",
        "app.powerBalance.circuitTableLocked": "Sperre",
        "app.common.yes": "Ja",
        "app.powerBalance.insightsTitle": "ASYMMETRIE-ANALYSE",
        "app.powerBalance.insightsEmpty": "Keine dominierende Phase in einphasigen Stromkreisen.",
        "app.powerBalance.heaviestPhase": "Am stärksten belastete Phase",
        "app.powerBalance.lightestPhase": "Am wenigsten belastete Phase",
        "app.powerBalance.spreadPower": "Belastungsdifferenz",
        "app.powerBalance.suggestionsTitle": "VERSCHIEBUNGSVORSCHLÄGE",
        "app.powerBalance.suggestionsEmpty": "Keine einfachen Verschiebungen, die die Asymmetrie verbessern.",
        "app.powerBalance.suggestionApply": "Anwenden",
        "app.powerBalance.autoBalanceTitle": "Automatischer Ausgleich",
        "app.powerBalance.autoBalanceMode": "Modus:",
        "app.powerBalance.modeCurrent": "Nach Strom (A)",
        "app.powerBalance.modePower": "Nach Leistung (W)",
        "app.powerBalance.autoBalanceScope": "Umfang:",
        "app.powerBalance.scopeUnlocked": "Nur ungesperrte",
        "app.powerBalance.scopeAll1F": "Alle 1-Phasigen",
        "app.powerBalance.btnPreview": "Planvorschau",
        "app.powerBalance.btnApply": "Bilanz anwenden"
    };

    Object.assign(plMain, plAdd);
    Object.assign(deMain, deAdd);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

fixBalanceKeys().catch(console.error);
