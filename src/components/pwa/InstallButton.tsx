import { useTranslation } from "react-i18next";
import "./InstallButton.css";

export type InstallButtonVariant = "header" | "hero";

interface InstallButtonProps {
  variant: InstallButtonVariant;
  onClick: () => void;
  /** Gdy true — przycisk pokazuje stan "instalowanie" (podczas trwania prompta). */
  installing?: boolean;
  /** aria-label fallback gdy tekst jest ukryty (mobile). */
  ariaLabel?: string;
}

/**
 * Przycisk instalacji PWA. Dwa warianty wizualne dopasowane do landing page.
 *
 * Używa ikony `download` z lucide przez `<i data-lucide>` — landing wczytuje
 * lucide z CDN i wywołuje `createIcons()` po mountcie (patrz useLandingAssets).
 * Po każdym re-renderze z tekstem instalowania, lucide musi prze-renderować
 * ikonę — zajmuje się tym hook `useLandingAssets` (re-create na mutation observer).
 *
 * Niezależny od mechanizmu instalacji: ten sam przycisk służy do wywołania
 * `beforeinstallprompt.prompt()` (Android/desktop) lub otwarcia overlay iOS.
 */
export function InstallButton({
  variant,
  onClick,
  installing = false,
  ariaLabel,
}: InstallButtonProps) {
  const { t } = useTranslation();

  const label = installing
    ? t("landing.install.installing", "Instalowanie…")
    : t("landing.install.button", "Zainstaluj aplikację");

  const shortLabel = installing
    ? t("landing.install.installingShort", "Instalowanie…")
    : t("landing.install.buttonShort", "Zainstaluj");

  return (
    <button
      type="button"
      className="pwa-install-btn"
      data-variant={variant}
      data-installing={installing ? "true" : "false"}
      onClick={onClick}
      disabled={installing}
      aria-label={ariaLabel ?? label}
    >
      <i
        data-lucide={installing ? "loader" : "download"}
        className="icon"
        aria-hidden="true"
      />
      <span className="pwa-install-btn-text">
        {variant === "header" ? shortLabel : label}
      </span>
    </button>
  );
}
