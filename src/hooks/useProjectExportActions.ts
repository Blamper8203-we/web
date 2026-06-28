import { Capacitor } from '@capacitor/core';
import { useCallback } from 'react';
import { exportToPdf } from '../lib/export/pdfExportService';
import { exportDinRailToBlobWithOptions } from '../lib/export/dinRailSnapshotService';
import type { ProjectMetadata } from '../types/projectMetadata';
import type { SymbolItem } from '../types/symbolItem';
import type { ConnectionItem } from '../types/connectionItem';
import type { DinRailCanvasRail } from '../components/DinRailCanvasPixi';

function escapeCsv(value: string | number): string {
  const normalized = String(value ?? "");
  if (normalized.includes(";") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
}

interface UseProjectExportActionsParams {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  connections: ConnectionItem[];
  dinRail: DinRailCanvasRail;
  showTemporaryStatus: (message: string, timeoutMs?: number) => void;
}

export function useProjectExportActions({
  metadata,
  symbols,
  connections,
  dinRail,
  showTemporaryStatus,
}: UseProjectExportActionsParams) {
  const handleExportPdf = useCallback(async () => {
    try {
      const blob = await exportToPdf(metadata, symbols, dinRail, connections);
      showTemporaryStatus('Eksport PDF', 3000);

      if (Capacitor.isNativePlatform() && blob) {
        // Handle native sharing
        const fileName = `${metadata.projectNumber?.trim() || "zlecenie"}.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        // Note: Capacitor Share needs a file path or base64 usually,
        // but for now let's try the Web Share API which Capacitor polyfills.
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'Dokumentacja DINBoard',
            text: `Zlecenie: ${metadata.projectNumber || 'Bez numeru'}`,
          });
        }
      }
    } catch (e) {
      showTemporaryStatus(`Błąd: ${e instanceof Error ? e.message : 'Nieznany'}`, 5000);
    }
  }, [connections, dinRail, metadata, showTemporaryStatus, symbols]);

  const handleExportBom = useCallback(() => {
    const headers = [
      "Lp",
      "Oznaczenie",
      "Nazwa",
      "Typ",
      "Kind",
      "Grupa",
      "ObwódId",
      "ObwódNazwa",
      "Zabezpieczenie",
      "MocW",
      "Faza",
      "Lokalizacja",
    ];

    const sortedSymbols = symbols
      .slice()
      .sort((left, right) => left.y - right.y || left.x - right.x);

    const rows = sortedSymbols.map((symbol, index) => [
      index + 1,
      symbol.referenceDesignation,
      symbol.label,
      symbol.type,
      symbol.deviceKind,
      symbol.groupName,
      symbol.circuitId,
      symbol.circuitName,
      symbol.displayProtection || symbol.protectionType,
      symbol.powerW,
      symbol.phase,
      symbol.location,
    ]);

    const csvLines = [headers, ...rows].map((line) => line.map((cell) => escapeCsv(cell)).join(";"));
    const csvContent = csvLines.join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stem = metadata.projectNumber?.trim() || "zlecenie";
    link.href = url;
    link.download = `${stem}-bom.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showTemporaryStatus("Eksport BOM (CSV)", 3000);
  }, [metadata.projectNumber, showTemporaryStatus, symbols]);

  const handleExportPng = useCallback(async (withAnnotations: boolean) => {
    if (!dinRail.isVisible) {
      showTemporaryStatus("Brak szyny DIN do eksportu PNG", 3500);
      return;
    }

    try {
      const blob = await exportDinRailToBlobWithOptions(symbols, dinRail, {
        includeDesignations: true,
        includeGroupFrames: withAnnotations,
        scale: 3,
      });
      if (!blob) {
        showTemporaryStatus("Nie udało się wyeksportować PNG", 3500);
        return;
      }

      const link = document.createElement("a");
      const stem = metadata.projectNumber?.trim() || "zlecenie";
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = withAnnotations ? `${stem}-oznaczenia.png` : `${stem}-czysty.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showTemporaryStatus(
        withAnnotations ? "Eksport PNG (z oznaczeniami)" : "Eksport PNG (czysty)",
        3000,
      );
    } catch {
      showTemporaryStatus("Nie udało się wyeksportować PNG", 3500);
    }
  }, [dinRail, metadata.projectNumber, showTemporaryStatus, symbols]);

  const handleExportDinRailPngWithDescriptionsNoBrackets = useCallback(async () => {
    if (!dinRail.isVisible) {
      showTemporaryStatus("Brak szyny DIN do eksportu PNG", 3500);
      return;
    }

    try {
      const blob = await exportDinRailToBlobWithOptions(symbols, dinRail, {
        includeDesignations: true,
        includeGroupFrames: false,
        scale: 4,
      });
      if (!blob) {
        showTemporaryStatus("Nie udało się wyeksportować rozdzielnicy", 3500);
        return;
      }

      const link = document.createElement("a");
      const stem = metadata.projectNumber?.trim() || "zlecenie";
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${stem}-rozdzielnica-opis-hq.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showTemporaryStatus("Eksport PNG HQ (opis bez klamr)", 3000);
    } catch {
      showTemporaryStatus("Nie udało się wyeksportować PNG HQ", 3500);
    }
  }, [dinRail, metadata.projectNumber, showTemporaryStatus, symbols]);

  return {
    handleExportPdf,
    handleExportBom,
    handleExportPng,
    handleExportDinRailPngWithDescriptionsNoBrackets,
  };
}
