import { SheetType } from "../../lib/appHelpers";
import { AppIcon } from "../AppIcon";
import "./BottomNav.css";

interface BottomNavProps {
  activeSheet: SheetType;
  onChangeSheet: (sheet: SheetType) => void;
  onOpenMenu: () => void;
}

export function BottomNav({ activeSheet, onChangeSheet, onOpenMenu }: BottomNavProps) {
  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`bottom-nav-item ${activeSheet === "sheet1" ? "is-active" : ""}`}
        onClick={() => onChangeSheet("sheet1")}
      >
        <AppIcon name="grid" className="bottom-nav-icon" />
        <span>Rozdzielnica</span>
      </button>

      <button
        className={`bottom-nav-item ${activeSheet === "sheet2" ? "is-active" : ""}`}
        onClick={() => onChangeSheet("sheet2")}
      >
        <AppIcon name="fileTree" className="bottom-nav-icon" />
        <span>Schemat</span>
      </button>

      <button
        className={`bottom-nav-item ${activeSheet === "sheet3" ? "is-active" : ""}`}
        onClick={() => onChangeSheet("sheet3")}
      >
        <AppIcon name="list" className="bottom-nav-icon" />
        <span>Obwody</span>
      </button>

      <button
        className={`bottom-nav-item ${activeSheet === "sheet4" ? "is-active" : ""}`}
        onClick={() => onChangeSheet("sheet4")}
      >
        <AppIcon name="pdf" className="bottom-nav-icon" />
        <span>PDF</span>
      </button>

      <button className="bottom-nav-item" onClick={onOpenMenu}>
        <AppIcon name="menu" className="bottom-nav-icon" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
