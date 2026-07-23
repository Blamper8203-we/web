import { useTranslation } from "react-i18next";
import "./InstallButton.css";
import { AppIcon } from "../AppIcon";

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
 * Ikona (`download` / `loader` podczas instalacji) renderowana inline przez
 * komponent `AppIcon` — bez zależności od CDN lucide. Reaguje na `installing`
 * bez żadnego re-createIcons (React re-render wymienia SVG).
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
      <AppIcon
        name={installing ? "loader" : "download"}
        className="icon"
      />
      <span className="pwa-install-btn-text">
        {variant === "header" ? shortLabel : label}
      </span>
    </button>
  );
}
