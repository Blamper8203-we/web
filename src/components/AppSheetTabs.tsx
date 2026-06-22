import "./AppSheetTabs.css";
import type { SheetType } from "../lib/appHelpers";
import { AppIcon, type AppIconName } from "./AppIcon";

interface AppSheetTabsProps {
  activeSheet: SheetType;
  onChangeSheet: (sheet: SheetType) => void;
  showLeftPanel?: boolean;
  onOpenLeftPanel?: () => void;
}

const SHEET_TABS: Array<{
  icon: AppIconName;
  label: string;
  sheet: SheetType;
}> = [
  { sheet: "sheet1", icon: "grid", label: "Rozdzielnica" },
  { sheet: "sheet1_connections", icon: "busbar", label: "Połączenia" },
  { sheet: "sheet2", icon: "fileTree", label: "Schemat obwodów" },
  { sheet: "sheet3", icon: "list", label: "Lista obwodów" },
  { sheet: "sheet4", icon: "pdf", label: "Dokumentacja PDF" },
];

export function AppSheetTabs({ activeSheet, onChangeSheet, showLeftPanel, onOpenLeftPanel }: AppSheetTabsProps) {
  return (
    <div className="sheet-tabs-bar">
      {SHEET_TABS.map((tab) => (
        <button
          className={`sheet-tab ${activeSheet === tab.sheet ? "active" : ""}`}
          key={tab.sheet}
          type="button"
          onClick={() => onChangeSheet(tab.sheet)}
        >
          <AppIcon className="sheet-tab-icon" name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
      {!showLeftPanel && onOpenLeftPanel && (
        <button 
          className="sheet-tab mobile-only-tab" 
          type="button" 
          onClick={onOpenLeftPanel} 
          style={{ marginLeft: "auto", color: "var(--accent-primary)", borderColor: "var(--accent-primary)", padding: "10px 12px" }}
        >
          <AppIcon className="sheet-tab-icon" name="plus" />
          <span>Dodaj Moduł</span>
        </button>
      )}
    </div>
  );
}
