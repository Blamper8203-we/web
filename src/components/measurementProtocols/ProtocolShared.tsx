import { useTranslation } from "react-i18next";

interface PageFooterProps {
  pageNumber: number;
  totalUiPages: number;
  noBorder?: boolean;
}

export function PageFooter({ pageNumber, totalUiPages, noBorder = false }: PageFooterProps) {
  const { t } = useTranslation();
  // The "noBorder" variant is used on pages where the signature row already
  // provides the visual separator (title page, unified table). Default is a
  // hairline rule above for clean separation on table-heavy pages.
  return (
    <div
      className={noBorder ? "pd-page-footer" : "pd-page-footer"}
      style={noBorder ? { position: "absolute", borderTop: "none", paddingTop: 0 } : undefined}
    >
      <span className="pd-page-footer-text">{t("pdf.footer.normLabel", "PN-HD 60364 · DINBOARD")}</span>
      <span className="pd-page-footer-text">
        {t("pdf.footer.pageInfo", { pageNumber, totalPages: totalUiPages, defaultValue: `${pageNumber} / ${totalUiPages}` })}
      </span>
    </div>
  );
}