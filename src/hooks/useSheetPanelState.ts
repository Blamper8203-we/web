import { useState, useCallback } from "react";
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
  const [showRightPanel, setShowRightPanel] = useState(() => window.innerWidth > 768);
  const [showLeftPanel, setShowLeftPanel] = useState(() => window.innerWidth > 768);
  const [workspaceZoomPercent, setWorkspaceZoomPercent] = useState(100);
  const [showDinRailGroups, setShowDinRailGroups] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem("dinboard.show_din_rail_groups");
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

  return {
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
  };
}
