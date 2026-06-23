import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { safeGetItemSync } from "../lib/storageService";
import type { SheetType, RightTab } from "../lib/appHelpers";

/**
 * Stan UI paneli i arkuszy – wydzielony z App.tsx, żeby odchudzić główny komponent.
 *
 * Obejmuje:
 * - aktywny arkusz (sheet1..sheet4)
 * - widoczność lewego i prawego panelu
 * - aktywną zakładkę prawego panelu
 * - zoom obszaru roboczego
 * - widoczność grup na szynie DIN
 */
export function useSheetPanelState() {
  const [activeSheet, setActiveSheet] = useState<SheetType>("sheet1");
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("balance");
  const [showRightPanel, setShowRightPanel] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const [showLeftPanel, setShowLeftPanel] = useState(() => typeof window !== "undefined" ? window.innerWidth > 768 : true);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWideRef = useRef(typeof window !== "undefined" ? window.innerWidth > 768 : true);

  // Automatycznie pokazuj/ukrywaj panele przy zmianie rozmiaru okna (z debounce)
  // Działa tylko przy przekroczeniu progu 768px – nie nadpisuje ręcznych przełączeń
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = setTimeout(() => {
        const isWide = window.innerWidth > 768;
        const wasWide = lastWideRef.current;
        lastWideRef.current = isWide;

        // Only act when crossing the 768px boundary
        if (isWide === wasWide) {
          return;
        }

        if (isWide) {
          setShowLeftPanel(true);
          setShowRightPanel(true);
        } else {
          setShowLeftPanel(false);
          setShowRightPanel(false);
        }

        resizeTimerRef.current = null;
      }, 200);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);
  const [workspaceZoomPercent, setWorkspaceZoomPercent] = useState(100);
  const [showDinRailGroups, setShowDinRailGroups] = useState<boolean>(() => {
    try {
      const raw = safeGetItemSync("dinboard.show_din_rail_groups");
      if (!raw) {
        return true;
      }

      const parsed = JSON.parse(raw);
      return typeof parsed === "boolean" ? parsed : true;
    } catch {
      return true;
    }
  });

  const handleToggleDinRailGroups = useCallback(() => {
    setShowDinRailGroups((previous) => !previous);
  }, []);

  const openLeftPanelWithTab = useCallback(
    (_tabName: string, sheetOverride?: SheetType) => {
      setShowLeftPanel(true);

      if (sheetOverride && activeSheet !== sheetOverride) {
        setActiveSheet(sheetOverride);
      }
    },
    [activeSheet],
  );

  return useMemo(
    () => ({
      // State
      activeSheet,
      activeRightTab,
      showRightPanel,
      showLeftPanel,
      workspaceZoomPercent,
      showDinRailGroups,

      // Setters
      setActiveSheet,
      setActiveRightTab,
      setShowRightPanel,
      setShowLeftPanel,
      setWorkspaceZoomPercent,
      setShowDinRailGroups,

      // Handlers
      handleToggleDinRailGroups,
      openLeftPanelWithTab,
    }),
    [
      activeSheet,
      activeRightTab,
      showRightPanel,
      showLeftPanel,
      workspaceZoomPercent,
      showDinRailGroups,
      setActiveSheet,
      setActiveRightTab,
      setShowRightPanel,
      setShowLeftPanel,
      setWorkspaceZoomPercent,
      setShowDinRailGroups,
      handleToggleDinRailGroups,
      openLeftPanelWithTab,
    ],
  );
}
