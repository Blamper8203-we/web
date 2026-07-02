import { useTranslation } from "react-i18next";
import { PrivacyPolicy_pl } from "./PrivacyPolicy_pl";
import { PrivacyPolicy_de } from "./PrivacyPolicy_de";

export function PrivacyPolicy() {
  const { i18n } = useTranslation();

  if (i18n.language === "de") {
    return <PrivacyPolicy_de />;
  }

  return <PrivacyPolicy_pl />;
}