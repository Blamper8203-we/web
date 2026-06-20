

interface PageFooterProps {
  pageNumber: number;
  totalUiPages: number;
  noBorder?: boolean;
}

export function PageFooter({ pageNumber, totalUiPages, noBorder = false }: PageFooterProps) {
  return (
    <div className={`text-center text-[8px] text-gray-400 tracking-wide uppercase pt-4 ${noBorder ? 'mt-6' : 'mt-auto border-t border-gray-100'}`}>
      Strona {pageNumber} z {totalUiPages} • Dokument wygenerowany cyfrowo • Zgodny z normą PN-HD 60364
    </div>
  );
}
