import { useState, useCallback, useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";

/**
 * Stan wszystkich dialogów i modalnych nakładek – wydzielony z App.tsx.
 *
 * Obejmuje:
 * - RCD Manager
 * - Help
 * - SVG Import
 * - Imported Modules Manager
 * - Palette context menu
 * - Palette removal confirm
 * - Unsaved changes dialog
 * - Obsługa przycisku Back w Capacitor
 */
export function useDialogState() {
  const [isRcdManagerOpen, setIsRcdManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [svgImportDialogOpen, setSvgImportDialogOpen] = useState(false);
  const [importedModulesManagerOpen, setImportedModulesManagerOpen] = useState(false);
  const [paletteContextMenu, setPaletteContextMenu] = useState<{ x: number; y: number; groupTitle: string } | null>(null);
  const [pendingPaletteRemoval, setPendingPaletteRemoval] = useState<{ groupTitle: string; templateId: string } | null>(null);
  const [unsavedChangesActionType, setUnsavedChangesActionType] = useState<"new" | "open" | null>(null);

  // Ref do przechowywania aktualnego stanu dla backButton handlera
  const stateRef = useRef({
    isRcdManagerOpen,
    isHelpOpen,
    unsavedChangesActionType,
    svgImportDialogOpen,
    importedModulesManagerOpen,
    paletteContextMenu,
    pendingPaletteRemoval,
  });

  useEffect(() => {
    stateRef.current = {
      isRcdManagerOpen,
      isHelpOpen,
      unsavedChangesActionType,
      svgImportDialogOpen,
      importedModulesManagerOpen,
      paletteContextMenu,
      pendingPaletteRemoval,
    };
  }, [
    isRcdManagerOpen,
    isHelpOpen,
    unsavedChangesActionType,
    svgImportDialogOpen,
    importedModulesManagerOpen,
    paletteContextMenu,
    pendingPaletteRemoval,
  ]);

  // Obsługa przycisku Back w Capacitor
  useEffect(() => {
    const backListener = CapApp.addListener("backButton", () => {
      const s = stateRef.current;
      if (s.isRcdManagerOpen) {
        setIsRcdManagerOpen(false);
      } else if (s.isHelpOpen) {
        setIsHelpOpen(false);
      } else if (s.unsavedChangesActionType) {
        setUnsavedChangesActionType(null);
      } else if (s.svgImportDialogOpen) {
        setSvgImportDialogOpen(false);
      } else if (s.importedModulesManagerOpen) {
        setImportedModulesManagerOpen(false);
      } else if (s.paletteContextMenu) {
        setPaletteContextMenu(null);
      } else if (s.pendingPaletteRemoval) {
        setPendingPaletteRemoval(null);
      }
    });

    return () => {
      backListener.then((l) => l.remove());
    };
  }, []);

  const closeAllDialogs = useCallback(() => {
    setIsRcdManagerOpen(false);
    setIsHelpOpen(false);
    setSvgImportDialogOpen(false);
    setImportedModulesManagerOpen(false);
    setPaletteContextMenu(null);
    setPendingPaletteRemoval(null);
    setUnsavedChangesActionType(null);
  }, []);

  return {
    // State
    isRcdManagerOpen,
    isHelpOpen,
    svgImportDialogOpen,
    importedModulesManagerOpen,
    paletteContextMenu,
    pendingPaletteRemoval,
    unsavedChangesActionType,

    // Setters
    setIsRcdManagerOpen,
    setIsHelpOpen,
    setSvgImportDialogOpen,
    setImportedModulesManagerOpen,
    setPaletteContextMenu,
    setPendingPaletteRemoval,
    setUnsavedChangesActionType,

    // Handlers
    closeAllDialogs,
  };
}
