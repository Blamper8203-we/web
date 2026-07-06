import "./AppSheetTabs.css";
import { Capacitor } from "@capacitor/core";
import type { SheetType } from "../lib/appHelpers";
import { AppIcon, type AppIconName } from "./AppIcon";

import { useTranslation } from "react-i18next";

interface AppSheetTabsProps {
  activeSheet: SheetType;
  onChangeSheet: (sheet: SheetType) => void;
  showLeftPanel?: boolean;
  onOpenLeftPanel?: () => void;
}
export function AppSheetTabs({ activeSheet, onChangeSheet, showLeftPanel, onOpenLeftPanel }: AppSheetTabsProps) {
  const { t } = useTranslation();

  const sheetTabs: Array<{
    icon: AppIconName;
    label: string;
    sheet: SheetType;
  }> = [
    { sheet: "sheet1", icon: "grid", label: t("app.viewMenu.sheet1", "Rozdzielnica") },
    { sheet: "sheet1_connections", icon: "busbar", label: t("app.viewMenu.sheet1_connections", "Połączenia") },
    { sheet: "sheet2", icon: "fileTree", label: t("app.viewMenu.sheet2", "Schemat obwodów") },
    { sheet: "sheet5_smarthome", icon: "smarthome", label: t("app.viewMenu.sheet5_smarthome", "Schemat Smart Home") },
    { sheet: "sheet3", icon: "list", label: t("app.viewMenu.sheet3", "Lista obwodów") },
    { sheet: "sheet4", icon: "pdf", label: t("app.viewMenu.sheet4", "Dokumentacja PDF") },
  ];

  const visibleTabs = sheetTabs.filter((tab) => {
    // Ukrywamy zakładkę "Połączenia", jeśli aplikacja jest odpalona natywnie (np. na Androidzie)
    if (tab.sheet === "sheet1_connections" && Capacitor.isNativePlatform()) {
      return false;
    }
    return true;
  });

  return (
    <div className="sheet-tabs-bar">
      {visibleTabs.map((tab) => (
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
          className="sheet-tab sheet-tab--add-module"
          type="button"
          onClick={onOpenLeftPanel}
        >
          <AppIcon className="sheet-tab-icon" name="plus" />
          <span>{t("app.toolsMenu.addModule", "Dodaj Moduł")}</span>
        </button>
      )}
    </div>
  );
}
