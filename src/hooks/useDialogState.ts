import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

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
  const [unsavedChangesActionType, setUnsavedChangesActionType] = useState<"new" | "open" | null>(null);

  // Ref do przechowywania aktualnego stanu dla backButton handlera
  const stateRef = useRef({
    isRcdManagerOpen,
    isHelpOpen,
    unsavedChangesActionType,
    svgImportDialogOpen,
    importedModulesManagerOpen,
  });

  useEffect(() => {
    stateRef.current = {
      isRcdManagerOpen,
      isHelpOpen,
      unsavedChangesActionType,
      svgImportDialogOpen,
      importedModulesManagerOpen,
    };
  }, [
    isRcdManagerOpen,
    isHelpOpen,
    unsavedChangesActionType,
    svgImportDialogOpen,
    importedModulesManagerOpen,
  ]);

  // Obsługa przycisku Back w Capacitor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

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
    setUnsavedChangesActionType(null);
  }, []);

  return useMemo(
    () => ({
      // State
      isRcdManagerOpen,
      isHelpOpen,
      svgImportDialogOpen,
      importedModulesManagerOpen,
      unsavedChangesActionType,

      // Setters
      setIsRcdManagerOpen,
      setIsHelpOpen,
      setSvgImportDialogOpen,
      setImportedModulesManagerOpen,
      setUnsavedChangesActionType,

      // Handlers
      closeAllDialogs,
    }),
    [
      isRcdManagerOpen,
      isHelpOpen,
      svgImportDialogOpen,
      importedModulesManagerOpen,
      unsavedChangesActionType,
      closeAllDialogs,
    ],
  );
}
