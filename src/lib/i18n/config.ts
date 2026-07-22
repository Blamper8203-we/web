import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationPL from "../../locales/pl/translation.json";

// WHY: DINBoard jest pl-only by design (decyzja 2026-07-22, patrz PLAN-ULEPSZEN.md
// P1-2). Jedyne źródło tłumaczeń to locales/pl/translation.json. Porzucone
// artefakty niemieckiego (missing-keys-de.json, raporty i18n) zostały odpięte od
// repo. `supportedLngs`/`fallbackLng` poniżej wymuszają "pl" niezależnie od
// wykrytego języka przeglądarki. Wprowadzenie kolejnego języka = osobny projekt
// (P3-4): migracja kluczy auto.xxx_NNN na semantyczne + realny pipeline tłumaczeń.
export const resources = {
  pl: {
    translation: translationPL,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pl",
    supportedLngs: ["pl"],
    interpolation: {
      escapeValue: false, // React chroni przed XSS automatycznie
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
