// WHY: register jest-dom custom matchers (toBeInTheDocument, toHaveClass, ...)
// so React component tests can assert on rendered DOM nodes. Setup is isolated
// to vitest — it does not affect the production build or Vite dev server.
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import translationPL from "./src/locales/pl/translation.json";

const mockT = (key: string, optionsOrString?: any) => {
  // If key belongs to 'landing', search from root, else from 'app'
  let current: any = translationPL.app;
  if (key.startsWith("landing.")) {
    current = translationPL;
  }
  
  // W i18next często pomija się 'app.' na początku, bo 'app' to nasz podział wewn. pliku
  // Zależnie od tego, spróbujmy ścieżki
  const path = key.replace(/^app\./, "").split('.');
  
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = current[segment];
    } else {
      current = undefined;
      break;
    }
  }
  
  if (typeof current === "string") {
    // Prosta obsługa interpolacji {{zmienna}} z options
    if (optionsOrString && typeof optionsOrString === "object") {
      let interpolated = current;
      for (const [k, v] of Object.entries(optionsOrString)) {
        interpolated = interpolated.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      }
      return interpolated;
    }
    return current;
  }
  
  if (typeof optionsOrString === "string") return optionsOrString;
  if (optionsOrString && typeof optionsOrString === "object" && optionsOrString.defaultValue) return optionsOrString.defaultValue;
  
  return key;
};

vi.mock("i18next", () => ({
  t: mockT,
  default: {
    t: mockT,
    use: () => ({ init: () => {} }),
    language: "pl",
    changeLanguage: async () => {},
    on: () => {},
    off: () => {}
  }
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: "pl", changeLanguage: async () => {} }
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
  Trans: ({ i18nKey, children }: any) => children || i18nKey
}));