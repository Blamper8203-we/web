import { AppIcon } from "./AppIcon";
import { useTranslation } from "react-i18next";

interface AppHeaderCenterToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  hasSelectedSymbol: boolean;
  workspaceZoomPercent: number;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onOpenDinRailGenerator: () => void;
  onOpenSvgImport: () => void;
}

/**
 * Środkowy toolbar z ikonami — Undo/Redo, Usuń, Generator DIN, Import SVG, Zoom.
 *
 * Uwaga: przyciski Zoom (przybliż/oddal/dopasuj) są tu **wizualnie** ale
 * nie mają onClick — to placeholder dla przyszłej implementacji zoom controls.
 * Workspace zoom jest wyświetlany jako badge (workspaceZoomPercent%).
 */
export function AppHeaderCenterToolbar({
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  hasSelectedSymbol,
  workspaceZoomPercent,
  onUndo,
  onRedo,
  onDeleteSelected,
  onOpenDinRailGenerator,
  onOpenSvgImport,
}: AppHeaderCenterToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="toolbar-center">
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.undo", "Cofnij")}
        title={undoLabel ? `${t("app.appHeader.undoPrefix", "Cofnij:")} ${undoLabel}` : t("app.appHeader.undo", "Cofnij")}
        onClick={onUndo}
        disabled={!canUndo}
      >
        <AppIcon name="undo" size={14} />
      </button>
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.redo", "Ponów")}
        title={redoLabel ? `${t("app.appHeader.redoPrefix", "Ponów:")} ${redoLabel}` : t("app.appHeader.redo", "Ponów")}
        onClick={onRedo}
        disabled={!canRedo}
      >
        <AppIcon name="redo" size={14} />
      </button>
      <span className="toolbar-separator" />
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.deleteSelected", "Usuń zaznaczone")}
        title={t("app.appHeader.deleteSelected", "Usuń zaznaczone")}
        disabled={!hasSelectedSymbol}
        onClick={onDeleteSelected}
      >
        <AppIcon className="accent-red" name="delete" size={14} />
      </button>
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.dinRail", "Szyna DIN")}
        title={t("app.appHeader.dinRail", "Szyna DIN")}
        onClick={onOpenDinRailGenerator}
      >
        <AppIcon className="accent-blue" name="module" size={14} />
      </button>
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.importModules", "Import modułów")}
        title={t("app.appHeader.importModules", "Import modułów")}
        onClick={onOpenSvgImport}
      >
        <AppIcon name="import" size={14} />
      </button>
      <span className="toolbar-separator" />
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.zoomIn", "Przybliż")}
        title={t("app.appHeader.zoomIn", "Przybliż")}
      >
        <AppIcon name="zoomIn" size={14} />
      </button>
      <span className="toolbar-zoom-badge">{workspaceZoomPercent}%</span>
      <button
        type="button"
        className="toolbar-icon-btn"
        aria-label={t("app.appHeader.zoomOut", "Oddal")}
        title={t("app.appHeader.zoomOut", "Oddal")}
      >
        <AppIcon name="zoomOut" size={14} />
      </button>
      <button type="button" className="toolbar-icon-btn" aria-label={t("app.appHeader.zoomFit", "Dopasuj widok")} title={t("app.appHeader.zoomFit", "Dopasuj widok")}>
        <AppIcon className="accent-blue" name="zoomFit" size={14} />
      </button>
    </div>
  );
}

interface AppHeaderMobileDrawerProps {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  onClose: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: (asNew: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportPdf: () => void;
  onOpenDinRailGenerator: () => void;
  onOpenSvgImport: () => void;
  onOpenHelp: () => void;
  onOpenFeedback: () => void;
}

/**
 * Boczny drawer mobilny z sekcjami PROJEKT/EDYCJA/EKSPORT/INNE.
 * Obsługuje gest swipe-left (>50px) do zamknięcia — to natywny wzorzec mobilny.
 *
 * Wydzielone z AppHeader bo ma własne touch handlers (touchstart/touchmove)
 * i zupełnie inny layout niż desktop toolbar.
 */
export function AppHeaderMobileDrawer({
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onClose,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onUndo,
  onRedo,
  onExportPdf,
  onOpenDinRailGenerator,
  onOpenSvgImport,
  onOpenHelp,
  onOpenFeedback,
}: AppHeaderMobileDrawerProps) {
  const { t } = useTranslation();
  return (
    <div
      className="mobile-side-drawer-overlay"
      onClick={onClose}
    >
      <div
        className="mobile-side-drawer"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          (e.currentTarget as HTMLElement).dataset.swipeStartX = String(touch.clientX);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          const startX = Number((e.currentTarget as HTMLElement).dataset.swipeStartX || 0);
          const deltaX = touch.clientX - startX;
          // Przeciągnięcie w lewo > 50px zamyka drawer
          if (deltaX < -50) {
            onClose();
          }
        }}
      >
        <div className="mobile-side-drawer-header">
          <img src="/favicon-192.png" alt="Logo" width="32" height="32" />
          <strong>{t("auto.dinboard_809", "DinBoard")}</strong>
          <button className="drawer-close win-close-btn" onClick={onClose}>
            <AppIcon name="close" size={20} />
          </button>
        </div>

