import type { SymbolItem } from "../../types/symbolItem";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { ValidationResult } from "../validation/electricalValidationService";
import type { PhaseDistributionResult } from "../phaseDistribution/phaseDistributionCalculator";

export interface PdfExportOptions {
  includeTitlePage: boolean;
  includeSingleLineDiagram: boolean;
  includeDinRailDiagram: boolean;
  includeCircuitTable: boolean;
  includePowerBalance: boolean;
  includeMeasurementProtocols: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: PdfExportOptions = {
  includeTitlePage: true,
  includeSingleLineDiagram: true,
  includeDinRailDiagram: true,
  includeCircuitTable: true,
  includePowerBalance: true,
  includeMeasurementProtocols: true,
};

export async function exportToPdf(
  metadata: ProjectMetadata,
  symbols: SymbolItem[],
  phaseDistribution: PhaseDistributionResult,
  validationResult: ValidationResult,
  options: PdfExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<void> {
  // Create a hidden printable view
  const printContainer = document.createElement("div");
  printContainer.id = "pdf-export-container";
  printContainer.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;";

  if (options.includeTitlePage) {
    printContainer.appendChild(buildTitlePage(metadata));
  }

  if (options.includeCircuitTable) {
    printContainer.appendChild(buildCircuitTable(symbols));
  }

  if (options.includePowerBalance) {
    printContainer.appendChild(buildPowerBalancePage(phaseDistribution, validationResult));
  }

  if (options.includeMeasurementProtocols) {
    printContainer.appendChild(buildMeasurementProtocols(metadata));
  }

  document.body.appendChild(printContainer);

  // Trigger print
  window.print();

  // Cleanup after print
  setTimeout(() => {
    printContainer.remove();
  }, 1000);
}

function buildTitlePage(metadata: ProjectMetadata): HTMLElement {
  const page = document.createElement("div");
  page.className = "pdf-page pdf-title-page";
  page.innerHTML = `
    <h1 class="pdf-title">PROJEKT ROZDZIELNICY ELEKTRYCZNEJ</h1>
    <div class="pdf-meta">
      <p><strong>Obiekt:</strong> ${metadata.company || "Brak danych"}</p>
      <p><strong>Adres:</strong> ${metadata.address || "Brak danych"}</p>
      <p><strong>Inwestca:</strong> ${metadata.investor || "Brak danych"}</p>
      <p><strong>Projektant:</strong> ${metadata.author || "Brak danych"}</p>
      <p><strong>Data:</strong> ${formatDate(metadata.drawingDate)}</p>
      <p><strong>Numer projektu:</strong> ${metadata.projectNumber || "Brak danych"}</p>
    </div>
  `;
  return page;
}

function buildCircuitTable(symbols: SymbolItem[]): HTMLElement {
  const page = document.createElement("div");
  page.className = "pdf-page";
  page.innerHTML = `<h2 class="pdf-section-title">Lista obwodów</h2>`;

  const table = document.createElement("table");
  table.className = "pdf-circuit-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Oznaczenie</th>
        <th>Nazwa obwodu</th>
        <th>Lokalizacja</th>
        <th>Zabezpieczenie</th>
        <th>Faza</th>
        <th>Moc [W]</th>
        <th>Przekrój przewodu</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody")!;
  const circuitSymbols = symbols.filter((s) => s.deviceKind === "mcb" || s.deviceKind === "rcbo");

  for (const symbol of circuitSymbols) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${symbol.referenceDesignation || "-"}</td>
      <td>${symbol.circuitName || symbol.label || "-"}</td>
      <td>${symbol.displayLocation}</td>
      <td>${symbol.displayProtection || symbol.protectionType || "-"}</td>
      <td>${symbol.phase}</td>
      <td>${symbol.powerW > 0 ? symbol.powerW.toFixed(0) : "-"}</td>
      <td>${symbol.cableCrossSection}mm²</td>
    `;
    tbody.appendChild(row);
  }

  page.appendChild(table);
  return page;
}

function buildPowerBalancePage(
  phaseDistribution: PhaseDistributionResult,
  validationResult: ValidationResult,
): HTMLElement {
  const page = document.createElement("div");
  page.className = "pdf-page";
  page.innerHTML = `<h2 class="pdf-section-title">Bilans mocy</h2>`;

  const balanceTable = document.createElement("table");
  balanceTable.className = "pdf-balance-table";
  balanceTable.innerHTML = `
    <thead>
      <tr>
        <th>Faza</th>
        <th>Moc [W]</th>
        <th>Prąd [A]</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>L1</td><td>${phaseDistribution.l1PowerW.toFixed(0)}</td><td>${phaseDistribution.l1CurrentA.toFixed(1)}</td></tr>
      <tr><td>L2</td><td>${phaseDistribution.l2PowerW.toFixed(0)}</td><td>${phaseDistribution.l2CurrentA.toFixed(1)}</td></tr>
      <tr><td>L3</td><td>${phaseDistribution.l3PowerW.toFixed(0)}</td><td>${phaseDistribution.l3CurrentA.toFixed(1)}</td></tr>
    </tbody>
  `;
  page.appendChild(balanceTable);

  const imbalance = document.createElement("p");
  imbalance.className = "pdf-imbalance";
  imbalance.textContent = `Asymetria obciazenia: ${phaseDistribution.imbalancePercent.toFixed(1)}%`;
  page.appendChild(imbalance);

  // Validation summary
  if (validationResult.errors.length > 0 || validationResult.warnings.length > 0) {
    page.innerHTML += `<h3 class="pdf-section-title">Podsumowanie walidacji</h3>`;

    if (validationResult.errors.length > 0) {
      const errorsDiv = document.createElement("div");
      errorsDiv.className = "pdf-validation-errors";
      errorsDiv.innerHTML = `<h4>Bledy (${validationResult.errors.length})</h4>`;
      for (const error of validationResult.errors) {
        const p = document.createElement("p");
        p.className = "pdf-validation-error";
        p.textContent = `[${error.code}] ${error.message}`;
        errorsDiv.appendChild(p);
      }
      page.appendChild(errorsDiv);
    }

    if (validationResult.warnings.length > 0) {
      const warningsDiv = document.createElement("div");
      warningsDiv.className = "pdf-validation-warnings";
      warningsDiv.innerHTML = `<h4>Ostrzezenia (${validationResult.warnings.length})</h4>`;
      for (const warning of validationResult.warnings) {
        const p = document.createElement("p");
        p.className = "pdf-validation-warning";
        p.textContent = `[${warning.code}] ${warning.message}`;
        warningsDiv.appendChild(p);
      }
      page.appendChild(warningsDiv);
    }
  }

  return page;
}

function buildMeasurementProtocols(metadata: ProjectMetadata): HTMLElement {
  const page = document.createElement("div");
  page.className = "pdf-page";

  const protocols = metadata.measurementProtocols;
  if (!protocols) return page;

  // Continuity page
  if (protocols.continuityRows && protocols.continuityRows.length > 0) {
    page.appendChild(
      buildProtocolTable(
        protocols.continuityHeader?.headerTitle || "Protokol ciaglosci PE",
        [
          "Lp.",
          "Oznaczenie",
          "Nazwa obwodu",
          "Lokalizacja",
          "Polaczenie",
          "R [Ohm]",
          "Ocena",
        ],
        protocols.continuityRows.map((row: { index: number; referenceDesignation: string; circuitName: string; location: string; connectionType: string; measuredResistance: string; assessment: string }) => [
          String(row.index),
          row.referenceDesignation,
          row.circuitName,
          row.location,
          row.connectionType,
          row.measuredResistance,
          row.assessment,
        ]),
      ),
    );
  }

  // Loop impedance
  if (protocols.loopImpedanceRows && protocols.loopImpedanceRows.length > 0) {
    page.appendChild(
      buildProtocolTable(
        protocols.loopHeader?.headerTitle || "Protokol petli zwarcia",
        [
          "Lp.",
          "Oznaczenie",
          "Nazwa obwodu",
          "Zabezpieczenie",
          "Ia [A]",
          "Zs [Ohm]",
          "Zs max [Ohm]",
          "Ocena",
        ],
        protocols.loopImpedanceRows.map((row: { index: number; referenceDesignation: string; circuitName: string; protectionType: string; tripCurrent: string; measuredImpedance: string; allowedImpedance: string; assessment: string }) => [
          String(row.index),
          row.referenceDesignation,
          row.circuitName,
          row.protectionType,
          row.tripCurrent,
          row.measuredImpedance,
          row.allowedImpedance,
          row.assessment,
        ]),
      ),
    );
  }

  // Insulation
  if (protocols.insulationRows && protocols.insulationRows.length > 0) {
    page.appendChild(
      buildProtocolTable(
        protocols.insulationHeader?.headerTitle || "Protokol izolacji",
        [
          "Lp.",
          "Oznaczenie",
          "Nazwa obwodu",
          "R L-N [MOhm]",
          "R L-PE [MOhm]",
          "R N-PE [MOhm]",
          "Wymagana",
          "Ocena",
        ],
        protocols.insulationRows.map((row: { index: number; referenceDesignation: string; circuitName: string; lnResistance: string; lpeResistance: string; npeResistance: string; requiredResistance: string; assessment: string }) => [
          String(row.index),
          row.referenceDesignation,
          row.circuitName,
          row.lnResistance,
          row.lpeResistance,
          row.npeResistance,
          row.requiredResistance,
          row.assessment,
        ]),
      ),
    );
  }

  // RCD & Ground
  if (protocols.rcdRows && protocols.rcdRows.length > 0) {
    page.appendChild(
      buildProtocolTable(
        protocols.rcdGroundHeader?.headerTitle || "Protokol RCD i uziemienia",
        [
          "Lp.",
          "Oznaczenie",
          "Typ urządzenia",
          "IΔn [mA]",
          "I test [A]",
          "Czas [ms]",
          "Przycisk test",
          "Ocena",
        ],
        protocols.rcdRows.map((row: { index: number; referenceDesignation: string; deviceType: string; residualCurrent: string; tripCurrent: string; tripTimeMs: string; testButtonResult: string; assessment: string }) => [
          String(row.index),
          row.referenceDesignation,
          row.deviceType,
          row.residualCurrent,
          row.tripCurrent,
          row.tripTimeMs,
          row.testButtonResult,
          row.assessment,
        ]),
      ),
    );
  }

  return page;
}

function buildProtocolTable(
  title: string,
  headers: string[],
  rows: string[][],
): HTMLElement {
  const container = document.createElement("div");
  container.className = "pdf-protocol-section";
  container.innerHTML = `<h3 class="pdf-protocol-title">${title}</h3>`;

  const table = document.createElement("table");
  table.className = "pdf-protocol-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell || "-";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  container.appendChild(table);
  return container;
}

function formatDate(value: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pl-PL");
  } catch {
    return value;
  }
}
