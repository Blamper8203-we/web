import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../AppIcon";
import { getPdfDocumentationTabs, getProtocolLabel, type PdfDocumentationPreviewTab } from "../../lib/pdfDocumentation";
import "./PdfNavigatorFab.css";

interface PdfNavigatorFabProps {
  activeTab: PdfDocumentationPreviewTab;
  onSelect: (tab: PdfDocumentationPreviewTab) => void;
}

/**
 * FAB + bottom sheet z listą protokołów PDF — na mobile, gdy lewy panel
 * edytora jest ukryty (czyli nie ma widocznej nawigacji między protokołami).
 *
 * Reużywa klasy `mobile-fab` z FloatingAddButton.css dla spójnego wyglądu
 * (pozycja, rozmiar, animacja). PDF sheet nie renderuje FloatingAddButton
 * (bo nie dodaje modułów), więc nie ma konfliktu na ekranie.
 */
export function PdfNavigatorFab({ activeTab, onSelect }: PdfNavigatorFabProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const tabs = getPdfDocumentationTabs();

  return (
    <>
      <button
        type="button"
        className="mobile-fab"
        aria-label={t("app.pdf.nav.fab", "Nawigacja między protokołami PDF")}
        onClick={() => setIsOpen(true)}
      >
        <AppIcon name="list" size={24} />
      </button>

      {isOpen && (
        <>
          <div className="pdf-nav-backdrop" onClick={() => setIsOpen(false)} />
          <div className="pdf-nav-sheet" role="dialog" aria-label={t("app.pdf.nav.sheet", "Protokoły PDF")}>
            <div className="pdf-nav-sheet-header">
              <strong>{t("app.pdf.nav.title", "Protokoły PDF")}</strong>
              <button
                type="button"
                className="pdf-nav-sheet-close"
                aria-label={t("app.pdf.nav.close", "Zamknij")}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <ul className="pdf-nav-sheet-list">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={`pdf-nav-sheet-item ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => {
                      onSelect(tab.id);
                      setIsOpen(false);
                    }}
                  >
                    {getProtocolLabel(tab.id)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
