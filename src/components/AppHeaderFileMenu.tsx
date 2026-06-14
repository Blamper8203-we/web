import { AppIcon } from "./AppIcon";

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
  return (
    <div
      className="flyout-menu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="flyout-section">Zlecenie</span>
      <button className="flyout-item" onClick={() => { onClose(); onNewProject(); }}>
        <AppIcon className="flyout-icon" name="file" />
        <span className="flyout-label">Nowe zlecenie</span>
        {hasUnsavedChanges && <span className="flyout-alert-dot" />}
        <span className="flyout-shortcut">Ctrl+N</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onOpenProject(); }}>
        <AppIcon className="flyout-icon" name="folderOpen" />
        <span className="flyout-label">Otwórz</span>
        <span className="flyout-shortcut">Ctrl+O</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onSaveProject(false); }}>
        <AppIcon className="flyout-icon" name="save" />
        <span className="flyout-label">Zapisz</span>
        <span className="flyout-shortcut">Ctrl+S</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onSaveProject(true); }}>
        <AppIcon className="flyout-icon" name="saveEdit" />
        <span className="flyout-label">Zapisz jako</span>
      </button>
      <span className="flyout-divider" />
      <span className="flyout-section">Eksport</span>
      <button className="flyout-item" onClick={() => { onClose(); onPrint(); }}>
        <AppIcon className="flyout-icon" name="print" />
        <span className="flyout-label">Drukuj</span>
        <span className="flyout-shortcut">Ctrl+P</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPdf(); }}>
        <AppIcon className="flyout-icon" name="pdf" />
        <span className="flyout-label">Eksport PDF</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPng(false); }}>
        <AppIcon className="flyout-icon" name="file" />
        <span className="flyout-label">Eksport PNG (czysty)</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportPng(true); }}>
        <AppIcon className="flyout-icon" name="fileEdit" />
        <span className="flyout-label">Eksport PNG (z oznaczeniami)</span>
      </button>
      <button
        className="flyout-item"
        onClick={() => { onClose(); onExportDinRailPngWithDescriptionsNoBrackets(); }}
      >
        <AppIcon className="flyout-icon" name="fileEdit" />
        <span className="flyout-label">Eksport PNG HQ (rozdzielnica: opis bez klamr)</span>
      </button>
      <button className="flyout-item" onClick={() => { onClose(); onExportBom(); }}>
        <AppIcon className="flyout-icon" name="list" />
        <span className="flyout-label">Eksport BOM (CSV)</span>
      </button>
      <span className="flyout-divider" />
      <button
        className="flyout-item danger"
        onClick={() =>
          showTemporaryStatus("Zamykanie aplikacji webowej nie jest dostępne w przeglądarce")
        }
      >
        <AppIcon className="flyout-icon" name="exit" />
        <span className="flyout-label">Wyjdź</span>
      </button>
    </div>
  );
}
