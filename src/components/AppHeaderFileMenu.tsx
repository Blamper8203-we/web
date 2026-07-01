import { AppIcon } from "./AppIcon";
import { useTranslation } from "react-i18next";

interface AppHeaderFileMenuProps {
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: (asNew: boolean) => void;
  onExportPdf: () => void;
  onExportPng: (withAnnotations: boolean) => void;
  onExportDinRailPngWithDescriptionsNoBrackets: () => void;
  onExportBom: () => void;
  onPrint: () => void;
  showTemporaryStatus: (message: string) => void;
}

/**
 * Dropdown menu "Plik" — Nowe/Otwórz/Zapisz/Eksport (PDF/PNG/BOM)/Drukuj.
 *
 * Wydzielone z AppHeader.tsx. Komponent jest bezstanowy (zakłada że parent
 * zarządza otwarciem/zamknięciem przez wrapper <div>). Kliknięcia wewnątrz
 * menu NIE zamykają go (stopPropagation) — parent zamyka przez onClose.
 */
export function AppHeaderFileMenu({
  hasUnsavedChanges,
  onClose,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPdf,
  onExportPng,
  onExportDinRailPngWithDescriptionsNoBrackets,
  onExportBom,
  onPrint,
  showTemporaryStatus,
}: AppHeaderFileMenuProps) {
  const { t } = useTranslation();
  return (
    <div
      className="flyout-menu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">{t("app.fileMenu.section")}</span>
      <button className="flyout-item" onClick={() => { onClose(); onNewProject(); }}>
        <AppIcon className="flyout-icon" name="file" />
        <span className="flyout-label">{t("app.fileMenu.new")}</span>
        {hasUnsavedChanges && <span className="flyout-alert-dot" />}
        <span className="flyout-shortcut">Ctrl+N</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onOpenProject(); }}>
        <AppIcon className="flyout-icon" name="folderOpen" />
        <span className="flyout-label">{t("app.fileMenu.open")}</span>
        <span className="flyout-shortcut">Ctrl+O</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onSaveProject(false); }}>
        <AppIcon className="flyout-icon" name="save" />
        <span className="flyout-label">{t("app.fileMenu.save")}</span>
        <span className="flyout-shortcut">Ctrl+S</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onSaveProject(true); }}>
        <AppIcon className="flyout-icon" name="saveEdit" />
        <span className="flyout-label">{t("app.fileMenu.saveAs")}</span>
      </button>
      <span className="flyout-divider" />
      <span className="flyout-section">{t("app.fileMenu.exportSection")}</span>
      <button className="flyout-item" onClick={() => { onClose(); onPrint(); }}>
        <AppIcon className="flyout-icon" name="print" />
        <span className="flyout-label">{t("app.fileMenu.print")}</span>
        <span className="flyout-shortcut">Ctrl+P</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPdf(); }}>
        <AppIcon className="flyout-icon" name="pdf" />
        <span className="flyout-label">{t("app.fileMenu.exportPdf")}</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPng(false); }}>
        <AppIcon className="flyout-icon" name="file" />
        <span className="flyout-label">{t("app.fileMenu.exportPng")}</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPng(true); }}>
        <AppIcon className="flyout-icon" name="fileEdit" />
        <span className="flyout-label">{t("app.fileMenu.exportPngAnnotations")}</span>
      </button>
      <button
        className="flyout-item"
        onClick={() => { onClose(); onExportDinRailPngWithDescriptionsNoBrackets(); }}
      >
        <AppIcon className="flyout-icon" name="fileEdit" />
        <span className="flyout-label">{t("app.fileMenu.exportPngHq")}</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportBom(); }}>
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">{t("app.fileMenu.exportBom")}</span>
      </button>
      <span className="flyout-divider" />
      <button
        className="flyout-item danger"
        onClick={() =>
          showTemporaryStatus(t("app.fileMenu.exitMsg"))
        }
      >
        <AppIcon className="flyout-icon" name="exit" />
        <span className="flyout-label">{t("app.fileMenu.exit")}</span>
      </button>
    </div>
  );
}
