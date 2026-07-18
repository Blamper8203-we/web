import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./InstallButton.css";

interface IosInstallOverlayProps {
  onClose: () => void;
}

/**
 * Modal z instrukcją instalacji na iOS — krok po kroku.
 *
 * Dlaczego osobny modal zamiast tekstu: iOS Safari NIE wspiera
 * `beforeinstallprompt`, więc nie można wywołać natywnego prompta. Jedyne
 * co możemy zrobić — pokazać użytkownikowi dokładną ścieżkę:
 *   ① przycisk Share (kwadrat ze strzałką w górę)
 *   ② „Dodaj do ekranu początkowego"
 *
 * Wzorzec close'a: Esc + click na backdrop (zewnętrzny), inner stopPropagation.
 * Spójne z HelpDialog / FeedbackModal w app, ale używa własnych klas CSS,
 * bo landing nie ma dostępu do app CSS variables.
 */
export function IosInstallOverlay({ onClose }: IosInstallOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    // WHY: blokujemy scroll tła pod overlay — inaczej na iOS kart by "płynęła".
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="pwa-ios-overlay-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="pwa-ios-overlay-card"
        role="dialog"
        aria-modal="true"
        aria-label={t(
          "landing.install.iosTitle",
          "Instalacja aplikacji na iPhone"
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pwa-ios-overlay-close"
          aria-label={t("landing.install.close", "Zamknij")}
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pwa-ios-overlay-header">
          <div className="pwa-ios-overlay-icon-wrapper">
            <img src="/favicon-192.png" alt="" />
          </div>
          <div>
            <h2 className="pwa-ios-overlay-title">
              {t(
                "landing.install.iosTitle",
                "Zainstaluj DINBoard na iPhonie"
              )}
            </h2>
            <p className="pwa-ios-overlay-subtitle">
              {t(
                "landing.install.iosSubtitle",
                "Dwie tapnięcia — aplikacja ląduje na ekranie głównym"
              )}
            </p>
          </div>
        </div>

        <div className="pwa-ios-overlay-step">
          <div className="pwa-ios-overlay-step-number">1</div>
          <div className="pwa-ios-overlay-step-content">
            <h3 className="pwa-ios-overlay-step-title">
              {t(
                "landing.install.iosStep1Title",
                "Otwórz menu udostępniania"
              )}
            </h3>
            <p className="pwa-ios-overlay-step-desc">
              {t(
                "landing.install.iosStep1Desc",
                "Dotknij ikony udostępniania na dole paska Safari"
              )}{" "}
              <span className="pwa-ios-overlay-step-icon" aria-hidden="true">
                {/* Ikona Share iOS — kwadrat ze strzałką w górę */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ verticalAlign: "-3px", display: "inline" }}
                >
                  <path d="M12 3v12" />
                  <path d="m8 7 4-4 4 4" />
                  <path d="M20 21H4V10h4" />
                  <path d="M16 10h4v11" />
                </svg>
              </span>
            </p>
          </div>
        </div>

        <div className="pwa-ios-overlay-step">
          <div className="pwa-ios-overlay-step-number">2</div>
          <div className="pwa-ios-overlay-step-content">
            <h3 className="pwa-ios-overlay-step-title">
              {t(
                "landing.install.iosStep2Title",
                `Wybierz „Dodaj do ekranu początkowego”`
              )}
            </h3>
            <p className="pwa-ios-overlay-step-desc">
              {t(
                "landing.install.iosStep2Desc",
                `Przewiń listę w dół i dotknij opcji „Dodaj do ekranu początkowego”. Potwierdź — ikona DINBoard pojawi się obok innych aplikacji.`
              )}
            </p>
          </div>
        </div>

        <div className="pwa-ios-overlay-actions">
          <button
            type="button"
            className="pwa-ios-overlay-done-btn"
            onClick={onClose}
            autoFocus
          >
            {t("landing.install.iosDone", "Rozumiem")}
          </button>
        </div>
      </div>
    </div>
  );
}
