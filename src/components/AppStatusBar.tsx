import { AppIcon } from "./AppIcon";
import "./AppStatusBar.css";

export interface AppStatusBarProps {
  projectFileName: string;
  hasUnsavedChanges: boolean;
  saveStatus: string;
  workspaceZoomPercent: number;
  totalPower: number;
  groupCount: number;
  symbolCount: number;
  errorCount: number;
  warningCount: number;
}

export function AppStatusBar({
  projectFileName,
  hasUnsavedChanges,
  saveStatus,
  workspaceZoomPercent,
  totalPower,
  groupCount,
  symbolCount,
  errorCount,
  warningCount,
}: AppStatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="statusbar-row">
        <div className="statusbar-left">
          <span className="statusbar-item statusbar-project" title={projectFileName}>
            <AppIcon className="statusbar-icon statusbar-icon-muted" name="file" size={12} />
            <strong>{projectFileName}</strong>
            {hasUnsavedChanges && <span className="statusbar-unsaved-dot" title="Niezapisane zmiany" />}
          </span>
          <span className="statusbar-divider" />
          <span className="statusbar-item statusbar-ok">
            <AppIcon className="statusbar-icon" name="check" size={12} />
            <span>{saveStatus || "Gotowy"}</span>
          </span>
        </div>
        <div className="statusbar-right">
          <span className="statusbar-item" title="Poziom zbliżenia">
            <AppIcon className="statusbar-icon statusbar-icon-accent" name="zoomIn" size={12} />
            <strong>{workspaceZoomPercent}%</strong>
          </span>
          <span className="statusbar-item" title="Moc całkowita">
            <AppIcon className="statusbar-icon statusbar-icon-warn" name="power" size={12} />
            {(totalPower / 1000).toFixed(1)} kW
          </span>
          <span className="statusbar-item" title="Liczba grup">
            <AppIcon className="statusbar-icon statusbar-icon-accent" name="group" size={12} />
            Grupy: {groupCount}
          </span>
          <span className="statusbar-item" title="Liczba modułów">
            <AppIcon className="statusbar-icon statusbar-icon-muted" name="module" size={12} />
            Moduły: {symbolCount}
          </span>
          {(errorCount > 0 || warningCount > 0) && <span className="statusbar-divider" />}
          {errorCount > 0 && (
            <span className="statusbar-item statusbar-alert danger">
              <AppIcon className="statusbar-icon" name="validation" size={12} />
              {errorCount} błędów
            </span>
          )}
          {warningCount > 0 && (
            <span className="statusbar-item statusbar-alert warning">
              <AppIcon className="statusbar-icon" name="validation" size={12} />
              {warningCount} ostrzeżeń
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