        <div className="mobile-side-drawer-content">
          <span className="drawer-section">{t("app.mobileDrawer.project", "PROJEKT")}</span>
          <button className="drawer-item" onClick={() => { onClose(); onNewProject(); }}>
            <AppIcon className="drawer-icon" name="file" />
            <span>{t("app.mobileDrawer.newProject", "Nowe zlecenie")}</span>
          </button>
          <button className="drawer-item" onClick={() => { onClose(); onOpenProject(); }}>
            <AppIcon className="drawer-icon" name="folderOpen" />
            <span>{t("app.mobileDrawer.openProject", "Otwórz projekt")}</span>
          </button>
          <button className="drawer-item" onClick={() => { onClose(); onSaveProject(false); }}>
            <AppIcon className="drawer-icon" name="save" />
            <span>{t("app.mobileDrawer.saveChanges", "Zapisz zmiany")}</span>
          </button>

          <span className="drawer-divider" />
          <span className="drawer-section">{t("app.mobileDrawer.edit", "EDYCJA")}</span>
          <button
            className="drawer-item"
            disabled={!canUndo}
            style={{ opacity: canUndo ? 1 : 0.4 }}
            onClick={() => { onClose(); onUndo(); }}
          >
            <AppIcon className="drawer-icon" name="undo" />
            <span>{undoLabel ? `${t("app.appHeader.undoPrefix", "Cofnij:")} ${undoLabel}` : t("app.appHeader.undo", "Cofnij")}</span>
          </button>
          <button
            className="drawer-item"
            disabled={!canRedo}
            style={{ opacity: canRedo ? 1 : 0.4 }}
            onClick={() => { onClose(); onRedo(); }}
          >
            <AppIcon className="drawer-icon" name="redo" />
            <span>{redoLabel ? `${t("app.appHeader.redoPrefix", "Ponów:")} ${redoLabel}` : t("app.appHeader.redo", "Ponów")}</span>
          </button>

          <span className="drawer-divider" />
          <span className="drawer-section">{t("app.mobileDrawer.exportTools", "EKSPORT I NARZĘDZIA")}</span>
          <button className="drawer-item" onClick={() => { onClose(); onExportPdf(); }}>
            <AppIcon className="drawer-icon" name="pdf" />
            <span>{t("app.mobileDrawer.exportPdf", "Eksportuj PDF")}</span>
          </button>
          <button className="drawer-item" onClick={() => { onClose(); onOpenDinRailGenerator(); }}>
            <AppIcon className="drawer-icon accent-blue" name="module" />
            <span>{t("app.mobileDrawer.dinRailGenerator", "Generator Szyny DIN")}</span>
          </button>
          <button className="drawer-item" onClick={() => { onClose(); onOpenSvgImport(); }}>
            <AppIcon className="drawer-icon" name="import" />
            <span>{t("app.mobileDrawer.importSvg", "Import modułów SVG")}</span>
          </button>

          <span className="drawer-divider" />
          <span className="drawer-section">{t("app.mobileDrawer.other", "INNE")}</span>
          <button className="drawer-item" onClick={() => { onClose(); onOpenHelp(); }}>
            <AppIcon className="drawer-icon" name="help" />
            <span>{t("app.mobileDrawer.help", "Pomoc i instrukcja")}</span>
          </button>
          <button className="drawer-item" onClick={() => { onClose(); onOpenFeedback(); }}>
            <AppIcon className="drawer-icon" name="feedback" />
            <span>{t("app.mobileDrawer.feedback", "Zgłoś pomysł / Błąd")}</span>
          </button>
          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noreferrer"
            className="drawer-item toolbar-menu-btn--donate"
            style={{ marginTop: 8 }}
          >
            <AppIcon className="drawer-icon" name="coffee" />
            <span>{t("app.mobileDrawer.buyCoffee", "Postaw kawę")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
