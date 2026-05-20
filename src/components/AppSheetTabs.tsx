import "./AppSheetTabs.css";
import type { SheetType } from "../lib/appHelpers";
import { AppIcon, type AppIconName } from "./AppIcon";

interface AppSheetTabsProps {
  activeSheet: SheetType;
  onChangeSheet: (sheet: SheetType) => void;
}

const SHEET_TABS: Array<{
  icon: AppIconName;
  label: string;
  sheet: SheetType;
}> = [
  { sheet: "sheet1", icon: "grid", label: "Rozdzielnica" },
  { sheet: "sheet2", icon: "fileTree", label: "Schemat obwodów" },
  { sheet: "sheet3", icon: "list", label: "Lista obwodów" },
  { sheet: "sheet4", icon: "pdf", label: "Podgląd PDF" },
];

export function AppSheetTabs({ activeSheet, onChangeSheet }: AppSheetTabsProps) {
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
    </div>
  );
}
