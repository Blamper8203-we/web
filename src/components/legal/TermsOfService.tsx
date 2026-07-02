import { useTranslation } from "react-i18next";
import { TermsOfService_pl } from "./TermsOfService_pl";
import { TermsOfService_de } from "./TermsOfService_de";

export function TermsOfService() {
  const { i18n } = useTranslation();

  if (i18n.language === "de") {
    return <TermsOfService_de />;
  }

  return <TermsOfService_pl />;
}