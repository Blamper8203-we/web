import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationPL from "../../locales/pl/translation.json";
import translationDE from "../../locales/de/translation.json";

export const resources = {
  pl: {
    translation: translationPL,
  },
  de: {
    translation: translationDE,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pl",
    supportedLngs: ["pl", "de"],
    interpolation: {
      escapeValue: false, // React chroni przed XSS automatycznie
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
